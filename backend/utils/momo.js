const crypto = require("crypto");
const https = require("https");

const DEFAULT_HOSTNAME = "test-payment.momo.vn";
const DEFAULT_PATH = "/v2/gateway/api/create";

function buildPublicUrl(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  return /^https?:\/\//i.test(normalizedValue)
    ? normalizedValue.replace(/\/+$/, "")
    : `https://${normalizedValue.replace(/\/+$/, "")}`;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required MoMo environment variable: ${name}`);
  }

  return value;
}

function getBackendPublicUrl() {
  return (
    process.env.SERVER_PUBLIC_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    buildPublicUrl(process.env.RAILWAY_PUBLIC_DOMAIN) ||
    `http://localhost:${process.env.PORT || 5000}`
  );
}

function getClientPublicUrl() {
  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_PUBLIC_URL ||
    "http://localhost:5173"
  );
}

function getMomoConfig() {
  return {
    hostname: process.env.MOMO_HOSTNAME || DEFAULT_HOSTNAME,
    path: process.env.MOMO_CREATE_PATH || DEFAULT_PATH,
    partnerCode: requireEnv("MOMO_PARTNER_CODE"),
    accessKey: requireEnv("MOMO_ACCESS_KEY"),
    secretKey: requireEnv("MOMO_SECRET_KEY"),
    requestType: process.env.MOMO_REQUEST_TYPE || "captureWallet",
    redirectUrl:
      process.env.MOMO_REDIRECT_URL ||
      `${getClientPublicUrl()}/thanh-toan/momo`,
    ipnUrl:
      process.env.MOMO_IPN_URL ||
      `${getBackendPublicUrl()}/api/shop/payments/momo/ipn`,
    partnerName: process.env.MOMO_PARTNER_NAME || "Tiem Do Trang Tri Noi That",
    storeId: process.env.MOMO_STORE_ID || "TiemDoTrangTriNoiThat",
    lang: process.env.MOMO_LANG || "vi"
  };
}

function createSignature(rawSignature, secretKey) {
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

function buildCreatePaymentSignature(payload, accessKey) {
  return [
    `accessKey=${accessKey}`,
    `amount=${payload.amount}`,
    `extraData=${payload.extraData}`,
    `ipnUrl=${payload.ipnUrl}`,
    `orderId=${payload.orderId}`,
    `orderInfo=${payload.orderInfo}`,
    `partnerCode=${payload.partnerCode}`,
    `redirectUrl=${payload.redirectUrl}`,
    `requestId=${payload.requestId}`,
    `requestType=${payload.requestType}`
  ].join("&");
}

function buildCreatePaymentResponseSignature(payload, accessKey) {
  return [
    `accessKey=${accessKey}`,
    `amount=${payload.amount ?? ""}`,
    `message=${payload.message ?? ""}`,
    `orderId=${payload.orderId ?? ""}`,
    `partnerCode=${payload.partnerCode ?? ""}`,
    `payUrl=${payload.payUrl ?? ""}`,
    `requestId=${payload.requestId ?? ""}`,
    `responseTime=${payload.responseTime ?? ""}`,
    `resultCode=${payload.resultCode ?? ""}`
  ].join("&");
}

function buildPaymentResultSignature(payload, accessKey) {
  return [
    `accessKey=${accessKey}`,
    `amount=${payload.amount ?? ""}`,
    `extraData=${payload.extraData ?? ""}`,
    `message=${payload.message ?? ""}`,
    `orderId=${payload.orderId ?? ""}`,
    `orderInfo=${payload.orderInfo ?? ""}`,
    `orderType=${payload.orderType ?? ""}`,
    `partnerCode=${payload.partnerCode ?? ""}`,
    `payType=${payload.payType ?? ""}`,
    `requestId=${payload.requestId ?? ""}`,
    `responseTime=${payload.responseTime ?? ""}`,
    `resultCode=${payload.resultCode ?? ""}`,
    `transId=${payload.transId ?? ""}`
  ].join("&");
}

function buildExtraData(data) {
  const json = JSON.stringify(data || {});
  return Buffer.from(json).toString("base64");
}

function parseExtraData(extraData) {
  if (!extraData) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(String(extraData), "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function sendHttpsRequest({ hostname, path, body }) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(body);
    const request = https.request(
      {
        hostname,
        port: 443,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody)
        }
      },
      (response) => {
        let rawResponse = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          rawResponse += chunk;
        });
        response.on("end", () => {
          try {
            const parsedBody = rawResponse ? JSON.parse(rawResponse) : {};
            resolve({
              statusCode: response.statusCode || 500,
              body: parsedBody
            });
          } catch (error) {
            reject(
              new Error(`MoMo response is invalid JSON: ${error.message}`)
            );
          }
        });
      }
    );

    request.setTimeout(30000, () => {
      request.destroy(new Error("MoMo request timed out."));
    });

    request.on("error", reject);
    request.write(requestBody);
    request.end();
  });
}

