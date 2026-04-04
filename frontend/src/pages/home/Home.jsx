import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StoreHeader from "../../components/StoreHeader";
import {
  API_BASE_URL,
  formatCurrency,
  getDisplayImage,
} from "../../utils/storefront";

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

        <h3 className="text-xl font-semibold">{product.name}</h3>

        {product.shortDescription ? (
          <p className="mt-3 leading-7 text-[#655247]">
            {product.shortDescription}
          </p>
        ) : (
          <p className="mt-3 leading-7 text-[#655247]">
            San pham nay chua co mo ta ngan.
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start">
          <strong className="text-lg">{formatCurrency(product.price)}</strong>
          <span className="font-bold text-[#8b6243]">Xem chi tiet</span>
        </div>
      </div>
    </Link>
  );
}

function CategoryCard({ category }) {
  const hasRealImage =
    category.image &&
    typeof category.image === "string" &&
    !category.image.includes("placehold.co");

  return (
    <Link
      className="overflow-hidden rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 no-underline transition hover:-translate-y-1"
      to={`/danh-muc/${category.slug}`}
    >
      <div className="relative aspect-[5/4] overflow-hidden">
        {hasRealImage ? (
          <img
            className="block h-full w-full object-cover"
            src={category.image}
            alt={category.name}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,rgba(164,116,78,0.28),rgba(245,222,194,0.7))]" />
        )}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-semibold">{category.name}</h3>
        <p className="mt-3 leading-7 text-[#655247]">
          {category.description || "Danh muc nay chua co mo ta."}
        </p>
        <div className="mt-5 font-bold text-[#8b6243]">Xem san pham</div>
      </div>
    </Link>
  );
}

