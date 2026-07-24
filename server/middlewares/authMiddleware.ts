import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util.js';
import { AuthRepository } from '../repositories/AuthRepository.js';

export interface AuthRequest extends Request {
  userId?: string;
  userAddress?: string;
}

export const authenticateWeb3Token = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication token missing or invalid', statusCode: 401 }
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = JwtUtil.verifyAccessToken(token);
    req.userId = payload.userId;
    req.userAddress = payload.walletAddress;

    if (payload.userId) {
      const user = await AuthRepository.findUserById(payload.userId);
      if (user && (user.status === 'SUSPENDED' || user.status === 'BLOCKED')) {
        res.status(403).json({
          success: false,
          error: { message: 'Account is suspended or blocked', statusCode: 403 }
        });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired Web3 authentication session token', statusCode: 401 }
    });
  }
};

export const optionalAuthenticateWeb3Token = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = JwtUtil.verifyAccessToken(token);
      req.userId = payload.userId;
      req.userAddress = payload.walletAddress;
    } catch {
      // Ignore invalid token for optional auth
    }
  }

  next();
};

export default authenticateWeb3Token;
