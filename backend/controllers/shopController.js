const mongoose = require("mongoose");
const Cart = require("../schemas/cart");
const Order = require("../schemas/order");
const OrderItem = require("../schemas/orderItem");
const Product = require("../schemas/product");
const { createMomoPayment, parseExtraData, verifyPaymentResultSignature } = require("../utils/momo");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseQuantity(value) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function getDefaultAddress(user) {
  if (!Array.isArray(user.addresses) || !user.addresses.length) {
    return null;
  }

  return user.addresses.find((address) => address.isDefault) || user.addresses[0];
}

function buildShippingAddress(input, user) {
  const defaultAddress = getDefaultAddress(user);
  const shippingAddress = {
    fullName: input?.fullName?.trim() || defaultAddress?.fullName || user.fullName || "",
    phone: input?.phone?.trim() || defaultAddress?.phone || user.phone || "",
    street: input?.street?.trim() || defaultAddress?.street || "",
    ward: input?.ward?.trim() || defaultAddress?.ward || "",
    district: input?.district?.trim() || defaultAddress?.district || "",
    city: input?.city?.trim() || defaultAddress?.city || "",
    country: input?.country?.trim() || defaultAddress?.country || "Viet Nam"
  };

  if (
    !shippingAddress.fullName ||
    !shippingAddress.phone ||
    !shippingAddress.street ||
    !shippingAddress.district ||
    !shippingAddress.city
  ) {
    throw createHttpError(400, "Thong tin giao hang chua day du.");
  }

  return shippingAddress;
}

function mapCartItem(item) {
  const product = item.product;

  if (!product) {
    return null;
  }

  return {
    product: {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      images: product.images,
      price: product.price,
      quantityInStock: product.quantityInStock,
      status: product.status
    },
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.quantity * item.unitPrice,
    addedAt: item.addedAt
  };
}

function emptyCartResponse() {
  return {
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
    updatedAt: null
  };
}

function mapCart(cart) {
  if (!cart) {
    return emptyCartResponse();
  }

  const items = cart.items.map(mapCartItem).filter(Boolean);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    _id: cart._id,
    items,
    totalQuantity,
    totalAmount,
    updatedAt: cart.updatedAt
  };
}

function mapOrderItem(item) {
  return {
    _id: item._id,
    product: item.product
      ? {
          _id: item.product._id,
          name: item.product.name,
          slug: item.product.slug,
          images: item.product.images
        }
      : {
          _id: item.product,
          name: item.productName,
          slug: item.productSlug,
          images: item.productImage ? [item.productImage] : []
        },
    productName: item.productName,
    productSlug: item.productSlug,
    productImage: item.productImage,
    sku: item.sku,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    note: item.note
  };
}

function mapOrder(order) {
  return {
    _id: order._id,
    orderCode: order.orderCode,
    paymentMethod: order.paymentMethod,
    paymentProvider: order.paymentProvider,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    paymentRedirectUrl: order.paymentRedirectUrl,
    paymentTransactionId: order.paymentTransactionId,
    paymentResponseCode: order.paymentResponseCode,
    paymentMessage: order.paymentMessage,
    orderStatus: order.orderStatus,
    shippingAddress: order.shippingAddress,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    note: order.note,
    placedAt: order.placedAt,
    paidAt: order.paidAt,
    cancelledAt: order.cancelledAt,
    items: Array.isArray(order.items) ? order.items.map(mapOrderItem) : []
  };
}

async function findCartByUser(userId, session) {
  return Cart.findOne({ user: userId }).session(session || null);
}

async function getOrCreateCart(userId, session) {
  let cart = await findCartByUser(userId, session);

  if (!cart) {
    cart = new Cart({
      user: userId,
      items: []
    });
    await cart.save({ session });
  }

  return cart;
}

async function saveCart(cart, session) {
  await cart.save({ session });
  return cart;
}

async function loadCartForResponse(userId) {
  const cart = await Cart.findOne({ user: userId }).populate(
    "items.product",
    "name slug images price quantityInStock status isDeleted"
  );

  return mapCart(cart);
}

async function findActiveProductById(productId, session) {
  return Product.findOne({
    _id: productId,
    isDeleted: false,
    status: "active"
  }).session(session || null);
}

async function ensureCartQuantityAvailable(productId, desiredQuantity, session) {
  const product = await findActiveProductById(productId, session);

  if (!product) {
    throw createHttpError(404, "San pham khong ton tai hoac khong con ban.");
  }

  if (desiredQuantity > product.quantityInStock) {
    throw createHttpError(409, "Khong du hang.");
  }

  return product;
}

