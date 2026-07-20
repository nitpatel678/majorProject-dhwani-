import jwt from 'jsonwebtoken';
import { config } from '../config';

export const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

export const verifyToken = (token: string): { userId: string; role: string } => {
  return jwt.verify(token, config.jwt.secret) as { userId: string; role: string };
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
};
