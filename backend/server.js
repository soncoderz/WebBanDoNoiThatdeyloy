const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const homeRoutes = require("./routes/homeRoutes");
const shopRoutes = require("./routes/shopRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const requestLogger = require("./middlewares/requestLogger");

const app = express();
const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST || "0.0.0.0";

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/+$/, "");
}

function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.CLIENT_URLS,
    process.env.CLIENT_URL,
    process.env.FRONTEND_PUBLIC_URL
  ]
    .flatMap((value) => String(value || "").split(","))
    .map(normalizeOrigin)
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return [...new Set(configuredOrigins)];
  }

  return ["http://localhost:5173", "http://127.0.0.1:5173"];
}

const allowedOrigins = getAllowedOrigins();

app.use(requestLogger);
app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      const corsError = new Error(`CORS blocked for origin: ${origin}`);
      corsError.status = 403;
      return callback(corsError);
    }
  })
);
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    message: "Backend auth is running.",
    uptime: Math.round(process.uptime())
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/uploads", uploadRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.status ? err.message : "Internal server error."
  });
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    console.error("Missing required environment variable: MONGODB_URI");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || undefined
    });

    app.listen(port, host, () => {
      console.log(`Backend is running on ${host}:${port}`);
      console.log(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
