const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema(
  {
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null
    },
    originalName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true
    },
    filename: {
      type: String,
      required: [true, "Stored file name is required"],
      trim: true
    },
    mimeType: {
      type: String,
      required: [true, "Mime type is required"],
      trim: true
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    url: {
      type: String,
      required: [true, "File url is required"]
    },
    folder: {
      type: String,
      default: "cloudinary",
      trim: true
    },
    publicId: {
      type: String,
      default: "",
      trim: true
    },
    altText: {
      type: String,
      default: "",
      trim: true
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
    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      default: "image"
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

module.exports = mongoose.model("upload", uploadSchema);
