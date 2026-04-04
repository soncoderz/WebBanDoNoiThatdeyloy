import "./ProductDetail.css";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StoreHeader from "../../components/StoreHeader";
import {
  API_BASE_URL,
  emitCartChanged,
  fetchJson,
  formatCurrency,
  getStoredSessionUser,
  requestAuthJson,
} from "../../utils/storefront";

function getValidImages(images = []) {
  return images.filter(
    (img) => img && typeof img === "string" && !img.includes("placehold.co"),
  );
}

function SpecItem({ label, value }) {
  if (!value) return null;

  return (
    <div className="pd-spec">
      <div className="pd-spec__label">{label}</div>
      <div className="pd-spec__value">{value}</div>
    </div>
  );
}

function ProductDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartSubmitting, setCartSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        setFeedback({ type: "", message: "" });

        const data = await fetchJson(`${API_BASE_URL}/api/home/products/${slug}`);

        if (isMounted) {
          setProduct(data.product || null);
          setQuantity(1);
          setActiveImageIndex(0);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Không thể tải chi tiết sản phẩm.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const validImages = product ? getValidImages(product.images) : [];
  const activeImage = validImages[activeImageIndex] || "";
  const dimensions = product?.dimensions || {};
  const dimensionText =
    dimensions.length || dimensions.width || dimensions.height
      ? `${dimensions.length || 0} × ${dimensions.width || 0} × ${dimensions.height || 0} ${dimensions.unit || "cm"}`
      : "";

  const hasDiscount =
    product?.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const specs = product
    ? [
        { label: "Danh mục", value: product.category?.name },
        { label: "SKU", value: product.sku },
        { label: "Chất liệu", value: product.material },
        { label: "Phong cách", value: product.style },
        { label: "Màu sắc", value: product.color },
        { label: "Kích thước", value: dimensionText },
      ].filter((s) => s.value)
    : [];

  async function handleAddToCart() {
    if (!product) return;

    if (!getStoredSessionUser()) {
      navigate("/login");
      return;
    }

    try {
      setCartSubmitting(true);
      setFeedback({ type: "", message: "" });

      await requestAuthJson(`${API_BASE_URL}/api/shop/cart/items`, {
        method: "POST",
        body: { productId: product._id, quantity },
      });

      emitCartChanged();
      setFeedback({
        type: "success",
        message: `Đã thêm ${quantity} sản phẩm vào giỏ hàng!`,
      });
    } catch (cartError) {
      setFeedback({
        type: "error",
        message: cartError.message || "Không thể thêm vào giỏ hàng.",
      });
    } finally {
      setCartSubmitting(false);
    }
  }

  return (
    <main className="pd-page">
      <section className="pd-container">
        <StoreHeader />

        {/* Breadcrumb */}
        <nav className="pd-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <svg className="pd-breadcrumb__sep" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <Link to="/san-pham">Sản phẩm</Link>
          {product?.category?.slug && (
            <>
              <svg className="pd-breadcrumb__sep" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <Link to={`/danh-muc/${product.category.slug}`}>
                {product.category.name}
              </Link>
            </>
          )}
          {product && (
            <>
              <svg className="pd-breadcrumb__sep" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="pd-breadcrumb__current">{product.name}</span>
            </>
          )}
        </nav>

        {/* States */}
        {loading ? (
          <div className="pd-loading">
            <div className="pd-loading__spinner" />
            <p>Đang tải chi tiết sản phẩm...</p>
          </div>
        ) : error ? (
          <div className="pd-error">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
            <Link
              to="/san-pham"
              style={{
                padding: "0.6rem 1.5rem",
                borderRadius: "999px",
                background: "#2f241f",
                color: "#fff8f0",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              Quay lại danh sách
            </Link>
          </div>
        ) : product ? (
          <div className="pd-main">
            {/* ===== LEFT: Gallery ===== */}
            <div className="pd-gallery">
              <div className="pd-gallery__main">
                {activeImage ? (
                  <img
                    className="pd-gallery__main-img"
                    src={activeImage}
                    alt={product.name}
                  />
                ) : (
                  <div className="pd-gallery__placeholder">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}

                {/* Badges */}
                <div className="pd-gallery__badge">
                  {product.isFeatured && (
                    <span className="pd-gallery__badge-item pd-gallery__badge-featured">
                      ★ Nổi bật
                    </span>
                  )}
                  <span
                    className={`pd-gallery__badge-item ${
                      product.quantityInStock > 0
                        ? "pd-gallery__badge-stock"
                        : "pd-gallery__badge-out"
                    }`}
                  >
                    {product.quantityInStock > 0
                      ? `Còn ${product.quantityInStock} sản phẩm`
                      : "Tạm hết hàng"}
                  </span>
                </div>
              </div>

              {/* Thumbnails */}
              {validImages.length > 1 && (
                <div className="pd-gallery__thumbs">
                  {validImages.map((img, index) => (
                    <button
                      key={img}
                      type="button"
                      className={`pd-gallery__thumb ${
                        index === activeImageIndex ? "pd-gallery__thumb--active" : ""
                      }`}
                      onClick={() => setActiveImageIndex(index)}
                    >
                      <img src={img} alt={`${product.name} ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ===== RIGHT: Info ===== */}
            <div className="pd-info">
              {/* Category */}
              {product.category?.slug && (
                <Link
                  className="pd-info__category"
                  to={`/danh-muc/${product.category.slug}`}
                >
                  <span className="pd-info__category-dot" />
                  {product.category.name}
                </Link>
              )}

              {/* Title */}
              <h1 className="pd-info__title">{product.name}</h1>

              {/* Short Description */}
              {product.shortDescription && (
                <p className="pd-info__short-desc">{product.shortDescription}</p>
              )}

              {/* Price */}
              <div className="pd-price">
                <span className="pd-price__current">
                  {formatCurrency(product.price)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="pd-price__original">
                      {formatCurrency(product.compareAtPrice)}
                    </span>
                    <span className="pd-price__discount">-{discountPercent}%</span>
                  </>
                )}
              </div>

              <hr className="pd-divider" />

              {/* Add to Cart */}
              <div className="pd-cart">
                <div className="pd-cart__label">Số lượng</div>
                <div className="pd-cart__controls">
                  <div className="pd-cart__qty">
                    <button
                      type="button"
                      className="pd-cart__qty-btn"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      disabled={cartSubmitting || product.quantityInStock <= 0}
                    >
                      −
                    </button>
                    <input
                      className="pd-cart__qty-input"
                      type="number"
                      min="1"
                      max={Math.max(1, product.quantityInStock)}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number(e.target.value) || 1))
                      }
                      disabled={cartSubmitting || product.quantityInStock <= 0}
                    />
                    <button
                      type="button"
                      className="pd-cart__qty-btn"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      disabled={cartSubmitting || product.quantityInStock <= 0}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="pd-cart__add-btn"
                    onClick={handleAddToCart}
                    disabled={cartSubmitting || product.quantityInStock <= 0}
                  >
                    {cartSubmitting ? (
                      <>
                        <span className="pd-loading__spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        Đang thêm...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        Thêm vào giỏ hàng
                      </>
                    )}
                  </button>
                </div>

                {feedback.message && (
                  <div
                    className={`pd-cart__feedback ${
                      feedback.type === "success"
                        ? "pd-cart__feedback--success"
                        : "pd-cart__feedback--error"
                    }`}
                  >
                    {feedback.type === "success" ? "✓ " : "✕ "}
                    {feedback.message}
                  </div>
                )}
              </div>

              {/* Specs */}
              {specs.length > 0 && (
                <>
                  <hr className="pd-divider" />
                  <div className="pd-specs">
                    {specs.map((spec) => (
                      <SpecItem
                        key={spec.label}
                        label={spec.label}
                        value={spec.value}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Description */}
              {product.description && (
                <>
                  <hr className="pd-divider" />
                  <div className="pd-description">
                    <h2 className="pd-description__title">
                      <span className="pd-description__title-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </span>
                      Mô tả chi tiết
                    </h2>
                    <div className="pd-description__body">{product.description}</div>
                  </div>
                </>
              )}

              {/* Tags */}
              {product.tags?.length > 0 && (
                <div className="pd-tags">
                  {product.tags.map((tag) => (
                    <span key={tag} className="pd-tag">
                      <svg className="pd-tag__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default ProductDetail;
