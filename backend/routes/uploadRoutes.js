const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");
const { uploadImage } = require("../middlewares/upload");
const { uploadAdminImage } = require("../controllers/uploadController");

const router = express.Router();

router.post(
  "/image",
  authenticateToken,
  authorizeRoles("admin"),
  uploadImage.single("image"),
  uploadAdminImage
);

module.exports = router;
