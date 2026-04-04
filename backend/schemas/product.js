const mongoose = require("mongoose");

const productDimensionSchema = new mongoose.Schema(
  {
    length: {
      type: Number,
      default: 0,
      min: 0
    },
    width: {
      type: Number,
      default: 0,
      min: 0
    },
    height: {
      type: Number,
      default: 0,
      min: 0
    },
    unit: {
      type: String,
      enum: ["cm", "m"],
      default: "cm"
    }
  },
  {
    _id: false
  }
);

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: [true, "Product slug is required"],
      unique: true,
      trim: true
    },
    shortDescription: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    material: {
      type: String,
      default: ""
    },
    style: {
      type: String,
      default: ""
    },
    color: {
      type: String,
      default: ""
    },
    dimensions: {
      type: productDimensionSchema,
      default: () => ({})
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    compareAtPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    quantityInStock: {
      type: Number,
      default: 0,
      min: 0
    },
    images: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["draft", "active", "out_of_stock", "archived"],
      default: "active"
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("product", productSchema);
