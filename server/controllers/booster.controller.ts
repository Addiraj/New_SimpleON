import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { BoosterService } from '../services/BoosterService.js';

export class BoosterController {
  /**
   * GET /api/booster/plans
   * Return active Booster level configurations from MySQL
   */
  static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await BoosterService.getActivePlans();
      res.json({
        success: true,
        data: { plans },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/booster/plans/:slug
   * Return single Booster level configuration by slug
   */
  static async getPlanBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const plan = await BoosterService.getPlanBySlug(slug);

      if (!plan) {
        res.status(404).json({
          success: false,
          error: { message: `Booster plan with slug '${slug}' not found` },
        });
        return;
      }

      res.json({
        success: true,
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/booster/current-plan
   * Return current user's active booster plan and history
   */
  static async getCurrentPlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userAddress || req.userId || 'guest-user';
      const userLevelData = await BoosterService.getUserCurrentPlan(userId);

      res.json({
        success: true,
        data: userLevelData,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET/POST /api/booster/eligibility
   * Validate upgrade eligibility on backend
   */
  static async getEligibility(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId || req.userAddress || 'guest-user';
      let targetSlug = (req.body?.slug || req.query?.slug) as string | undefined;
      const levelNumber = req.body?.levelNumber || req.query?.levelNumber;

      if (!targetSlug && levelNumber) {
        const plans = await BoosterService.getActivePlans();
        const found = plans.find(
          (p) => p.levelOrder === Number(levelNumber) || p.level_order === Number(levelNumber)
        );
        if (found) {
          targetSlug = found.slug;
        } else {
          targetSlug = `level-${levelNumber}`;
        }
      }

      const eligibility = await BoosterService.checkEligibility(userId, targetSlug);

      res.json({
        success: true,
        data: eligibility,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/booster/calculate
   * Compute booster tier metrics based on MySQL level configurations
   */
  static async calculate(req: Request, res: Response, next: NextFunction) {
    try {
      const levelNumber = req.body?.levelNumber || req.body?.basePlan || req.query?.basePlan || 1;
      const result = await BoosterService.calculateBoosterMetrics(Number(levelNumber));

      res.json({
        success: true,
        data: {
          calculation: {
            projectedDailyIncomeUsdt: result.mainPlan?.perLevelIncome || 0,
            ...result,
          },
          ...result,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/booster/calculations (Legacy endpoint backward compatibility)
   */
  static async getCalculations(req: Request, res: Response, next: NextFunction) {
    try {
      const basePlan = req.query.basePlan ? Number(req.query.basePlan) : 1.0;
      const result = await BoosterService.calculateBoosterMetrics(basePlan);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
