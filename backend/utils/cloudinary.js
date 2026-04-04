const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const slugify = require("./slugify");

function configureCloudinary() {
  const configuredCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const configuredApiKey = process.env.CLOUDINARY_API_KEY;
  const configuredApiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!configuredCloudName || !configuredApiKey || !configuredApiSecret) {
    throw new Error(
      "Thieu bien moi truong Cloudinary. Hay them CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY va CLOUDINARY_API_SECRET vao backend/.env."
    );
  }

  cloudinary.config({
    cloud_name: configuredCloudName,
    api_key: configuredApiKey,
    api_secret: configuredApiSecret
  });
}

function buildPublicId(originalName = "") {
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  const normalizedName = slugify(baseName).slice(0, 50);

  return `${Date.now()}-${normalizedName || "upload"}`;
}

function uploadBufferToCloudinary({
  fileBuffer,
  originalName,
  mimeType,
  folderName = "common"
}) {
  configureCloudinary();

  const cloudinaryFolder = [
    process.env.CLOUDINARY_FOLDER || "tiem-do-trang-tri-noi-that",
    slugify(folderName) || "common"
  ].join("/");

  const publicId = buildPublicId(originalName);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
        public_id: publicId,
        resource_type: "image",
        format: mimeType === "image/jpeg" ? "jpg" : undefined,
        overwrite: false
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          folder: cloudinaryFolder,
          width: result.width || 0,
          height: result.height || 0,
          displayName: `${publicId}${path.extname(originalName).toLowerCase()}`
        });
      }
    );

    stream.end(fileBuffer);
  });
}

module.exports = {
  cloudinary,
  uploadBufferToCloudinary
};
