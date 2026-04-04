const mongoose = require("mongoose");

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    street: {
      type: String,
      required: true,
      trim: true
    },
    ward: {
      type: String,
      default: "",
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: "Viet Nam",
      trim: true
    }
  },
  {
    _id: false
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: [true, "Order code is required"],
      unique: true,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    items: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "orderItem",
      default: []
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "momo", "vnpay"],
      default: "cod"
    },
    paymentProvider: {
      type: String,
      default: ""
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    paymentReference: {
      type: String,
      default: "",
      trim: true
    },
    paymentRedirectUrl: {
      type: String,
      default: ""
    },
    paymentTransactionId: {
      type: String,
      default: "",
      trim: true
    },
    paymentResponseCode: {
      type: Number,
      default: null
    },
    paymentMessage: {
      type: String,
      default: ""
    },
    paymentProviderData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "shipping", "completed", "cancelled"],
      default: "pending"
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    note: {
      type: String,
      default: ""
    },
    placedAt: {
      type: Date,
      default: Date.now
    },
    paidAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("order", orderSchema);
