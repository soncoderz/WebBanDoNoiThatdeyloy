import "./Products.css";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StoreHeader from "../../components/StoreHeader";
import {
  API_BASE_URL,
  fetchJson,
  formatCurrency,
  getDisplayImage,
} from "../../utils/storefront";

const PRODUCTS_PER_PAGE = 12;

function parsePageValue(value) {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return 1;
}

function buildPaginationItems(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);

  if (startPage > 2) {
    items.push("start-ellipsis");
  }

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
    items.push(pageNumber);
  }

  if (endPage < totalPages - 1) {
    items.push("end-ellipsis");
  }

  items.push(totalPages);

  return items;
}

function ProductCard({ product }) {
  const image = getDisplayImage(product.images);

  return (
    <Link
      className="product-card"
      to={`/san-pham/${product.slug}`}
    >
      <div className="product-card__image-wrap">
        {image ? (
          <img
            className="product-card__image"
            src={image}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="product-card__placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {product.isFeatured && (
          <span className="product-card__badge">Nổi bật</span>
        )}
        <span className="product-card__status">
          {product.quantityInStock > 0 ? "Còn hàng" : "Tạm hết"}
        </span>
      </div>

      <div className="product-card__body">
        {product.category?.name && (
          <span className="product-card__category">{product.category.name}</span>
        )}
        <h2 className="product-card__name">{product.name}</h2>
        {product.shortDescription && (
          <p className="product-card__desc">{product.shortDescription}</p>
        )}
        <div className="product-card__footer">
          <strong className="product-card__price">{formatCurrency(product.price)}</strong>
          <span className="product-card__cta">
            Xem chi tiết
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function PaginationButton({
  children,
  disabled = false,
  isActive = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`pagination-btn ${isActive ? "pagination-btn--active" : ""} ${disabled ? "pagination-btn--disabled" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() || "";
  const requestedPage = parsePageValue(searchParams.get("page"));
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PRODUCTS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams({
          page: String(requestedPage),
          limit: String(PRODUCTS_PER_PAGE),
        });

        if (searchQuery) {
          query.set("q", searchQuery);
        }

        const data = await fetchJson(
          `${API_BASE_URL}/api/home/products?${query.toString()}`
        );

        if (isMounted) {
          setProducts(Array.isArray(data.products) ? data.products : []);
          setPagination({
            page: Number(data.pagination?.page) || 1,
            limit: Number(data.pagination?.limit) || PRODUCTS_PER_PAGE,
            totalItems: Number(data.pagination?.totalItems) || 0,
            totalPages: Number(data.pagination?.totalPages) || 1,
            hasPreviousPage: Boolean(data.pagination?.hasPreviousPage),
            hasNextPage: Boolean(data.pagination?.hasNextPage),
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Không thể tải sản phẩm.");
          setProducts([]);
          setPagination({
            page: 1,
            limit: PRODUCTS_PER_PAGE,
            totalItems: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [requestedPage, searchQuery]);

  useEffect(() => {
    if (loading || error || pagination.page === requestedPage) {
      return;
    }

    const nextSearchParams = new URLSearchParams();

    if (searchQuery) {
      nextSearchParams.set("q", searchQuery);
    }

    if (pagination.page > 1) {
      nextSearchParams.set("page", String(pagination.page));
    }

    setSearchParams(nextSearchParams);
  }, [error, loading, pagination.page, requestedPage, searchQuery, setSearchParams]);

  function updateQueryParams(nextQuery, nextPage = 1) {
    const nextSearchParams = new URLSearchParams();

    if (nextQuery) {
      nextSearchParams.set("q", nextQuery);
    }

    if (nextPage > 1) {
      nextSearchParams.set("page", String(nextPage));
    }

    setSearchParams(nextSearchParams);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    updateQueryParams(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    updateQueryParams("");
  }

  function handlePageChange(nextPage) {
    if (nextPage === pagination.page || nextPage < 1 || nextPage > pagination.totalPages) {
      return;
    }

    updateQueryParams(searchQuery, nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const pageItems = buildPaginationItems(pagination.totalPages, pagination.page);
  const hasSearch = Boolean(searchQuery);

  return (
    <main className="products-page">
      <section className="products-page__container">
        <StoreHeader />

        {/* Breadcrumb */}
        <nav className="products-page__breadcrumb">
          <Link to="/">Trang chủ</Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>Sản phẩm</span>
        </nav>

        {/* Search Section */}
        <div className="products-page__search-section">
          <div className="products-page__search-header">
            <h1 className="products-page__title">Tất cả sản phẩm</h1>
            <p className="products-page__subtitle">
              {loading
                ? "Đang tải..."
                : `${pagination.totalItems} sản phẩm`}
            </p>
          </div>

          <form className="products-page__search-form" onSubmit={handleSearchSubmit}>
            <div className="products-page__search-input-wrap">
              <svg className="products-page__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="search-products"
                className="products-page__search-input"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm kiếm sản phẩm theo tên..."
              />
              {searchInput.trim() && (
                <button
                  type="button"
                  className="products-page__search-clear"
                  onClick={handleClearSearch}
                  aria-label="Xóa tìm kiếm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <button type="submit" className="products-page__search-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Tìm kiếm
            </button>
          </form>

          {hasSearch && (
            <div className="products-page__search-tag">
              <span>Từ khóa: <strong>{searchQuery}</strong></span>
              <button type="button" onClick={handleClearSearch} className="products-page__search-tag-remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="products-page__loading">
            <div className="products-page__spinner" />
            <p>Đang tải sản phẩm...</p>
          </div>
        ) : error ? (
          <div className="products-page__error">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
          </div>
        ) : products.length ? (
          <div className="products-page__grid">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : hasSearch ? (
          <div className="products-page__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <p>Không tìm thấy sản phẩm phù hợp với từ khóa "<strong>{searchQuery}</strong>"</p>
            <button type="button" className="products-page__empty-reset" onClick={handleClearSearch}>
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="products-page__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <p>Hiện chưa có sản phẩm nào để hiển thị.</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && !loading ? (
          <div className="products-page__pagination">
            <p className="products-page__pagination-info">
              Trang {pagination.page} / {pagination.totalPages}
              <span> · {pagination.totalItems} sản phẩm</span>
            </p>

            <div className="products-page__pagination-buttons">
              <PaginationButton
                disabled={!pagination.hasPreviousPage}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Trước
              </PaginationButton>

              {pageItems.map((item) =>
                typeof item === "number" ? (
                  <PaginationButton
                    key={item}
                    isActive={item === pagination.page}
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </PaginationButton>
                ) : (
                  <span key={item} className="pagination-ellipsis">
                    ···
                  </span>
                )
              )}

              <PaginationButton
                disabled={!pagination.hasNextPage}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Sau
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </PaginationButton>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default Products;
