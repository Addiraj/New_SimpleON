import { Request, Response, NextFunction } from 'express';
import { MatrixQueryService } from '../services/MatrixQueryService.js';
import { MatrixService } from '../services/MatrixService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export class MatrixController {
  /**
   * GET /api/matrix/summary
   */
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.userId || (req.query.userId as string);
      const address = authReq.userAddress || (req.query.address as string);
      const levelConfigId = req.query.levelConfigId as string;
      const tierCode = (req.query.tierCode || req.query.tier) as string;

      const summary = await MatrixQueryService.getSummary(userId, address, levelConfigId, tierCode);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/matrix/current
   */
  static async getCurrentCycle(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.userId || (req.query.userId as string);
      const address = authReq.userAddress || (req.query.address as string);
      const levelConfigId = req.query.levelConfigId as string;
      const tierCode = (req.query.tierCode || req.query.tier) as string;

      const currentCycle = await MatrixQueryService.getCurrentCycle(userId, address, levelConfigId, tierCode);
      res.json({ success: true, data: currentCycle });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/matrix/cycles
   */
  static async getCycles(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.userId || (req.query.userId as string);
      const address = authReq.userAddress || (req.query.address as string);
      const levelConfigId = req.query.levelConfigId as string;
      const tierCode = (req.query.tierCode || req.query.tier) as string;
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);

      const cycles = await MatrixQueryService.getCycles(userId, address, levelConfigId, tierCode, page, limit);
      res.json({ success: true, data: cycles });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/matrix/cycles/:id
   */
  static async getCycleById(req: Request, res: Response, next: NextFunction) {
    try {
      const cycleId = req.params.id;
      const cycle = await MatrixQueryService.getCycleById(cycleId);
      res.json({ success: true, data: cycle });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/matrix/cycles/:id/positions
   */
  static async getCyclePositions(req: Request, res: Response, next: NextFunction) {
    try {
      const cycleId = req.params.id;
      const positions = await MatrixQueryService.getCyclePositions(cycleId);
      res.json({ success: true, data: positions });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/matrix/tree
   */
  static async getMatrixTree(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.userId || (req.query.userId as string);
      const address = authReq.userAddress || (req.query.address as string);
      const levelConfigId = req.query.levelConfigId as string;
      const depth = parseInt((req.query.depth as string) || '3', 10);

      const tree = await MatrixQueryService.getMatrixTree(userId, address, levelConfigId, depth);
      res.json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Legacy Endpoint: GET /api/matrix/13-level-tree
   */
  static get13LevelTree(req: Request, res: Response, next: NextFunction) {
    try {
      const address = (req.query.address as string) || '0x0000000000000000000000000000000000000000';
      const tree = MatrixService.get13LevelMatrixTree(address);
      res.json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Legacy Endpoint: GET /api/matrix/special-matrices
   */
  static getSpecialMatrices(req: Request, res: Response, next: NextFunction) {
    try {
      const address = (req.query.address as string) || '0x0000000000000000000000000000000000000000';
      const matrices = MatrixService.getSpecialMatrices(address);
      res.json({ success: true, data: matrices });
    } catch (err) {
      next(err);
    }
  }
}
