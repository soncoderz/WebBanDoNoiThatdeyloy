const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");
const {
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");
const {
  listAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

const router = express.Router();

router.use(authenticateToken, authorizeRoles("admin"));

router.get("/categories", listAdminCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/products", listAdminProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

module.exports = router;
