const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const AuthOtpChallenge = require("../schemas/authOtpChallenge");
const User = require("../schemas/user");
const { sendMail } = require("../utils/mailer");
const slugify = require("../utils/slugify");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const MAX_OTP_ATTEMPTS = 5;

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function sanitizeUser(user) {
  return user.toJSON();
}

function createRandomPassword() {
  return crypto.randomBytes(24).toString("hex");
}

function generateOtp() {
  const otpLength = Math.max(4, Number(process.env.OTP_LENGTH || 6));
  const min = 10 ** (otpLength - 1);
  const max = 10 ** otpLength - 1;

  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function getOtpExpiryMinutes() {
  return Math.max(1, Number(process.env.OTP_EXPIRES_MINUTES || 5));
}

function maskEmail(email) {
  const [localPart = "", domainPart = ""] = String(email).split("@");

  if (!localPart || !domainPart) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}*@${domainPart}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(
    Math.max(2, localPart.length - 2)
  )}@${domainPart}`;
}

async function buildUniqueUsername(sourceValue) {
  const rawBase = slugify(sourceValue) || "google-user";
  const base = rawBase.slice(0, 24) || "google-user";
  let suffix = 0;
  let candidate = base;

  while (await User.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base.slice(0, Math.max(1, 24 - String(suffix).length - 1))}-${suffix}`;
  }

  return candidate;
}

async function verifyGoogleCredential(credential) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email) {
    throw new Error("Google credential khong hop le.");
  }

  if (payload.email_verified === false) {
    throw new Error("Email Google chua duoc xac minh.");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    fullName: payload.name?.trim() || "",
    avatarUrl: payload.picture || ""
  };
}

async function sendOtpEmail({ email, otp }) {
  const otpExpiryMinutes = getOtpExpiryMinutes();
  const subject = "Ma OTP dang nhap";
  const text = `Ma OTP cua ban la ${otp}. Ma se het han sau ${otpExpiryMinutes} phut.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #2f241f;">
      <h2 style="margin-bottom: 12px;">Xac minh dang nhap Google</h2>
      <p style="margin-bottom: 16px;">Su dung ma OTP ben duoi de hoan tat dang nhap.</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f6efe4; padding: 16px 20px; border-radius: 16px; display: inline-block;">
        ${otp}
      </div>
      <p style="margin-top: 16px;">Ma co hieu luc trong ${otpExpiryMinutes} phut.</p>
      <p style="margin-top: 16px; color: #6b564b;">Neu ban khong yeu cau dang nhap, hay bo qua email nay.</p>
    </div>
  `;

  await sendMail({
    to: email,
    subject,
    text,
    html
  });
}

async function findOrCreateGoogleUser(challenge) {
  const email = challenge.email.toLowerCase().trim();
  let user = await User.findOne({
    $or: [{ email }, { googleId: challenge.googleId }]
  });

  if (user) {
    if (user.status !== "active") {
      throw new Error("Tai khoan hien khong the dang nhap.");
    }

    let hasChanges = false;

    if (!user.googleId) {
      user.googleId = challenge.googleId;
      hasChanges = true;
    }

    if (!user.fullName && challenge.fullName) {
      user.fullName = challenge.fullName;
      hasChanges = true;
    }

    if (
      (!user.avatarUrl ||
        user.avatarUrl === "https://i.sstatic.net/l60Hf.png") &&
      challenge.avatarUrl
    ) {
      user.avatarUrl = challenge.avatarUrl;
      hasChanges = true;
    }

    user.lastLoginAt = new Date();
    user.loginCount += 1;
    hasChanges = true;

    if (hasChanges) {
      await user.save();
    }

    return user;
  }

  const username = await buildUniqueUsername(
    challenge.fullName || challenge.email.split("@")[0]
  );

  user = await User.create({
    username,
    email,
    googleId: challenge.googleId,
    password: createRandomPassword(),
    fullName: challenge.fullName,
    avatarUrl: challenge.avatarUrl,
    role: "customer",
    status: "active",
    loginCount: 1,
    lastLoginAt: new Date()
  });

  return user;
}

async function register(req, res) {
  try {
    const { username, email, password, fullName, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email va password la bat buoc."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password phai co it nhat 6 ky tu."
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }]
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email hoac username da ton tai."
      });
    }

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      fullName: fullName?.trim() || "",
      phone: phone?.trim() || "",
      role: "customer"
    });

    const token = createToken(user._id.toString());

    return res.status(201).json({
      message: "Dang ky thanh cong.",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Khong the dang ky tai khoan.",
      error: error.message
    });
  }
}

