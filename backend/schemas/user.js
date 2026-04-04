const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    street: {
      type: String,
      trim: true,
      default: ""
    },
    ward: {
      type: String,
      trim: true,
      default: ""
    },
    district: {
      type: String,
      trim: true,
      default: ""
    },
    city: {
      type: String,
      trim: true,
      default: ""
    },
    country: {
      type: String,
      trim: true,
      default: "Viet Nam"
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false
  }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    fullName: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    avatarUrl: {
      type: String,
      default: "https://i.sstatic.net/l60Hf.png"
    },
    role: {
      type: String,
      enum: ["admin", "customer"],
      default: "customer"
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active"
    },
    addresses: {
      type: [addressSchema],
      default: []
    },
    loginCount: {
      type: Number,
      default: 0,
      min: [0, "Login count cannot be negative"]
    },
    lastLoginAt: Date,
    forgotPasswordToken: String,
    forgotPasswordTokenExp: Date,
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();
  const rawPassword = update?.password || update?.$set?.password;

  if (rawPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    if (update.password) {
      update.password = hashedPassword;
    }

    if (update.$set?.password) {
      update.$set.password = hashedPassword;
    }
  }
});

userSchema.set("toJSON", {
  transform: function (_doc, ret) {
    delete ret.password;
    delete ret.googleId;
    delete ret.forgotPasswordToken;
    delete ret.forgotPasswordTokenExp;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("user", userSchema);
