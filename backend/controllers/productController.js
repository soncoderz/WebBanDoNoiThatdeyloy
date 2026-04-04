const Product = require("../schemas/product");
const slugify = require("../utils/slugify");

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => item.toString().trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function sanitizeProduct(product) {
  return {
    _id: product._id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    material: product.material,
    style: product.style,
    color: product.color,
    dimensions: product.dimensions,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    quantityInStock: product.quantityInStock,
    images: product.images,
    tags: product.tags,
    category: product.category,
    ratingAverage: product.ratingAverage,
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

async function listAdminProducts(_req, res, next) {
  try {
    const products = await Product.find({ isDeleted: false })
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      products: products.map(sanitizeProduct)
    });
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const {
      sku,
      name,
      slug,
      shortDescription,
      description,
      material,
      style,
      color,
      length,
      width,
      height,
      unit,
      price,
      compareAtPrice,
      quantityInStock,
      images,
      tags,
      category,
      isFeatured,
      status
    } = req.body;

    if (!sku?.trim() || !name?.trim() || !category) {
      return res.status(400).json({
        message: "SKU, ten san pham va danh muc la bat buoc."
      });
    }

    const generatedSlug = slugify(slug || name);

    if (!generatedSlug) {
      return res.status(400).json({ message: "Slug san pham khong hop le." });
    }

    const product = await Product.create({
      sku: sku.trim(),
      name: name.trim(),
      slug: generatedSlug,
      shortDescription: shortDescription?.trim() || "",
      description: description?.trim() || "",
      material: material?.trim() || "",
      style: style?.trim() || "",
      color: color?.trim() || "",
      dimensions: {
        length: parseNumber(length),
        width: parseNumber(width),
        height: parseNumber(height),
        unit: unit === "m" ? "m" : "cm"
      },
      price: parseNumber(price),
      compareAtPrice: parseNumber(compareAtPrice),
      quantityInStock: parseNumber(quantityInStock),
      images: parseArray(images),
      tags: parseArray(tags),
      category,
      isFeatured: Boolean(isFeatured),
      status: status || "active"
    });

    const populatedProduct = await Product.findById(product._id).populate(
      "category",
      "name slug"
    );

    return res.status(201).json({
      message: "Tao san pham thanh cong.",
      product: sanitizeProduct(populatedProduct)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "SKU, ten hoac slug san pham da ton tai."
      });
    }

    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, isDeleted: false });

    if (!product) {
      return res.status(404).json({ message: "Khong tim thay san pham." });
    }

    const {
      sku,
      name,
      slug,
      shortDescription,
      description,
      material,
      style,
      color,
      length,
      width,
      height,
      unit,
      price,
      compareAtPrice,
      quantityInStock,
      images,
      tags,
      category,
      isFeatured,
      status
    } = req.body;

    if (!sku?.trim() || !name?.trim() || !category) {
      return res.status(400).json({
        message: "SKU, ten san pham va danh muc la bat buoc."
      });
    }

    const generatedSlug = slugify(slug || name);

    if (!generatedSlug) {
      return res.status(400).json({ message: "Slug san pham khong hop le." });
    }

    product.sku = sku.trim();
    product.name = name.trim();
    product.slug = generatedSlug;
    product.shortDescription = shortDescription?.trim() || "";
    product.description = description?.trim() || "";
    product.material = material?.trim() || "";
    product.style = style?.trim() || "";
    product.color = color?.trim() || "";
    product.dimensions = {
      length: parseNumber(length),
      width: parseNumber(width),
      height: parseNumber(height),
      unit: unit === "m" ? "m" : "cm"
    };
    product.price = parseNumber(price);
    product.compareAtPrice = parseNumber(compareAtPrice);
    product.quantityInStock = parseNumber(quantityInStock);
    product.images = parseArray(images);
    product.tags = parseArray(tags);
    product.category = category;
    product.isFeatured = Boolean(isFeatured);
    product.status = status || "active";

    await product.save();

    const populatedProduct = await Product.findById(product._id).populate(
      "category",
      "name slug"
    );

    return res.status(200).json({
      message: "Cap nhat san pham thanh cong.",
      product: sanitizeProduct(populatedProduct)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "SKU, ten hoac slug san pham da ton tai."
      });
    }

    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, isDeleted: false });

    if (!product) {
      return res.status(404).json({ message: "Khong tim thay san pham." });
    }

    product.isDeleted = true;
    product.status = "archived";
    await product.save();

    return res.status(200).json({
      message: "Xoa san pham thanh cong."
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct
};
