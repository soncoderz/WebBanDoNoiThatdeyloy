import "./Cart.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StoreHeader from "../../components/StoreHeader";
import {
  API_BASE_URL,
  emitCartChanged,
  formatCurrency,
  formatDateTime,
  getDisplayImage,
  getStoredSessionUser,
  requestAuthJson,
} from "../../utils/storefront";

function buildInitialShippingForm() {
  const sessionUser = getStoredSessionUser();
  const defaultAddress =
    sessionUser?.addresses?.find((address) => address.isDefault) ||
    sessionUser?.addresses?.[0] ||
    {};

  return {
    fullName: defaultAddress.fullName || sessionUser?.fullName || "",
    phone: defaultAddress.phone || sessionUser?.phone || "",
    street: defaultAddress.street || "",
    ward: defaultAddress.ward || "",
    district: defaultAddress.district || "",
    city: defaultAddress.city || "",
    country: defaultAddress.country || "Viet Nam",
  };
}

function emptyCart() {
  return {
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
    updatedAt: null,
  };
}

function Cart() {
  const [sessionUser, setSessionUser] = useState(() => getStoredSessionUser());
  const [cart, setCart] = useState(emptyCart());
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shippingForm, setShippingForm] = useState(() => buildInitialShippingForm());
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [note, setNote] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    async function loadCart() {
      const nextSessionUser = getStoredSessionUser();
      setSessionUser(nextSessionUser);

      if (!nextSessionUser) {
        setCart(emptyCart());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await requestAuthJson(`${API_BASE_URL}/api/shop/cart`);
        setCart(data?.cart || emptyCart());
      } catch (cartError) {
        setFeedback(cartError.message || "Không thể tải giỏ hàng.");
      } finally {
        setLoading(false);
      }
    }

    loadCart();

    window.addEventListener("auth-session-changed", loadCart);
    window.addEventListener("cart-changed", loadCart);

    return () => {
      window.removeEventListener("auth-session-changed", loadCart);
      window.removeEventListener("cart-changed", loadCart);
    };
  }, []);

  function updateShippingField(field, value) {
    setShippingForm((prev) => ({ ...prev, [field]: value }));
  }

  async function updateQuantity(productId, quantity) {
    try {
      setActionLoadingKey(productId);
      setFeedback("");
      const data = await requestAuthJson(
        `${API_BASE_URL}/api/shop/cart/items/${productId}`,
        { method: "PATCH", body: { quantity } },
      );
      setCart(data?.cart || emptyCart());
      emitCartChanged();
    } catch (cartError) {
      setFeedback(cartError.message || "Không thể cập nhật giỏ hàng.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function removeItem(productId) {
    try {
      setActionLoadingKey(productId);
      setFeedback("");
      const data = await requestAuthJson(
        `${API_BASE_URL}/api/shop/cart/items/${productId}`,
        { method: "DELETE" },
      );
      setCart(data?.cart || emptyCart());
      emitCartChanged();
    } catch (cartError) {
      setFeedback(cartError.message || "Không thể xóa sản phẩm.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function clearCartItems() {
    try {
      setActionLoadingKey("clear-cart");
      setFeedback("");
      const data = await requestAuthJson(`${API_BASE_URL}/api/shop/cart`, {
        method: "DELETE",
      });
      setCart(data?.cart || emptyCart());
      emitCartChanged();
    } catch (cartError) {
      setFeedback(cartError.message || "Không thể làm trống giỏ hàng.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function handleCheckout(event) {
    event.preventDefault();

    try {
      setCheckoutLoading(true);
      setFeedback("");
      setLastOrder(null);

      const data = await requestAuthJson(`${API_BASE_URL}/api/shop/checkout`, {
        method: "POST",
        body: { shippingAddress: shippingForm, paymentMethod, note },
      });

      setLastOrder(data?.order || null);
      setCart(emptyCart());
      emitCartChanged();

      if (data?.payment?.payUrl) {
        window.location.assign(data.payment.payUrl);
        return;
      }

      setFeedback(
        data?.message ||
          `Đặt hàng thành công. Mã đơn của bạn là ${data?.order?.orderCode}.`,
      );
    } catch (checkoutError) {
      setFeedback(checkoutError.message || "Không thể đặt hàng lúc này.");

      try {
        const latestCart = await requestAuthJson(`${API_BASE_URL}/api/shop/cart`);
        setCart(latestCart?.cart || emptyCart());
        emitCartChanged();
      } catch {
        // Keep existing UI state if cart reload also fails
      }
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <main className="cart-page">
      <section className="cart-container">
        <StoreHeader />

        {/* Breadcrumb */}
        <nav className="cart-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <svg className="cart-breadcrumb__sep" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="cart-breadcrumb__current">Giỏ hàng</span>
        </nav>

        {/* Not logged in */}
        {!sessionUser ? (
          <div className="cart-login-prompt">
            <div className="cart-login-prompt__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="cart-login-prompt__title">Giỏ hàng của bạn</h1>
            <p className="cart-login-prompt__desc">
              Bạn cần đăng nhập để lưu giỏ hàng và đặt hàng.
            </p>
            <Link to="/login" className="cart-login-prompt__btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Header */}
            <div className="cart-header">
              <div className="cart-header__left">
                <div className="cart-header__icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <h1 className="cart-header__title">
                  Giỏ hàng
                  {cart.items.length > 0 && (
                    <span className="cart-header__count">{cart.totalQuantity} sản phẩm</span>
                  )}
                </h1>
              </div>

              <button
                type="button"
                className="cart-header__clear"
                onClick={clearCartItems}
                disabled={!cart.items.length || actionLoadingKey === "clear-cart" || checkoutLoading}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {actionLoadingKey === "clear-cart" ? "Đang xóa..." : "Xóa tất cả"}
              </button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="cart-feedback">{feedback}</div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="cart-loading">
                <div className="cart-loading__spinner" />
                <p>Đang tải giỏ hàng...</p>
              </div>
            ) : (
              <div className="cart-layout">
                {/* ===== LEFT: Cart Items ===== */}
                <div className="cart-items">
                  {cart.items.length ? (
                    cart.items.map((item) => {
                      const image = getDisplayImage(item.product?.images);
                      const isBusy = actionLoadingKey === item.product._id || checkoutLoading;

                      return (
                        <article key={item.product._id} className="cart-item">
                          {/* Image */}
                          <div className="cart-item__img-wrap">
                            {image ? (
                              <img className="cart-item__img" src={image} alt={item.product.name} />
                            ) : (
                              <div className="cart-item__img-placeholder">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <polyline points="21 15 16 10 5 21" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Body */}
                          <div className="cart-item__body">
                            <div className="cart-item__top">
                              <Link className="cart-item__name" to={`/san-pham/${item.product.slug}`}>
                                {item.product.name}
                              </Link>
                              <span className="cart-item__unit-price">
                                {formatCurrency(item.unitPrice)}
                              </span>
                            </div>

                            <div className="cart-item__bottom">
                              {/* Quantity */}
                              <div className="cart-item__qty">
                                <button
                                  type="button"
                                  className="cart-item__qty-btn"
                                  onClick={() => updateQuantity(item.product._id, Math.max(1, item.quantity - 1))}
                                  disabled={isBusy}
                                >
                                  −
                                </button>
                                <input
                                  className="cart-item__qty-input"
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateQuantity(item.product._id, Math.max(1, Number(e.target.value) || 1))
                                  }
                                  disabled={isBusy}
                                />
                                <button
                                  type="button"
                                  className="cart-item__qty-btn"
                                  onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                                  disabled={isBusy}
                                >
                                  +
                                </button>
                              </div>

                              {/* Total + Remove */}
                              <div className="cart-item__right">
                                <strong className="cart-item__line-total">
                                  {formatCurrency(item.lineTotal)}
                                </strong>
                                <button
                                  type="button"
                                  className="cart-item__remove"
                                  onClick={() => removeItem(item.product._id)}
                                  disabled={isBusy}
                                  title="Xóa sản phẩm"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="cart-empty">
                      <div className="cart-empty__icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                      </div>
                      <p>Giỏ hàng đang trống. Hãy khám phá sản phẩm để thêm vào giỏ!</p>
                      <Link to="/san-pham" className="cart-empty__link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Xem sản phẩm
                      </Link>
                    </div>
                  )}
                </div>

                {/* ===== RIGHT: Checkout ===== */}
                <div className="cart-checkout">
                  <h2 className="cart-checkout__title">
                    <span className="cart-checkout__title-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    </span>
                    Đặt hàng
                  </h2>

                  {/* Summary */}
                  <div className="cart-summary">
                    <div className="cart-summary__row">
                      <span>Tổng số lượng</span>
                      <strong>{cart.totalQuantity}</strong>
                    </div>
                    <div className="cart-summary__row">
                      <span>Tạm tính</span>
                      <strong>{formatCurrency(cart.totalAmount)}</strong>
                    </div>
                    <div className="cart-summary__row">
                      <span>Phí vận chuyển</span>
                      <strong>{formatCurrency(0)}</strong>
                    </div>
                    <hr className="cart-summary__divider" />
                    <div className="cart-summary__row cart-summary__total">
                      <span>Thanh toán</span>
                      <strong>{formatCurrency(cart.totalAmount)}</strong>
                    </div>
                  </div>

                  <hr className="cart-divider" />

                  {/* Form */}
                  <form className="cart-form" onSubmit={handleCheckout}>
                    <div className="cart-form__group">
                      <label className="cart-form__label" htmlFor="cart-fullname">Họ và tên</label>
                      <input
                        id="cart-fullname"
                        className="cart-form__input"
                        value={shippingForm.fullName}
                        onChange={(e) => updateShippingField("fullName", e.target.value)}
                        required
                      />
                    </div>

                    <div className="cart-form__group">
                      <label className="cart-form__label" htmlFor="cart-phone">Số điện thoại</label>
                      <input
                        id="cart-phone"
                        className="cart-form__input"
                        value={shippingForm.phone}
                        onChange={(e) => updateShippingField("phone", e.target.value)}
                        required
                      />
                    </div>

                    <div className="cart-form__group">
                      <label className="cart-form__label" htmlFor="cart-street">Địa chỉ</label>
                      <input
                        id="cart-street"
                        className="cart-form__input"
                        value={shippingForm.street}
                        onChange={(e) => updateShippingField("street", e.target.value)}
                        required
                      />
                    </div>

                    <div className="cart-form__row">
                      <div className="cart-form__group">
                        <label className="cart-form__label" htmlFor="cart-ward">Phường / Xã</label>
                        <input
                          id="cart-ward"
                          className="cart-form__input"
                          value={shippingForm.ward}
                          onChange={(e) => updateShippingField("ward", e.target.value)}
                        />
                      </div>
                      <div className="cart-form__group">
                        <label className="cart-form__label" htmlFor="cart-district">Quận / Huyện</label>
                        <input
                          id="cart-district"
                          className="cart-form__input"
                          value={shippingForm.district}
                          onChange={(e) => updateShippingField("district", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="cart-form__row">
                      <div className="cart-form__group">
                        <label className="cart-form__label" htmlFor="cart-city">Tỉnh / Thành phố</label>
                        <input
                          id="cart-city"
                          className="cart-form__input"
                          value={shippingForm.city}
                          onChange={(e) => updateShippingField("city", e.target.value)}
                          required
                        />
                      </div>
                      <div className="cart-form__group">
                        <label className="cart-form__label" htmlFor="cart-country">Quốc gia</label>
                        <input
                          id="cart-country"
                          className="cart-form__input"
                          value={shippingForm.country}
                          onChange={(e) => updateShippingField("country", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="cart-form__group">
                      <label className="cart-form__label" htmlFor="cart-note">Ghi chú</label>
                      <textarea
                        id="cart-note"
                        className="cart-form__textarea"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..."
                      />
                    </div>

                    {/* Payment Method */}
                    <div className="cart-payment">
                      <div className="cart-payment__title">Phương thức thanh toán</div>
                      <label
                        className={`cart-payment__option ${paymentMethod === "momo" ? "cart-payment__option--active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="momo"
                          checked={paymentMethod === "momo"}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <span className="cart-payment__option-label">
                          <span className="cart-payment__option-name">MoMo</span>
                          <span className="cart-payment__option-desc">Thanh toán qua ví MoMo</span>
                        </span>
                      </label>
                      <label
                        className={`cart-payment__option ${paymentMethod === "cod" ? "cart-payment__option--active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cod"
                          checked={paymentMethod === "cod"}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <span className="cart-payment__option-label">
                          <span className="cart-payment__option-name">COD</span>
                          <span className="cart-payment__option-desc">Thanh toán khi nhận hàng</span>
                        </span>
                      </label>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      className="cart-submit"
                      disabled={checkoutLoading || !cart.items.length}
                    >
                      {checkoutLoading ? (
                        <>
                          <span className="cart-submit__spinner" />
                          Đang tạo đơn hàng...
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          {paymentMethod === "momo" ? "Đặt hàng & thanh toán MoMo" : "Đặt hàng"}
                        </>
                      )}
                    </button>
                  </form>

                  <p className="cart-hint">
                    Đơn hàng sẽ được xử lý ngay sau khi bạn xác nhận. Nút đặt hàng sẽ tạm khóa trong lúc xử lý.
                  </p>
                </div>
              </div>
            )}

            {/* Last Order */}
            {lastOrder && (
              <div className="cart-last-order">
                <span className="cart-last-order__badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Đặt hàng thành công
                </span>
                <div className="cart-last-order__code">{lastOrder.orderCode}</div>
                <div className="cart-last-order__date">
                  Đặt lúc {formatDateTime(lastOrder.placedAt)}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default Cart;
