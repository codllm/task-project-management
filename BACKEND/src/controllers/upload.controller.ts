import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import fs from "fs";

export const uploadFileController = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "task-project-management-attachments",
      resource_type: "auto",
    });

    // Clean up local temp file asynchronously
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Failed to delete local temp file:", err);
    });

    res.status(200).json({
      success: true,
      url: result.secure_url,
      name: req.file.originalname,
      fileType: req.file.mimetype,
    });
  } catch (error: any) {
    // Clean up local file if upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
