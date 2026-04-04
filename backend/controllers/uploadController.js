const Upload = require("../schemas/upload");
const { uploadBufferToCloudinary } = require("../utils/cloudinary");

async function uploadAdminImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Ban chua chon file anh."
      });
    }

    const folderName = req.body.folder || "common";
    const uploadedFile = await uploadBufferToCloudinary({
      fileBuffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folderName
    });

    const savedUpload = await Upload.create({
      uploader: req.user?._id || null,
      originalName: req.file.originalname,
      filename: uploadedFile.displayName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: uploadedFile.secureUrl,
      folder: uploadedFile.folder,
      publicId: uploadedFile.publicId,
      width: uploadedFile.width,
      height: uploadedFile.height,
      resourceType: "image"
    });

    return res.status(201).json({
      message: "Upload anh thanh cong.",
      file: {
        _id: savedUpload._id,
        originalName: savedUpload.originalName,
        filename: savedUpload.filename,
        url: savedUpload.url,
        mimeType: savedUpload.mimeType,
        size: savedUpload.size
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadAdminImage
};
