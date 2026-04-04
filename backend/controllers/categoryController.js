const Category = require("../schemas/category");
const slugify = require("../utils/slugify");

function sanitizeCategory(category) {
  return {
    _id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    parentCategory: category.parentCategory,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt
  };
}

async function listAdminCategories(_req, res, next) {
  try {
    const categories = await Category.find({ isDeleted: false })
      .populate("parentCategory", "name slug")
      .sort({ sortOrder: 1, createdAt: -1 });

    return res.status(200).json({
      categories: categories.map(sanitizeCategory)
    });
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const {
      name,
      slug,
      description,
      image,
      parentCategory,
      sortOrder,
      isActive
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Ten danh muc la bat buoc." });
    }

    const generatedSlug = slugify(slug || name);

    if (!generatedSlug) {
      return res.status(400).json({ message: "Slug danh muc khong hop le." });
    }

    const category = await Category.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description?.trim() || "",
      image: image?.trim() || "",
      parentCategory: parentCategory || null,
      sortOrder: Number(sortOrder) || 0,
      isActive: typeof isActive === "boolean" ? isActive : true
    });

    const populatedCategory = await Category.findById(category._id).populate(
      "parentCategory",
      "name slug"
    );

    return res.status(201).json({
      message: "Tao danh muc thanh cong.",
      category: sanitizeCategory(populatedCategory)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Ten hoac slug danh muc da ton tai."
      });
    }

    return next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const existingCategory = await Category.findOne({ _id: id, isDeleted: false });

    if (!existingCategory) {
      return res.status(404).json({ message: "Khong tim thay danh muc." });
    }

    const {
      name,
      slug,
      description,
      image,
      parentCategory,
      sortOrder,
      isActive
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Ten danh muc la bat buoc." });
    }

    const generatedSlug = slugify(slug || name);

    if (!generatedSlug) {
      return res.status(400).json({ message: "Slug danh muc khong hop le." });
    }

    existingCategory.name = name.trim();
    existingCategory.slug = generatedSlug;
    existingCategory.description = description?.trim() || "";
    existingCategory.image = image?.trim() || "";
    existingCategory.parentCategory = parentCategory || null;
    existingCategory.sortOrder = Number(sortOrder) || 0;
    existingCategory.isActive =
      typeof isActive === "boolean" ? isActive : existingCategory.isActive;

    await existingCategory.save();

    const populatedCategory = await Category.findById(existingCategory._id).populate(
      "parentCategory",
      "name slug"
    );

    return res.status(200).json({
      message: "Cap nhat danh muc thanh cong.",
      category: sanitizeCategory(populatedCategory)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Ten hoac slug danh muc da ton tai."
      });
    }

    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await Category.findOne({ _id: id, isDeleted: false });

    if (!category) {
      return res.status(404).json({ message: "Khong tim thay danh muc." });
    }

    category.isDeleted = true;
    category.isActive = false;
    await category.save();

    return res.status(200).json({
      message: "Xoa danh muc thanh cong."
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
