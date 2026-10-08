import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const uploadDir = path.resolve(process.cwd(), "uploads");
const cloudinaryCredentials = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};
const useCloudinary = Object.values(cloudinaryCredentials).every(
  (value) => value && !value.startsWith("your_")
);

if (useCloudinary) {
  cloudinary.config(cloudinaryCredentials);
}

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (useCloudinary) {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "allendesi" },
          (error, uploadedImage) => {
            if (error || !uploadedImage) {
              reject(error || new Error("Cloudinary upload returned no image"));
              return;
            }
            resolve(uploadedImage);
          }
        );
        stream.end(req.file!.buffer);
      });

      return res.json({ success: true, url: result.secure_url });
    }

    await fs.promises.mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}${path.extname(req.file.originalname)}`;
    await fs.promises.writeFile(path.join(uploadDir, filename), req.file.buffer);
    const apiOrigin = `${req.protocol}://${req.get("host")}`;

    return res.json({
      success: true,
      url: `${apiOrigin}/uploads/${filename}`,
    });
  } catch (error) {
    console.error("Image upload failed:", error);
    return res.status(500).json({
      success: false,
      message: "Image upload failed",
    });
  }
});

export default router;