function verifyCreatePaymentResponse(payload) {
  if (!payload?.signature) {
    return true;
  }

  const config = getMomoConfig();
  const expectedSignature = createSignature(
    buildCreatePaymentResponseSignature(payload, config.accessKey),
    config.secretKey
  );

  return expectedSignature === payload.signature;
}

function verifyPaymentResultSignature(payload) {
  const config = getMomoConfig();
  const expectedSignature = createSignature(
    buildPaymentResultSignature(payload, config.accessKey),
    config.secretKey
  );

  return expectedSignature === payload.signature;
}

async function createMomoPayment(order, user, orderItems) {
  const config = getMomoConfig();
  const requestId = `${config.partnerCode}-${Date.now()}`;
  const extraData = buildExtraData({
    orderCode: order.orderCode,
    userId: order.user.toString()
  });

  const payload = {
    partnerCode: config.partnerCode,
    accessKey: config.accessKey,
    requestId,
    amount: String(order.totalAmount),
    orderId: order.orderCode,
    orderInfo: `Thanh toan don hang ${order.orderCode}`,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    requestType: config.requestType,
    extraData,
    lang: config.lang
  };

  const signature = createSignature(
    buildCreatePaymentSignature(payload, config.accessKey),
    config.secretKey
  );

  const requestBody = {
    partnerCode: payload.partnerCode,
    partnerName: config.partnerName,
    storeId: config.storeId,
    requestId: payload.requestId,
    amount: payload.amount,
    orderId: payload.orderId,
    orderInfo: payload.orderInfo,
    redirectUrl: payload.redirectUrl,
    ipnUrl: payload.ipnUrl,
    lang: payload.lang,
    requestType: payload.requestType,
    autoCapture: true,
    extraData: payload.extraData,
    userInfo: {
      name: user.fullName || user.username || "",
      phoneNumber: user.phone || "",
      email: user.email || ""
    },
    items: orderItems.map((item) => ({
      id: item.product.toString(),
      name: item.productName,
      description: item.note || item.productName,
      category: "decor",
      imageUrl: item.productImage || "",
      manufacturer: "TiemDoTrangTriNoiThat",
      price: item.unitPrice,
      quantity: item.quantity,
      unit: "item",
      totalPrice: item.lineTotal,
      currency: "VND",
      taxAmount: 0
    })),
    signature
  };

  const { statusCode, body } = await sendHttpsRequest({
    hostname: config.hostname,
    path: config.path,
    body: requestBody
  });

  if (statusCode >= 400) {
    throw new Error(body.message || "Khong the tao lien ket thanh toan MoMo.");
  }

  if (!verifyCreatePaymentResponse(body)) {
    throw new Error("Chu ky phan hoi MoMo khong hop le.");
  }

  if (body.resultCode !== 0 || !body.payUrl) {
    throw new Error(body.message || "MoMo khong tra ve lien ket thanh toan.");
  }

  return body;
}

module.exports = {
  createMomoPayment,
  getMomoConfig,
  parseExtraData,
  verifyPaymentResultSignature
};
