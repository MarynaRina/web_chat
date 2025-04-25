import express from "express";
import multer from "multer";
import path from "path";
import User from "../models/User.js"; // схема користувача
import fs from "fs";

const router = express.Router();

// Тимчасове збереження аватарки
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

router.post("/setup", upload.single("avatar"), async (req, res) => {
  const { userId, name } = req.body;
  const avatarPath = req.file?.path;

  if (!userId || !name || !avatarPath) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  try {
    await User.findOneAndUpdate(
      { userId },
      {
        name,
        avatar: avatarPath,
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;