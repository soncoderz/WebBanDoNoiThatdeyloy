const jwt = require("jsonwebtoken");
const User = require("../schemas/user");

function extractToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

async function authenticateToken(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Ban chua dang nhap."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.isDeleted) {
      return res.status(401).json({
        message: "Tai khoan khong hop le."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Tai khoan hien khong duoc phep truy cap."
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token khong hop le hoac da het han."
      });
    }

    return next(error);
  }
}

function authorizeRoles(...allowedRoles) {
  return function authorizeRoleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        message: "Ban chua dang nhap."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Ban khong co quyen truy cap."
      });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
