import { Router, Request, Response, NextFunction } from 'express';
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

const sendCode = async (req: Request, res: Response): Promise<void> => {
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

const verifyCode = async (req: Request, res: Response): Promise<void> => {
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

  if (!process.env.JWT_SECRET) {
    res.status(500).json({ message: 'JWT_SECRET is not defined' });
    return;
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  codes.delete(phone);
  res.json({ token });
};

router.post('/send-code', sendCode);
router.post('/verify-code', verifyCode);

router.get('/me', auth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
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