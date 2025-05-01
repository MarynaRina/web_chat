import multer from "multer";
import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User";

// Налаштування multer для зберігання в оперативній памʼяті
const storage = multer.memoryStorage();
const upload = multer({ storage });

const setupProfileHandler = async (
  req: Request & { file?: Express.Multer.File },
  res: Response
): Promise<void> => {
  try {
    const { username, userId } = req.body;
    const file = req.file;

    if (!username || !userId || !file) {
      res.status(400).json({ message: "Missing required fields: username, userId, or avatar" });
      return;
    }

    // Функція для завантаження в Cloudinary
    const streamUpload = (buffer: Buffer): Promise<{ secure_url: string }> => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          (error, result) => {
            if (result) resolve(result as { secure_url: string });
            else reject(error);
          }
        );
        stream.end(buffer);
      });
    };

    // Завантаження файлу
    const uploadResult = await streamUpload(file.buffer);
    const avatarUrl = uploadResult.secure_url;

    // Оновлення або створення користувача
    await User.findOneAndUpdate(
      { userId },
      { username, avatarUrl },
      { upsert: true }
    );

    res.status(200).json({ success: true, avatarUrl });
  } catch (error) {
    console.error("❌ Error in /api/users/setup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export { upload, setupProfileHandler };