const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    productSlug: {
      type: String,
      default: "",
      trim: true
    },
    productImage: {
      type: String,
      default: ""
    },
    sku: {
      type: String,
      default: "",
      trim: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    lineTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    note: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

orderItemSchema.pre("save", function () {
  this.lineTotal = this.unitPrice * this.quantity;
});

orderItemSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};
  const unitPrice = update.unitPrice ?? update.$set?.unitPrice;
  const quantity = update.quantity ?? update.$set?.quantity;

  if (unitPrice !== undefined && quantity !== undefined) {
    if (update.$set) {
      update.$set.lineTotal = unitPrice * quantity;
    } else {
      update.lineTotal = unitPrice * quantity;
    }
  }

});

module.exports = mongoose.model("orderItem", orderItemSchema);
