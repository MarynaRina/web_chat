import express, { Request, Response, NextFunction } from "express";
import User from "../models/User";

const router = express.Router();

router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
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
    next(error);
  }
});

export default router;