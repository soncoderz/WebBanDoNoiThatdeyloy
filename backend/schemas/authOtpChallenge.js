const mongoose = require("mongoose");

const authOtpChallengeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    googleId: {
      type: String,
      required: true,
      trim: true
    },
    fullName: {
      type: String,
      trim: true,
      default: ""
    },
    avatarUrl: {
      type: String,
      default: ""
    },
    otpHash: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    },
    consumedAt: Date
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("authOtpChallenge", authOtpChallengeSchema);
