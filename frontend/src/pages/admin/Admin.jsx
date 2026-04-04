import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { clearStoredSession } from "../../utils/storefront";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "");

const categoryInitialState = {
  id: "",
  name: "",
  description: "",
  image: "",
  parentCategory: "",
  sortOrder: 0,
  isActive: true,
};

const productInitialState = {
  id: "",
  sku: "",
  name: "",
  shortDescription: "",
  description: "",
  material: "",
  style: "",
  color: "",
  length: 0,
  width: 0,
  height: 0,
  unit: "cm",
  price: 0,
  compareAtPrice: 0,
  quantityInStock: 0,
  images: "",
  tags: "",
  category: "",
  isFeatured: false,
  status: "active",
};

function getStoredSession() {
  try {
    const rawSession = localStorage.getItem("auth_demo_session");
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

function headers(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function formatCurrency(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

function getAssetUrl(url = "") {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function inputClassName() {
  return "w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none";
}

function Admin() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getStoredSession());
  const [activeTab, setActiveTab] = useState("categories");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [uploadingProductImages, setUploadingProductImages] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoryForm, setCategoryForm] = useState(categoryInitialState);
  const [productForm, setProductForm] = useState(productInitialState);

  useEffect(() => {
    const currentSession = getStoredSession();

    if (!currentSession?.token || currentSession?.user?.role !== "admin") {
      navigate("/login");
      return;
    }

    setSession(currentSession);
  }, [navigate]);

  useEffect(() => {
    if (!session?.token || session?.user?.role !== "admin") {
      return;
    }

    async function syncAdminData() {
      try {
        setLoading(true);
        const config = headers(session.token);
        const [categoryResponse, productResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/categories`, config),
          axios.get(`${API_BASE_URL}/api/admin/products`, config),
        ]);

        setCategories(categoryResponse.data.categories || []);
        setProducts(productResponse.data.products || []);
      } catch (error) {
        setFeedback(
          error.response?.data?.message ||
            "Khong the tai du lieu quan tri luc nay.",
        );
      } finally {
        setLoading(false);
      }
    }

    syncAdminData();
  }, [session]);

  async function loadAdminData() {
    try {
      setLoading(true);
      const config = headers(session.token);
      const [categoryResponse, productResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/categories`, config),
        axios.get(`${API_BASE_URL}/api/admin/products`, config),
      ]);

      setCategories(categoryResponse.data.categories || []);
      setProducts(productResponse.data.products || []);
    } catch (error) {
      setFeedback(
        error.response?.data?.message ||
          "Khong the tai du lieu quan tri luc nay.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateCategoryForm(field, value) {
    setCategoryForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateProductForm(field, value) {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetCategoryForm() {
    setCategoryForm(categoryInitialState);
  }

  function resetProductForm() {
    setProductForm(productInitialState);
  }

  function fillCategoryForm(category) {
    setCategoryForm({
      id: category._id,
      name: category.name || "",
      description: category.description || "",
      image: category.image || "",
      parentCategory: category.parentCategory?._id || "",
      sortOrder: category.sortOrder || 0,
      isActive: Boolean(category.isActive),
    });
    setActiveTab("categories");
    setFeedback(`Dang chinh sua danh muc: ${category.name}`);
  }

  function fillProductForm(product) {
    setProductForm({
      id: product._id,
      sku: product.sku || "",
      name: product.name || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      material: product.material || "",
      style: product.style || "",
      color: product.color || "",
      length: product.dimensions?.length || 0,
      width: product.dimensions?.width || 0,
      height: product.dimensions?.height || 0,
      unit: product.dimensions?.unit || "cm",
      price: product.price || 0,
      compareAtPrice: product.compareAtPrice || 0,
      quantityInStock: product.quantityInStock || 0,
      images: Array.isArray(product.images) ? product.images.join(", ") : "",
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      category: product.category?._id || "",
      isFeatured: Boolean(product.isFeatured),
      status: product.status || "active",
    });
    setActiveTab("products");
    setFeedback(`Dang chinh sua san pham: ${product.name}`);
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");

    try {
      const payload = {
        ...categoryForm,
        sortOrder: Number(categoryForm.sortOrder) || 0,
      };

      if (categoryForm.id) {
        await axios.put(
          `${API_BASE_URL}/api/admin/categories/${categoryForm.id}`,
          payload,
          headers(session.token),
        );
        setFeedback("Cap nhat danh muc thanh cong.");
      } else {
        await axios.post(
          `${API_BASE_URL}/api/admin/categories`,
          payload,
          headers(session.token),
        );
        setFeedback("Tao danh muc thanh cong.");
      }

      resetCategoryForm();
      await loadAdminData();
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Khong the luu danh muc luc nay.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");

    try {
      const payload = {
        ...productForm,
        length: Number(productForm.length) || 0,
        width: Number(productForm.width) || 0,
        height: Number(productForm.height) || 0,
        price: Number(productForm.price) || 0,
        compareAtPrice: Number(productForm.compareAtPrice) || 0,
        quantityInStock: Number(productForm.quantityInStock) || 0,
      };

      if (productForm.id) {
        await axios.put(
          `${API_BASE_URL}/api/admin/products/${productForm.id}`,
          payload,
          headers(session.token),
        );
        setFeedback("Cap nhat san pham thanh cong.");
      } else {
        await axios.post(
          `${API_BASE_URL}/api/admin/products`,
          payload,
          headers(session.token),
        );
        setFeedback("Tao san pham thanh cong.");
      }

      resetProductForm();
      await loadAdminData();
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Khong the luu san pham luc nay.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCategory(id) {
    if (!window.confirm("Ban co chac muon xoa danh muc nay?")) {
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/admin/categories/${id}`,
        headers(session.token),
      );
      setFeedback("Xoa danh muc thanh cong.");
      if (categoryForm.id === id) {
        resetCategoryForm();
      }
      await loadAdminData();
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Khong the xoa danh muc luc nay.",
      );
    }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm("Ban co chac muon xoa san pham nay?")) {
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/admin/products/${id}`,
        headers(session.token),
      );
      setFeedback("Xoa san pham thanh cong.");
      if (productForm.id === id) {
        resetProductForm();
      }
      await loadAdminData();
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Khong the xoa san pham luc nay.",
      );
    }
  }

  async function handleCategoryImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingCategoryImage(true);
      setFeedback("");

      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", "categories");

      const response = await axios.post(
        `${API_BASE_URL}/api/uploads/image`,
        formData,
        {
          ...headers(session.token),
          headers: {
            ...headers(session.token).headers,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      updateCategoryForm("image", response.data.file.url);
      setFeedback("Upload anh danh muc thanh cong.");
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Khong the upload anh danh muc."
      );
    } finally {
      setUploadingCategoryImage(false);
      event.target.value = "";
    }
  }

  async function handleProductImagesUpload(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    try {
      setUploadingProductImages(true);
      setFeedback("");

      const uploadedUrls = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("folder", "products");

        const response = await axios.post(
          `${API_BASE_URL}/api/uploads/image`,
          formData,
          {
            ...headers(session.token),
            headers: {
              ...headers(session.token).headers,
              "Content-Type": "multipart/form-data"
            }
          }
        );

        uploadedUrls.push(response.data.file.url);
      }

      const existingUrls = productForm.images
        ? productForm.images
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

      updateProductForm("images", [...existingUrls, ...uploadedUrls].join(", "));
      setFeedback("Upload anh san pham thanh cong.");
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Khong the upload anh san pham."
      );
    } finally {
      setUploadingProductImages(false);
      event.target.value = "";
    }
  }

  function handleLogout() {
    clearStoredSession();
    navigate("/login");
  }

  if (!session?.token || session?.user?.role !== "admin") {
    return null;
  }

  return (
    <main className="min-h-screen px-3 py-4 text-[#2f241f] md:px-6 md:py-6">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6">
        <section className="rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.88)] p-6 shadow-[0_20px_60px_rgba(79,52,35,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-3 text-xs tracking-[0.18em] text-[#8b6243] uppercase">
                Quan tri he thong
              </p>
              <h1 className="text-4xl leading-none font-semibold md:text-6xl">
                Admin dashboard cho category va product.
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/"
                className="rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2.5 font-semibold no-underline"
              >
                Ve home
              </Link>
              <div className="rounded-full bg-[#2f241f] px-4 py-2.5 font-semibold text-[#fff8f0]">
                {session.user.fullName || session.user.username}
              </div>
              <button
                type="button"
                className="rounded-full bg-[#f3e5d7] px-4 py-2.5 font-semibold text-[#5a4336]"
                onClick={handleLogout}
              >
                Dang xuat
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-5">
              <p className="text-sm text-[#8b6243]">Danh muc</p>
              <strong className="mt-2 block text-3xl">{categories.length}</strong>
            </div>
            <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-5">
              <p className="text-sm text-[#8b6243]">San pham</p>
              <strong className="mt-2 block text-3xl">{products.length}</strong>
            </div>
            <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-5">
              <p className="text-sm text-[#8b6243]">Noi bat</p>
              <strong className="mt-2 block text-3xl">
                {products.filter((product) => product.isFeatured).length}
              </strong>
            </div>
          </div>

          {feedback ? (
            <div className="mt-5 rounded-2xl bg-[#f5ebde] px-4 py-3 text-[#734d36]">
              {feedback}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.88)] p-6 shadow-[0_20px_60px_rgba(79,52,35,0.08)]">
            <div className="grid grid-cols-2 gap-2 rounded-full bg-[#f2e7d7] p-1.5">
              <button
                type="button"
                className={`rounded-full px-4 py-3 font-bold ${
                  activeTab === "categories"
                    ? "bg-[#2f241f] text-[#fff8f2]"
                    : "text-[#7a5b47]"
                }`}
                onClick={() => setActiveTab("categories")}
              >
                Category
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-3 font-bold ${
                  activeTab === "products"
                    ? "bg-[#2f241f] text-[#fff8f2]"
                    : "text-[#7a5b47]"
                }`}
                onClick={() => setActiveTab("products")}
              >
                Product
              </button>
            </div>

            {activeTab === "categories" ? (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    {categoryForm.id ? "Sua danh muc" : "Tao danh muc"}
                  </h2>
                  <button
                    type="button"
                    className="rounded-full border border-[rgba(95,63,42,0.14)] px-3 py-2 text-sm"
                    onClick={resetCategoryForm}
                  >
                    Lam moi
                  </button>
                </div>
                <form className="grid gap-4" onSubmit={handleCategorySubmit}>
                  <Field label="Ten danh muc">
                    <input className={inputClassName()} value={categoryForm.name} onChange={(event) => updateCategoryForm("name", event.target.value)} required />
                  </Field>
                  <Field label="Mo ta">
                    <textarea className={`${inputClassName()} min-h-28`} value={categoryForm.description} onChange={(event) => updateCategoryForm("description", event.target.value)} />
                  </Field>
                  <Field label="Anh URL">
                    <input className={inputClassName()} value={categoryForm.image} onChange={(event) => updateCategoryForm("image", event.target.value)} />
                  </Field>
                  <div className="rounded-2xl border border-dashed border-[rgba(95,63,42,0.18)] bg-white/70 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">Upload anh tu may tinh</p>
                        <p className="text-sm text-[#6a564b]">
                          File se duoc luu tren Cloudinary trong folder `categories`.
                        </p>
                      </div>
                      <label className="cursor-pointer rounded-full bg-[#2f241f] px-4 py-2.5 text-sm font-semibold text-[#fff8f0]">
                        {uploadingCategoryImage ? "Dang upload..." : "Chon anh"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCategoryImageUpload}
                          disabled={uploadingCategoryImage}
                        />
                      </label>
                    </div>
                    {categoryForm.image ? (
                      <img
                        className="mt-4 h-40 w-full rounded-2xl object-cover"
                        src={getAssetUrl(categoryForm.image)}
                        alt="Category preview"
                      />
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Danh muc cha">
                      <select className={inputClassName()} value={categoryForm.parentCategory} onChange={(event) => updateCategoryForm("parentCategory", event.target.value)}>
                        <option value="">Khong co</option>
                        {categories.filter((item) => item._id !== categoryForm.id).map((item) => (
                          <option key={item._id} value={item._id}>{item.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Thu tu">
                      <input className={inputClassName()} type="number" value={categoryForm.sortOrder} onChange={(event) => updateCategoryForm("sortOrder", event.target.value)} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3">
                    <input type="checkbox" checked={categoryForm.isActive} onChange={(event) => updateCategoryForm("isActive", event.target.checked)} />
                    <span>Dang hoat dong</span>
                  </label>
                  <button type="submit" className="rounded-2xl bg-[#2f241f] px-4 py-4 font-bold text-[#fff8f0] disabled:opacity-70" disabled={submitting}>
                    {submitting ? "Dang luu..." : categoryForm.id ? "Cap nhat danh muc" : "Tao danh muc"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    {productForm.id ? "Sua san pham" : "Tao san pham"}
                  </h2>
                  <button
                    type="button"
                    className="rounded-full border border-[rgba(95,63,42,0.14)] px-3 py-2 text-sm"
                    onClick={resetProductForm}
                  >
                    Lam moi
                  </button>
                </div>
                <form className="grid gap-4" onSubmit={handleProductSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="SKU">
                      <input className={inputClassName()} value={productForm.sku} onChange={(event) => updateProductForm("sku", event.target.value)} required />
                    </Field>
                    <Field label="Ten san pham">
                      <input className={inputClassName()} value={productForm.name} onChange={(event) => updateProductForm("name", event.target.value)} required />
                    </Field>
                  </div>
                  <Field label="Mo ta ngan">
                    <textarea className={`${inputClassName()} min-h-24`} value={productForm.shortDescription} onChange={(event) => updateProductForm("shortDescription", event.target.value)} />
                  </Field>
                  <Field label="Mo ta chi tiet">
                    <textarea className={`${inputClassName()} min-h-32`} value={productForm.description} onChange={(event) => updateProductForm("description", event.target.value)} />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Chat lieu">
                      <input className={inputClassName()} value={productForm.material} onChange={(event) => updateProductForm("material", event.target.value)} />
                    </Field>
                    <Field label="Phong cach">
                      <input className={inputClassName()} value={productForm.style} onChange={(event) => updateProductForm("style", event.target.value)} />
                    </Field>
                    <Field label="Mau sac">
                      <input className={inputClassName()} value={productForm.color} onChange={(event) => updateProductForm("color", event.target.value)} />
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Dai"><input className={inputClassName()} type="number" value={productForm.length} onChange={(event) => updateProductForm("length", event.target.value)} /></Field>
                    <Field label="Rong"><input className={inputClassName()} type="number" value={productForm.width} onChange={(event) => updateProductForm("width", event.target.value)} /></Field>
                    <Field label="Cao"><input className={inputClassName()} type="number" value={productForm.height} onChange={(event) => updateProductForm("height", event.target.value)} /></Field>
                    <Field label="Don vi">
                      <select className={inputClassName()} value={productForm.unit} onChange={(event) => updateProductForm("unit", event.target.value)}>
                        <option value="cm">cm</option>
                        <option value="m">m</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Gia ban"><input className={inputClassName()} type="number" value={productForm.price} onChange={(event) => updateProductForm("price", event.target.value)} required /></Field>
                    <Field label="Gia so sanh"><input className={inputClassName()} type="number" value={productForm.compareAtPrice} onChange={(event) => updateProductForm("compareAtPrice", event.target.value)} /></Field>
                    <Field label="Ton kho"><input className={inputClassName()} type="number" value={productForm.quantityInStock} onChange={(event) => updateProductForm("quantityInStock", event.target.value)} /></Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Danh muc">
                      <select className={inputClassName()} value={productForm.category} onChange={(event) => updateProductForm("category", event.target.value)} required>
                        <option value="">Chon danh muc</option>
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>{category.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Trang thai">
                      <select className={inputClassName()} value={productForm.status} onChange={(event) => updateProductForm("status", event.target.value)}>
                        <option value="draft">draft</option>
                        <option value="active">active</option>
                        <option value="out_of_stock">out_of_stock</option>
                        <option value="archived">archived</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Images URL, cach nhau boi dau phay">
                    <textarea className={`${inputClassName()} min-h-24`} value={productForm.images} onChange={(event) => updateProductForm("images", event.target.value)} />
                  </Field>
                  <div className="rounded-2xl border border-dashed border-[rgba(95,63,42,0.18)] bg-white/70 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">Upload anh san pham tu may tinh</p>
                        <p className="text-sm text-[#6a564b]">
                          File se duoc luu tren Cloudinary trong folder `products`.
                        </p>
                      </div>
                      <label className="cursor-pointer rounded-full bg-[#2f241f] px-4 py-2.5 text-sm font-semibold text-[#fff8f0]">
                        {uploadingProductImages ? "Dang upload..." : "Chon anh"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleProductImagesUpload}
                          disabled={uploadingProductImages}
                        />
                      </label>
                    </div>
                    {productForm.images ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {productForm.images
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((imageUrl) => (
                            <img
                              key={imageUrl}
                              className="h-32 w-full rounded-2xl object-cover"
                              src={getAssetUrl(imageUrl)}
                              alt="Product preview"
                            />
                          ))}
                      </div>
                    ) : null}
                  </div>
                  <Field label="Tags, cach nhau boi dau phay">
                    <input className={inputClassName()} value={productForm.tags} onChange={(event) => updateProductForm("tags", event.target.value)} />
                  </Field>
                  <label className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3">
                    <input type="checkbox" checked={productForm.isFeatured} onChange={(event) => updateProductForm("isFeatured", event.target.checked)} />
                    <span>Danh dau noi bat</span>
                  </label>
                  <button type="submit" className="rounded-2xl bg-[#2f241f] px-4 py-4 font-bold text-[#fff8f0] disabled:opacity-70" disabled={submitting}>
                    {submitting ? "Dang luu..." : productForm.id ? "Cap nhat san pham" : "Tao san pham"}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="grid gap-6">
            <section className="rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.88)] p-6 shadow-[0_20px_60px_rgba(79,52,35,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Danh sach category</h2>
                <span className="text-sm text-[#8b6243]">
                  {loading ? "Dang tai..." : `${categories.length} muc`}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="text-sm text-[#8b6243]">
                      <th className="pb-3">Ten</th>
                      <th className="pb-3">Slug</th>
                      <th className="pb-3">Trang thai</th>
                      <th className="pb-3 text-right">Tac vu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category._id} className="border-t border-[rgba(95,63,42,0.08)]">
                        <td className="py-3">
                          <div className="font-semibold">{category.name}</div>
                          <div className="text-sm text-[#6a564b]">
                            {category.parentCategory?.name || "Danh muc goc"}
                          </div>
                        </td>
                        <td className="py-3 text-sm">{category.slug}</td>
                        <td className="py-3 text-sm">{category.isActive ? "active" : "inactive"}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="rounded-full bg-[#f3e5d7] px-3 py-2 text-sm" onClick={() => fillCategoryForm(category)}>Sua</button>
                            <button type="button" className="rounded-full bg-[#2f241f] px-3 py-2 text-sm text-[#fff8f0]" onClick={() => handleDeleteCategory(category._id)}>Xoa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.88)] p-6 shadow-[0_20px_60px_rgba(79,52,35,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Danh sach product</h2>
                <span className="text-sm text-[#8b6243]">
                  {loading ? "Dang tai..." : `${products.length} san pham`}
                </span>
              </div>
              <div className="grid gap-4">
                {products.map((product) => (
                  <article key={product._id} className="rounded-3xl border border-[rgba(95,63,42,0.08)] bg-white/75 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm tracking-[0.08em] text-[#8b6243] uppercase">
                          {product.category?.name || "Chua phan loai"}
                        </div>
                        <h3 className="mt-2 text-xl font-semibold">{product.name}</h3>
                        <p className="mt-2 text-sm leading-7 text-[#655247]">
                          {product.shortDescription || "San pham chua co mo ta ngan."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#5c4a40]">
                          <span className="rounded-full bg-[#f6ecdd] px-3 py-1">SKU: {product.sku}</span>
                          <span className="rounded-full bg-[#f6ecdd] px-3 py-1">{product.status}</span>
                          {product.isFeatured ? (
                            <span className="rounded-full bg-[#2f241f] px-3 py-1 text-[#fff8f0]">Noi bat</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex min-w-[220px] flex-col items-start gap-3 lg:items-end">
                        <strong className="text-xl">{formatCurrency(product.price)}</strong>
                        <div className="text-sm text-[#6a564b]">Ton kho: {product.quantityInStock}</div>
                        <div className="flex gap-2">
                          <button type="button" className="rounded-full bg-[#f3e5d7] px-3 py-2 text-sm" onClick={() => fillProductForm(product)}>Sua</button>
                          <button type="button" className="rounded-full bg-[#2f241f] px-3 py-2 text-sm text-[#fff8f0]" onClick={() => handleDeleteProduct(product._id)}>Xoa</button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Admin;
