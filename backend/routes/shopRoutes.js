const express = require("express");
const {
  addToCart,
  checkout,
  clearCartItems,
  getCart,
  getOrderDetail,
  handleMomoPaymentResult,
  removeCartItem,
  updateCartItem
} = require("../controllers/shopController");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

router.post("/payments/momo/ipn", handleMomoPaymentResult);
router.post("/payments/momo/return", handleMomoPaymentResult);

router.use(authenticateToken);

router.get("/cart", getCart);
router.post("/cart/items", addToCart);
router.patch("/cart/items/:productId", updateCartItem);
router.delete("/cart/items/:productId", removeCartItem);
router.delete("/cart", clearCartItems);
router.post("/checkout", checkout);
router.get("/orders/:orderCode", getOrderDetail);

module.exports = router;