function SectionState({ title, description }) {
  return (
    <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/74 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 leading-7 text-[#655247]">{description}</p>
    </div>
  );
}

function SectionShell({ id, eyebrow, title, children }) {
  return (
    <section
      className="mx-auto mb-6 w-full max-w-[1180px] rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.82)] px-5 py-7 shadow-[0_20px_60px_rgba(79,52,35,0.08)] md:px-6"
      id={id}
    >
      <div className="mb-5">
        <p className="mb-3 text-xs tracking-[0.16em] text-[#8b6243] uppercase">
          {eyebrow}
        </p>
        <h2 className="max-w-[18ch] text-3xl leading-none font-semibold md:text-5xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Home() {
  const [homeData, setHomeData] = useState({
    categories: [],
    featuredProducts: [],
    latestProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/api/home`);
        if (!response.ok) {
          throw new Error("Khong the tai du lieu trang chu.");
        }

        const data = await response.json();

        if (isMounted) {
          setHomeData({
            categories: Array.isArray(data.categories) ? data.categories : [],
            featuredProducts: Array.isArray(data.featuredProducts)
              ? data.featuredProducts
              : [],
            latestProducts: Array.isArray(data.latestProducts)
              ? data.latestProducts
              : [],
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Co loi xay ra khi tai trang chu.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const { categories, featuredProducts, latestProducts } = homeData;
  const highlightProduct = featuredProducts[0] || latestProducts[0] || null;

  return (
    <main className="min-h-screen px-3 py-4 text-[#2f241f] md:px-6 md:py-6">
      <section className="mx-auto mb-6 w-full max-w-[1180px] overflow-hidden rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.82)] p-5 shadow-[0_20px_60px_rgba(79,52,35,0.08)] md:p-6">
        <StoreHeader />

        <div className="mb-9 flex flex-wrap gap-3">
          <a
            className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline"
            href="#danh-muc"
          >
            Danh muc
          </a>
          <Link
            className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline"
            to="/san-pham"
          >
            Tat ca san pham
          </Link>
          <a
            className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline"
            href="#noi-bat"
          >
            Noi bat
          </a>
          <a
            className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline"
            href="#moi-nhat"
          >
            Moi nhat
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="px-1 py-3">
            <p className="mb-3 text-xs tracking-[0.16em] text-[#8b6243] uppercase">
              Khong gian song duoc chon loc tu du lieu that
            </p>
            <h1 className="max-w-[12ch] text-5xl leading-none font-semibold md:text-7xl">
              Trang chu ban do trang tri noi that san sang hien thi du lieu tu
              kho san pham cua ban.
            </h1>
            <p className="mt-5 max-w-[54ch] text-base leading-8 text-[#5c4a40]">
              Giao dien nay khong dung du lieu ao. Danh muc, san pham noi bat
              va san pham moi se chi xuat hien khi he thong co du lieu that
              trong MongoDB.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#noi-bat"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2f241f] px-5 font-bold text-[#fff8f0] no-underline"
              >
                Kham pha san pham
              </a>
              <a
                href="#moi-nhat"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(95,63,42,0.18)] bg-white/80 px-5 font-bold no-underline"
              >
                Xem bo suu tap moi
              </a>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              <div className="grid gap-1 rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-5">
                <strong className="text-3xl">{categories.length}</strong>
                <span className="text-[#6a564b]">danh muc dang hien thi</span>
              </div>
              <div className="grid gap-1 rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-5">
                <strong className="text-3xl">{featuredProducts.length}</strong>
                <span className="text-[#6a564b]">san pham noi bat</span>
              </div>
              <div className="grid gap-1 rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-5">
                <strong className="text-3xl">{latestProducts.length}</strong>
                <span className="text-[#6a564b]">san pham moi nhat</span>
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] bg-[linear-gradient(180deg,rgba(63,42,31,0.96),rgba(89,63,48,0.92))] p-6 text-[#f8efe5]">
            <p className="mb-3 text-xs tracking-[0.16em] uppercase">
              Diem nhan hien tai
            </p>
            {highlightProduct ? (
              <div className="grid gap-6 rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6 text-[#2f241f]">
                <div>
                  <span className="mb-2 inline-block text-sm tracking-[0.12em] text-[#8b6243] uppercase">
                    {highlightProduct.category?.name || "San pham"}
                  </span>
                  <h2 className="text-3xl font-semibold md:text-4xl">
                    {highlightProduct.name}
                  </h2>
                  <p className="mt-4 leading-7 text-[#5c4a40]">
                    {highlightProduct.shortDescription ||
                      "San pham nay da san sang hien thi tren trang chu."}
                  </p>
                </div>
                <strong className="text-3xl">
                  {formatCurrency(highlightProduct.price)}
                </strong>
              </div>
            ) : (
              <SectionState
                title="Chua co san pham de noi bat"
                description="Khi co san pham active trong co so du lieu, khu vuc nay se cap nhat tu dong."
              />
            )}
          </aside>
        </div>
      </section>

      <SectionShell
        id="danh-muc"
        eyebrow="Danh muc"
        title="Khach hang co the bat dau mua sam theo nhom san pham."
      >
        {loading ? (
          <SectionState
            title="Dang tai danh muc"
            description="He thong dang lay du lieu that tu backend."
          />
        ) : categories.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard key={category._id} category={category} />
            ))}
          </div>
        ) : (
          <SectionState
            title="Chua co danh muc de hien thi"
            description="Hay them category active trong co so du lieu de khu vuc nay hien noi dung."
          />
        )}
      </SectionShell>

      <SectionShell
        id="noi-bat"
        eyebrow="Noi bat"
        title="San pham duoc danh dau noi bat se duoc uu tien xuat hien tai day."
      >
        {loading ? (
          <SectionState
            title="Dang tai san pham noi bat"
            description="Vui long doi trong giay lat."
          />
        ) : featuredProducts.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <SectionState
            title="Chua co san pham noi bat"
            description='Can co san pham `status: "active"` va `isFeatured: true` de hien thi tai day.'
          />
        )}
      </SectionShell>

      <SectionShell
        id="moi-nhat"
        eyebrow="Moi nhat"
        title="Bo suu tap moi duoc lay theo du lieu san pham vua tao gan day."
      >
        {loading ? (
          <SectionState
            title="Dang tai bo suu tap moi"
            description="Du lieu se hien thi ngay khi API tra ve."
          />
        ) : latestProducts.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {latestProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <SectionState
            title="Chua co san pham moi"
            description="Khi co product active trong database, danh sach nay se tu dong cap nhat."
          />
        )}
      </SectionShell>

      {error ? (
        <SectionShell
          id="loi-home"
          eyebrow="Thong bao"
          title="Trang chu gap van de khi tai du lieu."
        >
          <SectionState title="Khong tai duoc trang chu" description={error} />
        </SectionShell>
      ) : null}
    </main>
  );
}

export default Home;
