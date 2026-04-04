import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, getStoredSessionUser, requestAuthJson } from "../utils/storefront";

function StoreHeader() {
  const [sessionUser, setSessionUser] = useState(() => getStoredSessionUser());
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    async function syncHeaderState() {
      const nextUser = getStoredSessionUser();
      setSessionUser(nextUser);

      if (!nextUser || nextUser.role !== "customer") {
        setCartCount(0);
        return;
      }

      try {
        const data = await requestAuthJson(`${API_BASE_URL}/api/shop/cart`);
        setCartCount(data?.cart?.totalQuantity || 0);
      } catch {
        setCartCount(0);
      }
    }

    syncHeaderState();

    window.addEventListener("storage", syncHeaderState);
    window.addEventListener("auth-session-changed", syncHeaderState);
    window.addEventListener("cart-changed", syncHeaderState);

    return () => {
      window.removeEventListener("storage", syncHeaderState);
      window.removeEventListener("auth-session-changed", syncHeaderState);
      window.removeEventListener("cart-changed", syncHeaderState);
    };
  }, []);

  return (
    <header className="mb-6 flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
      <Link
        className="text-base font-extrabold tracking-[0.06em] uppercase no-underline"
        to="/"
      >
        Tiem Do Trang Tri Noi That
      </Link>

      <nav className="flex flex-wrap gap-3 max-md:w-full">
        <Link
          className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline max-md:w-full"
          to="/"
        >
          Trang chu
        </Link>
        <Link
          className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline max-md:w-full"
          to="/san-pham"
        >
          San pham
        </Link>
        {sessionUser?.role === "customer" ? (
          <Link
            className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline max-md:w-full"
            to="/gio-hang"
          >
            Gio hang ({cartCount})
          </Link>
        ) : null}
        {sessionUser?.role === "admin" ? (
          <Link
            to="/admin"
            className="rounded-full border border-[rgba(95,63,42,0.1)] bg-[#f3e5d7] px-4 py-2.5 font-semibold no-underline max-md:w-full"
          >
            Quan tri
          </Link>
        ) : null}
        <Link
          to="/login"
          className={`rounded-full px-4 py-2.5 no-underline max-md:w-full ${
            sessionUser
              ? "bg-[#2f241f] font-bold text-[#fff8f0]"
              : "border border-[rgba(95,63,42,0.1)] bg-white/75"
          }`}
        >
          {sessionUser ? sessionUser.fullName || sessionUser.username : "Dang nhap"}
        </Link>
      </nav>
    </header>
  );
}

export default StoreHeader;
