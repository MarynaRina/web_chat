import { Router, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User';
import auth, { AuthRequest } from '../middleware/authMiddleware';

dotenv.config();

const router = Router();
const codes = new Map<string, string>();

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Видаляємо повернення результату, щоб відповідати типу RequestHandler
const sendCode = async (req: any, res: Response): Promise<void> => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ message: 'Phone number is required' });
    return;
  }

  const code = generateCode();
  codes.set(phone, code);

  console.log(`Code for ${phone}: ${code}`);
  res.json({ message: 'Code sent successfully' });
};

// Видаляємо повернення результату, щоб відповідати типу RequestHandler
const verifyCode = async (req: any, res: Response): Promise<void> => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    res.status(400).json({ message: 'Phone and code required' });
    return;
  }

  const validCode = codes.get(phone);
  if (code !== validCode) {
    res.status(401).json({ message: 'Invalid code' });
    return;
  }

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone });
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  codes.delete(phone);
  res.json({ token });
};

router.post('/send-code', sendCode);
router.post('/verify-code', verifyCode);

// Виправлення обробника для /me
router.get('/me', auth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    // Виправлення .status() на правильний метод
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;