const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      unique: true,
      required: true
    },
    items: {
      type: [cartItemSchema],
      default: []
    },
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

cartSchema.pre("save", function () {
  this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalAmount = this.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
});

module.exports = mongoose.model("cart", cartSchema);
