import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { UserService } from '../services/UserService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class UserController {
  /**
   * GET /api/user/profile
   */
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userIdOrAddress = req.userId || req.userAddress || (req.query.address as string);
      if (!userIdOrAddress) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required to view profile', statusCode: 401 },
        });
      }

      const hostHeader = req.get('host');
      const profile = await UserService.getProfile(userIdOrAddress, hostHeader);
      return sendSuccess(res, { profile, ...profile }, 'Profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/user/profile
   */
  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userIdOrAddress = req.userId || req.userAddress;
      if (!userIdOrAddress) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required to update profile', statusCode: 401 },
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const hostHeader = req.get('host');

      const updatedProfile = await UserService.updateProfile(
        userIdOrAddress,
        req.body,
        ipAddress,
        userAgent,
        hostHeader
      );

      return sendSuccess(res, { profile: updatedProfile, ...updatedProfile }, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/user/preferences
   */
  static async getPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userIdOrAddress = req.userId || req.userAddress || (req.query.address as string);
      if (!userIdOrAddress) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required to view preferences', statusCode: 401 },
        });
      }

      const preferences = await UserService.getPreferences(userIdOrAddress);
      return sendSuccess(res, { preferences, ...preferences }, 'User preferences retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/user/preferences
   */
  static async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userIdOrAddress = req.userId || req.userAddress;
      if (!userIdOrAddress) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required to update preferences', statusCode: 401 },
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updatedPreferences = await UserService.updatePreferences(
        userIdOrAddress,
        req.body,
        ipAddress,
        userAgent
      );

      return sendSuccess(res, { preferences: updatedPreferences, ...updatedPreferences }, 'User preferences updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/user/activity-logs
   */
  static async getActivityLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userIdOrAddress = req.userId || req.userAddress;
      if (!userIdOrAddress) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required to view activity logs', statusCode: 401 },
        });
      }

      const logs = await UserService.getActivityLogs(userIdOrAddress);
      return sendSuccess(res, { logs, ...logs }, 'User activity logs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/user/base-plan (Legacy support)
   */
  static updateBasePlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const address = req.userAddress;
      const { basePlanAmount } = req.body;

      if (!address) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const updatedUser = UserService.updateBasePlan(address, Number(basePlanAmount));
      return sendSuccess(res, updatedUser, 'Base plan updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default UserController;
