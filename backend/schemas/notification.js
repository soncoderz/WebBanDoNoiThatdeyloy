const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true
    },
    message: {
      type: String,
      required: [true, "Notification message is required"]
    },
    type: {
      type: String,
      enum: ["order", "promotion", "system", "review"],
      default: "system"
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    socketRoom: {
      type: String,
      default: ""
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("notification", notificationSchema);
