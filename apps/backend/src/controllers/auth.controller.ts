import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, phone, badge, rank, area } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: role || 'RESPONDER',
        phone,
        badge,
        rank,
        area,
      },
    });

    const token = generateToken(user.id, user.role);
    const refreshTokenValue = generateRefreshToken(user.id);

    res.status(201).json({
      user: { ...user, password: undefined },
      token,
      refreshToken: refreshTokenValue,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    const token = generateToken(user.id, user.role);
    const refreshTokenValue = generateRefreshToken(user.id);

    res.json({
      user: { ...user, password: undefined },
      token,
      refreshToken: refreshTokenValue,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        badge: true,
        rank: true,
        phone: true,
        area: true,
        status: true,
        isOnline: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const newToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};