async function generateOrderCode(session) {
  while (true) {
    const orderCode = `DH${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
    const existingOrder = await Order.exists({ orderCode }).session(session);

    if (!existingOrder) {
      return orderCode;
    }
  }
}

async function reserveInventoryForCartItems(cartItems, session) {
  const productIds = cartItems.map((item) => item.product);
  const products = await Product.find({
    _id: { $in: productIds },
    isDeleted: false
  }).session(session);
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const orderItemsPayload = [];

  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.product.toString());

    if (!product || product.status !== "active") {
      throw createHttpError(400, "San pham trong gio hang khong con hop le.");
    }

    const reservedProduct = await Product.findOneAndUpdate(
      {
        _id: product._id,
        isDeleted: false,
        status: "active",
        quantityInStock: { $gte: cartItem.quantity }
      },
      {
        $inc: {
          quantityInStock: -cartItem.quantity
        }
      },
      {
        returnDocument: "after",
        session
      }
    );

    if (!reservedProduct) {
      throw createHttpError(409, "Khong du hang.");
    }

    const unitPrice = cartItem.unitPrice > 0 ? cartItem.unitPrice : product.price;

    orderItemsPayload.push({
      product: product._id,
      productName: product.name,
      productSlug: product.slug,
      productImage: Array.isArray(product.images) ? product.images[0] || "" : "",
      sku: product.sku,
      unitPrice,
      quantity: cartItem.quantity,
      lineTotal: unitPrice * cartItem.quantity,
      note: ""
    });
  }

  return orderItemsPayload;
}

async function createOrderItems(orderId, itemsPayload, session) {
  return OrderItem.insertMany(
    itemsPayload.map((item) => ({
      ...item,
      order: orderId
    })),
    { session }
  );
}

async function clearCart(cart, session) {
  cart.items = [];
  await saveCart(cart, session);
}

async function createOrderFromCart({ user, cart, shippingAddress, paymentMethod, note }, session) {
  const reservedItems = await reserveInventoryForCartItems(cart.items, session);
  const subtotal = reservedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const orderCode = await generateOrderCode(session);
  const order = new Order({
    orderCode,
    user: user._id,
    items: [],
    shippingAddress,
    paymentMethod,
    paymentProvider: paymentMethod === "momo" ? "momo" : "",
    paymentStatus: "pending",
    orderStatus: "pending",
    subtotal,
    shippingFee: 0,
    discountAmount: 0,
    totalAmount: subtotal,
    note: note?.trim() || ""
  });

  await order.save({ session });

  const createdOrderItems = await createOrderItems(order._id, reservedItems, session);
  order.items = createdOrderItems.map((item) => item._id);
  await order.save({ session });
  await clearCart(cart, session);

  return {
    orderId: order._id,
    orderCode,
    createdOrderItems
  };
}

async function loadOrderById(orderId) {
  return Order.findById(orderId).populate({
    path: "items",
    populate: {
      path: "product",
      select: "name slug images"
    }
  });
}

async function loadOrderByCode(orderCode, userId) {
  return Order.findOne({
    orderCode,
    user: userId,
    isDeleted: false
  }).populate({
    path: "items",
    populate: {
      path: "product",
      select: "name slug images"
    }
  });
}

function mergeOrderItemsBackToCart(cart, orderItems) {
  const mergedItems = [...cart.items];

  for (const orderItem of orderItems) {
    const existingItem = mergedItems.find(
      (item) => item.product.toString() === orderItem.product.toString()
    );

    if (existingItem) {
      existingItem.quantity += orderItem.quantity;
      existingItem.unitPrice = orderItem.unitPrice;
      existingItem.addedAt = new Date();
    } else {
      mergedItems.push({
        product: orderItem.product,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        addedAt: new Date()
      });
    }
  }

  cart.items = mergedItems;
}

async function restoreInventory(orderItems, session) {
  for (const orderItem of orderItems) {
    await Product.findByIdAndUpdate(
      orderItem.product,
      {
        $inc: {
          quantityInStock: orderItem.quantity
        }
      },
      { session }
    );
  }
}

async function restoreFailedOrder(orderCode, paymentPayload) {
  const session = await mongoose.startSession();

  try {
    let restoredOrderId = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        orderCode,
        isDeleted: false
      }).session(session);

      if (!order) {
        throw createHttpError(404, "Khong tim thay don hang.");
      }

      if (order.orderStatus === "cancelled") {
        restoredOrderId = order._id;
        return;
      }

      if (order.paymentStatus === "paid") {
        restoredOrderId = order._id;
        return;
      }

      const orderItems = await OrderItem.find({ order: order._id }).session(session);
      const cart = await getOrCreateCart(order.user, session);

      await restoreInventory(orderItems, session);
      mergeOrderItemsBackToCart(cart, orderItems);
      await saveCart(cart, session);

      order.paymentStatus = "failed";
      order.paymentResponseCode = Number(paymentPayload?.resultCode ?? -1);
      order.paymentMessage = paymentPayload?.message || order.paymentMessage;
      order.paymentTransactionId = paymentPayload?.transId
        ? String(paymentPayload.transId)
        : order.paymentTransactionId;
      order.paymentProviderData = paymentPayload || order.paymentProviderData;
      order.orderStatus = "cancelled";
      order.cancelledAt = new Date();
      await order.save({ session });

      restoredOrderId = order._id;
    });

    return restoredOrderId ? loadOrderById(restoredOrderId) : null;
  } finally {
    await session.endSession();
  }
}

async function markOrderPaid(orderCode, paymentPayload) {
  const session = await mongoose.startSession();

  try {
    let updatedOrderId = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        orderCode,
        isDeleted: false
      }).session(session);

      if (!order) {
        throw createHttpError(404, "Khong tim thay don hang.");
      }

      if (order.orderStatus === "cancelled") {
        updatedOrderId = order._id;
        return;
      }

      if (order.paymentStatus === "paid") {
        updatedOrderId = order._id;
        return;
      }

      order.paymentStatus = "paid";
      order.paymentResponseCode = Number(paymentPayload.resultCode || 0);
      order.paymentMessage = paymentPayload.message || "Thanh toan thanh cong.";
      order.paymentTransactionId = paymentPayload.transId
        ? String(paymentPayload.transId)
        : order.paymentTransactionId;
      order.paymentProvider = "momo";
      order.paymentProviderData = paymentPayload;
      order.paidAt = paymentPayload.responseTime
        ? new Date(Number(paymentPayload.responseTime))
        : new Date();

      if (order.orderStatus === "pending") {
        order.orderStatus = "confirmed";
      }

      await order.save({ session });
      updatedOrderId = order._id;
    });

    return updatedOrderId ? loadOrderById(updatedOrderId) : null;
  } finally {
    await session.endSession();
  }
}

async function finalizeMomoResult(paymentPayload) {
  if (!verifyPaymentResultSignature(paymentPayload)) {
    throw createHttpError(400, "Chu ky thanh toan MoMo khong hop le.");
  }

  const extraData = parseExtraData(paymentPayload.extraData);
  const orderCode = paymentPayload.orderId || extraData.orderCode;

  if (!orderCode) {
    throw createHttpError(400, "Khong xac dinh duoc don hang tu MoMo.");
  }

  if (Number(paymentPayload.resultCode) === 0) {
    return markOrderPaid(orderCode, paymentPayload);
  }

  return restoreFailedOrder(orderCode, paymentPayload);
}

async function getCart(req, res, next) {
  try {
    const cart = await loadCartForResponse(req.user._id);
    return res.status(200).json({ cart });
  } catch (error) {
    return next(error);
  }
}

async function addToCart(req, res, next) {
  try {
    const { productId, quantity } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "San pham khong hop le." });
    }

    const parsedQuantity = parseQuantity(quantity);

    if (!parsedQuantity) {
      return res.status(400).json({ message: "So luong khong hop le." });
    }

    const product = await ensureCartQuantityAvailable(productId, parsedQuantity);
    const cart = await getOrCreateCart(req.user._id);
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      const desiredQuantity = existingItem.quantity + parsedQuantity;
      await ensureCartQuantityAvailable(productId, desiredQuantity);
      existingItem.quantity = desiredQuantity;
      existingItem.unitPrice = product.price;
      existingItem.addedAt = new Date();
    } else {
      cart.items.push({
        product: product._id,
        quantity: parsedQuantity,
        unitPrice: product.price,
        addedAt: new Date()
      });
    }

    await saveCart(cart);
    const responseCart = await loadCartForResponse(req.user._id);

    return res.status(201).json({
      message: "Da them san pham vao gio hang.",
      cart: responseCart
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

async function updateCartItem(req, res, next) {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "San pham khong hop le." });
    }

    const parsedQuantity = parseQuantity(quantity);

    if (!parsedQuantity) {
      return res.status(400).json({ message: "So luong khong hop le." });
    }

    const product = await ensureCartQuantityAvailable(productId, parsedQuantity);
    const cart = await findCartByUser(req.user._id);

    if (!cart) {
      return res.status(404).json({ message: "Gio hang dang trong." });
    }

    const cartItem = cart.items.find((item) => item.product.toString() === productId);

    if (!cartItem) {
      return res.status(404).json({ message: "San pham khong co trong gio hang." });
    }

    cartItem.quantity = parsedQuantity;
    cartItem.unitPrice = product.price;
    await saveCart(cart);

    return res.status(200).json({
      message: "Da cap nhat gio hang.",
      cart: await loadCartForResponse(req.user._id)
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

async function removeCartItem(req, res, next) {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "San pham khong hop le." });
    }

    const cart = await findCartByUser(req.user._id);

    if (!cart) {
      return res.status(200).json({
        message: "Gio hang da trong.",
        cart: emptyCartResponse()
      });
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await saveCart(cart);

    return res.status(200).json({
      message: "Da xoa san pham khoi gio hang.",
      cart: await loadCartForResponse(req.user._id)
    });
  } catch (error) {
    return next(error);
  }
}

async function clearCartItems(req, res, next) {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await saveCart(cart);

    return res.status(200).json({
      message: "Da lam trong gio hang.",
      cart: emptyCartResponse()
    });
  } catch (error) {
    return next(error);
  }
}

async function checkout(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const paymentMethod = req.body.paymentMethod === "momo" ? "momo" : "cod";
    const shippingAddress = buildShippingAddress(req.body.shippingAddress, req.user);
    let checkoutResult = null;

    await session.withTransaction(async () => {
      const cart = await findCartByUser(req.user._id, session);

      if (!cart || !cart.items.length) {
        throw createHttpError(400, "Gio hang dang trong.");
      }

      checkoutResult = await createOrderFromCart(
        {
          user: req.user,
          cart,
          shippingAddress,
          paymentMethod,
          note: req.body.note
        },
        session
      );
    });

    const order = await loadOrderById(checkoutResult.orderId);

    if (paymentMethod !== "momo") {
      return res.status(201).json({
        message: "Đặt hàng thành công.",
        order: mapOrder(order)
      });
    }

    try {
      const paymentResponse = await createMomoPayment(
        order,
        req.user,
        order.items.map((item) => ({
          product: item.product?._id || item.product,
          productName: item.productName,
          productImage: item.productImage,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          note: item.note
        }))
      );

      order.paymentReference = paymentResponse.requestId || "";
      order.paymentRedirectUrl = paymentResponse.payUrl || "";
      order.paymentResponseCode = Number(paymentResponse.resultCode || 0);
      order.paymentMessage = paymentResponse.message || "";
      order.paymentProvider = "momo";
      order.paymentProviderData = paymentResponse;
      await order.save();

      return res.status(201).json({
        message: "Da tao lien ket thanh toan MoMo.",
        order: mapOrder(order),
        payment: {
          payUrl: paymentResponse.payUrl,
          deeplink: paymentResponse.deeplink || "",
          qrCodeUrl: paymentResponse.qrCodeUrl || "",
          requestId: paymentResponse.requestId
        }
      });
    } catch (paymentError) {
      const restoredOrder = await restoreFailedOrder(order.orderCode, {
        resultCode: -1,
        message: paymentError.message
      });

      return res.status(502).json({
        message: "Tao lien ket thanh toan MoMo that bai. Gio hang da duoc khoi phuc.",
        order: restoredOrder ? mapOrder(restoredOrder) : null
      });
    }
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  } finally {
    await session.endSession();
  }
}

async function getOrderDetail(req, res, next) {
  try {
    const order = await loadOrderByCode(req.params.orderCode, req.user._id);

    if (!order) {
      return res.status(404).json({ message: "Khong tim thay don hang." });
    }

    return res.status(200).json({
      order: mapOrder(order)
    });
  } catch (error) {
    return next(error);
  }
}

async function handleMomoPaymentResult(req, res, next) {
  try {
    const order = await finalizeMomoResult(req.body || {});

    return res.status(200).json({
      message: "Da cap nhat ket qua thanh toan.",
      order: order ? mapOrder(order) : null
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

module.exports = {
  addToCart,
  checkout,
  clearCartItems,
  getCart,
  getOrderDetail,
  handleMomoPaymentResult,
  removeCartItem,
  updateCartItem
};
