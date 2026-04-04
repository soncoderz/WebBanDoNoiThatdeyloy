import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Admin from "./pages/admin/Admin";
import Cart from "./pages/cart/Cart";
import CategoryProducts from "./pages/category-products/CategoryProducts";
import Login from "./pages/login/Login";
import Home from "./pages/home/Home";
import MomoReturn from "./pages/momo-return/MomoReturn";
import ProductDetail from "./pages/product-detail/ProductDetail";
import Products from "./pages/products/Products";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/gio-hang" element={<Cart />} />
        <Route path="/thanh-toan/momo" element={<MomoReturn />} />
        <Route path="/san-pham" element={<Products />} />
        <Route path="/san-pham/:slug" element={<ProductDetail />} />
        <Route path="/danh-muc/:slug" element={<CategoryProducts />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;

