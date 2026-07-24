import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export class AuthController {
  /**
   * POST /api/auth/nonce or GET /api/auth/nonce
   * Generates a cryptographically secure single-use SIWE nonce
   */
  static async getNonce(req: Request, res: Response, next: NextFunction) {
    try {
      const rawAddress = (req.body?.walletAddress || req.body?.address || req.query?.walletAddress || req.query?.address) as string;
      const chainId = Number(req.body?.chainId || req.query?.chainId || 97);

      const nonceData = await AuthService.requestNonce(rawAddress, chainId);
      return sendSuccess(res, nonceData, 'SIWE nonce generated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/verify
   * Verifies signature and logs user in
   */
  static async verifySignature(req: Request, res: Response, next: NextFunction) {
    try {
      const address = (req.body.address || req.body.walletAddress) as string;
      const { signature, message, referrerAddress } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.verifySignature({
        address,
        signature,
        message,
        referrerAddress,
        ipAddress,
        userAgent,
      });

      return sendSuccess(res, result, 'SIWE authentication verified successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh
   * Rotates refresh token and returns new access token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.rotateRefreshToken(refreshToken, ipAddress, userAgent);
      return sendSuccess(res, result, 'Session refreshed successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   * Revokes session
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken || req.headers['x-refresh-token'];
      const result = await AuthService.logout(refreshToken as string);
      return sendSuccess(res, result, 'Session logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Fetches current authenticated user profile
   */
  static async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userIdOrAddress = req.userId || req.userAddress;
      if (!userIdOrAddress) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized request', statusCode: 401 },
        });
      }

      const user = await AuthService.getCurrentUser(userIdOrAddress);
      return sendSuccess(res, { user }, 'User profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;
