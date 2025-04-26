// src/routes/userRoutes.ts
import express, { Request, Response } from "express";
import User from "../models/User"; // Імпортуємо модель User

const router = express.Router();

// Отримання профілю користувача
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;