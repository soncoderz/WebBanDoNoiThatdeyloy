const Category = require("../schemas/category");
const Product = require("../schemas/product");

function parsePositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return fallbackValue;
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapCategory(category) {
  return {
    _id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    parentCategory: category.parentCategory
      ? {
          _id: category.parentCategory._id,
          name: category.parentCategory.name,
          slug: category.parentCategory.slug
        }
      : null,
    updatedAt: category.updatedAt
  };
}

function mapProduct(product) {
  return {
    _id: product._id,
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
    ratingAverage: product.ratingAverage,
    reviewCount: product.reviewCount,
    sku: product.sku,
    status: product.status,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    category: product.category
      ? {
          _id: product.category._id,
          name: product.category.name,
          slug: product.category.slug
        }
      : null
  };
}

async function getHomeData(_req, res, next) {
  try {
    const [categories, featuredProducts, latestProducts] = await Promise.all([
      Category.find({
        isActive: true,
        isDeleted: false
      })
        .sort({ sortOrder: 1, updatedAt: -1 })
        .limit(6),
      Product.find({
        status: "active",
        isDeleted: false,
        isFeatured: true
      })
        .populate("category", "name slug")
        .sort({ updatedAt: -1 })
        .limit(8),
      Product.find({
        status: "active",
        isDeleted: false
      })
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .limit(8)
    ]);

    return res.status(200).json({
      categories: categories.map(mapCategory),
      featuredProducts: featuredProducts.map(mapProduct),
      latestProducts: latestProducts.map(mapProduct)
    });
  } catch (error) {
    return next(error);
  }
}

async function getProductDetail(req, res, next) {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      status: "active",
      isDeleted: false
    }).populate("category", "name slug");

    if (!product) {
      return res.status(404).json({ message: "Khong tim thay san pham." });
    }

    return res.status(200).json({
      product: mapProduct(product)
    });
  } catch (error) {
    return next(error);
  }
}

async function getCategoryProducts(req, res, next) {
  try {
    const searchQuery =
      typeof req.query.q === "string" ? req.query.q.trim() : "";
    const requestedPage = parsePositiveInteger(req.query.page, 1);
    const requestedLimit = Math.min(parsePositiveInteger(req.query.limit, 6), 24);
    const searchRegex = searchQuery
      ? new RegExp(escapeRegex(searchQuery), "i")
      : null;
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
      isDeleted: false
    }).populate("parentCategory", "name slug");

    if (!category) {
      return res.status(404).json({ message: "Khong tim thay danh muc." });
    }

    const baseProductFilter = {
      category: category._id,
      status: "active",
      isDeleted: false
    };
    const productFilter = searchQuery
      ? {
          ...baseProductFilter,
          $or: [
            { name: searchRegex },
            { sku: searchRegex },
            { shortDescription: searchRegex },
            { material: searchRegex },
            { style: searchRegex },
            { color: searchRegex },
            { tags: searchRegex }
          ]
        }
      : baseProductFilter;
    const [categoryProductCount, matchingProductCount] = await Promise.all([
      Product.countDocuments(baseProductFilter),
      Product.countDocuments(productFilter)
    ]);
    const totalPages = Math.max(
      Math.ceil(matchingProductCount / requestedLimit),
      1
    );
    const currentPage = Math.min(requestedPage, totalPages);
    const products = await Product.find(productFilter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * requestedLimit)
      .limit(requestedLimit);

    return res.status(200).json({
      category: mapCategory(category),
      products: products.map(mapProduct),
      filters: {
        q: searchQuery
      },
      totals: {
        categoryProducts: categoryProductCount,
        matchingProducts: matchingProductCount
      },
      pagination: {
        page: currentPage,
        limit: requestedLimit,
        totalItems: matchingProductCount,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getAllProducts(req, res, next) {
  try {
    const searchQuery =
      typeof req.query.q === "string" ? req.query.q.trim() : "";
    const requestedPage = parsePositiveInteger(req.query.page, 1);
    const requestedLimit = Math.min(parsePositiveInteger(req.query.limit, 12), 24);
    const searchRegex = searchQuery
      ? new RegExp(escapeRegex(searchQuery), "i")
      : null;

    const baseFilter = {
      status: "active",
      isDeleted: false
    };
    const productFilter = searchRegex
      ? { ...baseFilter, name: searchRegex }
      : baseFilter;

    const totalItems = await Product.countDocuments(productFilter);
    const totalPages = Math.max(Math.ceil(totalItems / requestedLimit), 1);
    const currentPage = Math.min(requestedPage, totalPages);

    const products = await Product.find(productFilter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * requestedLimit)
      .limit(requestedLimit);

    return res.status(200).json({
      products: products.map(mapProduct),
      pagination: {
        page: currentPage,
        limit: requestedLimit,
        totalItems,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHomeData,
  getProductDetail,
  getCategoryProducts,
  getAllProducts
};
