const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      default: null
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      default: "",
      trim: true
    },
    content: {
      type: String,
      default: ""
    },
    images: {
      type: [String],
      default: []
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false
    },
    isHidden: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("review", reviewSchema);
