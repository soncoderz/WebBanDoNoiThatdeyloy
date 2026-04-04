import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import StoreHeader from "../../components/StoreHeader";
import {
  API_BASE_URL,
  fetchJson,
  formatCurrency,
  getDisplayImage,
} from "../../utils/storefront";

const PRODUCTS_PER_PAGE = 6;

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
      className="overflow-hidden rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 no-underline transition hover:-translate-y-1"
      to={`/san-pham/${product.slug}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {image ? (
          <img
            className="block h-full w-full object-cover"
            src={image}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-end bg-[linear-gradient(135deg,rgba(164,116,78,0.28),rgba(245,222,194,0.7))] p-5">
            <span className="rounded-full bg-white/75 px-3 py-2 text-sm font-bold">
              {product.category?.name || "San pham"}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3 text-[0.84rem] tracking-[0.08em] text-[#8b6243] uppercase max-sm:flex-col max-sm:items-start">
          <span>{product.category?.name || "Chua phan loai"}</span>
          <span>{product.quantityInStock > 0 ? "Con hang" : "Tam het hang"}</span>
        </div>
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <p className="mt-3 leading-7 text-[#655247]">
          {product.shortDescription || "San pham nay chua co mo ta ngan."}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <strong className="text-lg">{formatCurrency(product.price)}</strong>
          <span className="font-bold text-[#8b6243]">Xem chi tiet</span>
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
      className={`min-w-11 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        isActive
          ? "bg-[#2f241f] text-[#fff8f0]"
          : "border border-[rgba(95,63,42,0.14)] bg-white/80 text-[#5c4a40]"
      } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function CategoryProducts() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() || "";
  const requestedPage = parsePageValue(searchParams.get("page"));
  const [category, setCategory] = useState(null);
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
  const [totals, setTotals] = useState({
    categoryProducts: 0,
    matchingProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;

    async function loadCategoryProducts() {
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
          `${API_BASE_URL}/api/home/categories/${slug}?${query.toString()}`,
        );

        if (isMounted) {
          setCategory(data.category || null);
          setProducts(Array.isArray(data.products) ? data.products : []);
          setPagination({
            page: Number(data.pagination?.page) || 1,
            limit: Number(data.pagination?.limit) || PRODUCTS_PER_PAGE,
            totalItems: Number(data.pagination?.totalItems) || 0,
            totalPages: Number(data.pagination?.totalPages) || 1,
            hasPreviousPage: Boolean(data.pagination?.hasPreviousPage),
            hasNextPage: Boolean(data.pagination?.hasNextPage),
          });
          setTotals({
            categoryProducts: Number(data.totals?.categoryProducts) || 0,
            matchingProducts:
              Number(data.totals?.matchingProducts) ||
              (Array.isArray(data.products) ? data.products.length : 0),
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Khong the tai danh muc.");
          setCategory(null);
          setProducts([]);
          setPagination({
            page: 1,
            limit: PRODUCTS_PER_PAGE,
            totalItems: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          });
          setTotals({
            categoryProducts: 0,
            matchingProducts: 0,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCategoryProducts();

    return () => {
      isMounted = false;
    };
  }, [requestedPage, searchQuery, slug]);

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
  }, [
    error,
    loading,
    pagination.page,
    requestedPage,
    searchQuery,
    setSearchParams,
  ]);

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
  const visibleFrom = products.length ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const visibleTo = products.length ? visibleFrom + products.length - 1 : 0;
  const hasSearch = Boolean(searchQuery);

  return (
    <main className="min-h-screen px-3 py-4 text-[#2f241f] md:px-6 md:py-6">
      <section className="mx-auto w-full max-w-[1180px] rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.82)] p-5 shadow-[0_20px_60px_rgba(79,52,35,0.08)] md:p-6">
        <StoreHeader />

        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link className="rounded-full bg-white/75 px-4 py-2 no-underline" to="/">
            Trang chu
          </Link>
          {category?.parentCategory?.slug ? (
            <Link
              className="rounded-full bg-white/75 px-4 py-2 no-underline"
              to={`/danh-muc/${category.parentCategory.slug}`}
            >
              {category.parentCategory.name}
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
            Dang tai danh muc...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6 text-[#8a3d2f]">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-6 rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/70 p-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="overflow-hidden rounded-[24px]">
                {category?.image ? (
                  <img
                    className="block aspect-[5/4] h-full w-full object-cover"
                    src={category.image}
                    alt={category.name}
                  />
                ) : (
                  <div className="aspect-[5/4] h-full w-full bg-[linear-gradient(135deg,rgba(164,116,78,0.28),rgba(245,222,194,0.7))]" />
                )}
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-xs tracking-[0.16em] text-[#8b6243] uppercase">
                  Danh muc
                </p>
                <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                  {category?.name || "Danh muc"}
                </h1>
                <p className="mt-4 max-w-[60ch] leading-8 text-[#5c4a40]">
                  {category?.description || "Danh muc nay chua co mo ta."}
                </p>
                <div className="mt-6 inline-flex w-fit rounded-full bg-[#f3e5d7] px-4 py-2 font-semibold">
                  {totals.categoryProducts} san pham
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/70 p-5 md:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs tracking-[0.16em] text-[#8b6243] uppercase">
                      Danh sach san pham
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold">
                      Hien thi san pham dang the co tim kiem va phan trang
                    </h2>
                    <p className="mt-3 max-w-[60ch] leading-7 text-[#5c4a40]">
                      Tim theo ten, SKU, mo ta ngan, chat lieu, phong cach, mau
                      sac hoac tag de loc nhanh danh sach.
                    </p>
                  </div>

                  <form
                    className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] xl:min-w-[560px]"
                    onSubmit={handleSearchSubmit}
                  >
                    <input
                      className="w-full rounded-full border border-[rgba(95,63,42,0.14)] bg-white px-4 py-3 outline-none"
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Tim san pham trong danh muc nay..."
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-[#2f241f] px-5 py-3 font-semibold text-[#fff8f0]"
                    >
                      Tim kiem
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[rgba(95,63,42,0.14)] bg-white/85 px-5 py-3 font-semibold"
                      disabled={!searchQuery && !searchInput.trim()}
                      onClick={handleClearSearch}
                    >
                      Bo loc
                    </button>
                  </form>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#5c4a40]">
                  <span className="rounded-full bg-[#f6ecdd] px-4 py-2">
                    Tong danh muc: {totals.categoryProducts} san pham
                  </span>
                  <span className="rounded-full bg-[#f6ecdd] px-4 py-2">
                    Ket qua phu hop: {totals.matchingProducts}
                  </span>
                  {products.length ? (
                    <span className="rounded-full bg-[#f6ecdd] px-4 py-2">
                      Dang hien thi: {visibleFrom}-{visibleTo}
                    </span>
                  ) : null}
                  {hasSearch ? (
                    <span className="rounded-full bg-[#f3e5d7] px-4 py-2 font-semibold">
                      Tu khoa: {searchQuery}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-6">
                {products.length ? (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {products.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                ) : hasSearch ? (
                  <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
                    Khong tim thay san pham phu hop voi tu khoa nay.
                  </div>
                ) : (
                  <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
                    Danh muc nay hien chua co san pham active de hien thi.
                  </div>
                )}
              </div>

              {pagination.totalPages > 1 ? (
                <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-5 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-[#5c4a40]">
                    Trang {pagination.page}/{pagination.totalPages}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <PaginationButton
                      disabled={!pagination.hasPreviousPage}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      Truoc
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
                        <span
                          key={item}
                          className="inline-flex min-w-11 items-center justify-center px-2 text-[#7a5b47]"
                        >
                          ...
                        </span>
                      ),
                    )}

                    <PaginationButton
                      disabled={!pagination.hasNextPage}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Sau
                    </PaginationButton>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default CategoryProducts;