async function login(req, res) {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        message: "Thong tin dang nhap khong du."
      });
    }

    const normalizedValue = emailOrUsername.trim();
    const user = await User.findOne({
      $or: [
        { email: normalizedValue.toLowerCase() },
        { username: normalizedValue }
      ]
    });

    if (!user) {
      return res.status(401).json({
        message: "Tai khoan hoac mat khau khong dung."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Tai khoan hien khong the dang nhap."
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Tai khoan hoac mat khau khong dung."
      });
    }

    user.loginCount += 1;
    user.lastLoginAt = new Date();
    await user.save();

    const token = createToken(user._id.toString());

    return res.status(200).json({
      message: "Dang nhap thanh cong.",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Khong the dang nhap.",
      error: error.message
    });
  }
}

async function getMe(req, res) {
  return res.status(200).json({
    message: "Lay thong tin nguoi dung thanh cong.",
    user: sanitizeUser(req.user)
  });
}

async function getAdminAccess(req, res) {
  return res.status(200).json({
    message: "Chao mung admin.",
    user: sanitizeUser(req.user)
  });
}

async function requestGoogleOtp(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Khong nhan duoc Google credential."
      });
    }

    const googleProfile = await verifyGoogleCredential(credential);
    const existingUser = await User.findOne({
      $or: [
        { email: googleProfile.email },
        { googleId: googleProfile.googleId }
      ]
    });

    if (existingUser && existingUser.status !== "active") {
      return res.status(403).json({
        message: "Tai khoan hien khong the dang nhap."
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(
      Date.now() + getOtpExpiryMinutes() * 60 * 1000
    );

    await AuthOtpChallenge.deleteMany({
      email: googleProfile.email,
      consumedAt: { $exists: false }
    });

    const challenge = await AuthOtpChallenge.create({
      email: googleProfile.email,
      googleId: googleProfile.googleId,
      fullName: googleProfile.fullName,
      avatarUrl: googleProfile.avatarUrl,
      otpHash,
      expiresAt
    });

    try {
      await sendOtpEmail({
        email: googleProfile.email,
        otp
      });
    } catch (error) {
      await AuthOtpChallenge.findByIdAndDelete(challenge._id);
      throw error;
    }

    return res.status(200).json({
      message: `Da gui OTP den ${maskEmail(googleProfile.email)}.`,
      challengeId: challenge._id.toString(),
      email: maskEmail(googleProfile.email),
      expiresInMinutes: getOtpExpiryMinutes()
    });
  } catch (error) {
    return res.status(500).json({
      message: "Khong the khoi tao dang nhap Google.",
      error: error.message
    });
  }
}

async function verifyGoogleOtp(req, res) {
  try {
    const { challengeId, otp } = req.body;

    if (!challengeId || !otp) {
      return res.status(400).json({
        message: "Thong tin xac minh OTP khong du."
      });
    }

    const challenge = await AuthOtpChallenge.findById(challengeId);

    if (!challenge || challenge.consumedAt) {
      return res.status(404).json({
        message: "Phien OTP khong ton tai hoac da het hieu luc."
      });
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await AuthOtpChallenge.findByIdAndDelete(challenge._id);
      return res.status(410).json({
        message: "Ma OTP da het han. Vui long dang nhap Google lai."
      });
    }

    const isOtpValid = await bcrypt.compare(String(otp).trim(), challenge.otpHash);

    if (!isOtpValid) {
      challenge.attempts += 1;

      if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
        await AuthOtpChallenge.findByIdAndDelete(challenge._id);
        return res.status(429).json({
          message: "Ban da nhap sai OTP qua nhieu lan. Vui long dang nhap Google lai."
        });
      }

      await challenge.save();
      return res.status(401).json({
        message: "Ma OTP khong dung."
      });
    }

    challenge.consumedAt = new Date();
    await challenge.save();

    const user = await findOrCreateGoogleUser(challenge);
    const token = createToken(user._id.toString());

    await AuthOtpChallenge.deleteMany({ email: challenge.email });

    return res.status(200).json({
      message: "Dang nhap Google thanh cong.",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Khong the xac minh OTP.",
      error: error.message
    });
  }
}

module.exports = {
  login,
  register,
  getMe,
  getAdminAccess,
  requestGoogleOtp,
  verifyGoogleOtp
};
