export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const SESSION_STORAGE_KEY = "auth_demo_session";

export function getStoredSession() {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function getStoredSessionUser() {
  return getStoredSession()?.user || null;
}

export function getStoredToken() {
  return getStoredSession()?.token || "";
}

export function saveStoredSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  emitSessionChanged();
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  emitSessionChanged();
}

export function emitSessionChanged() {
  window.dispatchEvent(new Event("auth-session-changed"));
}

export function emitCartChanged() {
  window.dispatchEvent(new Event("cart-changed"));
}

export function formatCurrency(price) {
  if (typeof price !== "number") {
    return "Lien he";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export function getDisplayImage(images = []) {
  const validImage = images.find(
    (image) =>
      image && typeof image === "string" && !image.includes("placehold.co"),
  );

  return validImage || "";
}

export function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export async function requestJson(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const hasBody = options.body !== undefined;
  let requestBody = options.body;

  if (hasBody && !isFormData && typeof requestBody !== "string") {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    requestBody = JSON.stringify(requestBody);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: hasBody ? requestBody : undefined,
  });
  const rawText = await response.text();
  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || "Khong the tai du lieu.");
  }

  return data;
}

export async function fetchJson(url, options = {}) {
  return requestJson(url, options);
}

export async function requestAuthJson(url, options = {}) {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Ban chua dang nhap.");
  }

  return requestJson(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
