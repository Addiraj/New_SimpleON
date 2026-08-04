import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService.js';
import { logger } from '../config/logger.js';

export class PaymentController {
  /**
   * POST /api/payments/intent or /api/payments/create-intent
   */
  static async createGenericIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { paymentType = 'JOIN', type, levelSlug, levelOrder = 1, levelId } = req.body || {};
      const pType = (paymentType || type || 'JOIN').toUpperCase();

      let intent;
      if (pType === 'UPGRADE') {
        intent = await PaymentService.createUpgradeIntent(userId, { levelSlug, levelOrder, levelId });
      } else if (pType === 'RETOPUP' || pType === 'RE_TOPUP') {
        intent = await PaymentService.createRetopupIntent(userId, { levelSlug, levelOrder, levelId });
      } else {
        intent = await PaymentService.createJoinIntent(userId, { levelSlug, levelOrder, levelId });
      }

      res.status(200).json({
        success: true,
        message: 'Payment intent created successfully',
        data: { intent, ...intent },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/join-intent
   */
  static async createJoinIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { levelSlug, levelOrder, levelId } = req.body || {};

      const intent = await PaymentService.createJoinIntent(userId, {
        levelSlug,
        levelOrder,
        levelId,
      });

      res.status(200).json({
        success: true,
        message: 'Join payment intent created successfully',
        data: { intent, ...intent },
      });
    } catch (err: any) {
      if (err.message === 'User is already active') {
        return res.status(200).json({
          status: 'info',
          message: 'User is already active',
        });
      }
      next(err);
    }
  }

  /**
   * POST /api/payments/upgrade-intent
   */
  static async createUpgradeIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { levelSlug, levelOrder, levelId } = req.body || {};

      const intent = await PaymentService.createUpgradeIntent(userId, {
        levelSlug,
        levelOrder,
        levelId,
      });

      res.status(201).json({
        success: true,
        message: 'Upgrade payment intent created successfully',
        data: intent,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/retopup-intent
   */
  static async createRetopupIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { levelSlug, levelOrder, levelId } = req.body || {};

      const intent = await PaymentService.createRetopupIntent(userId, {
        levelSlug,
        levelOrder,
        levelId,
      });

      res.status(201).json({
        success: true,
        message: 'Re-topup payment intent created successfully',
        data: intent,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/reference/:reference
   */
  static async getByReference(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { reference } = req.params;

      const intent = await PaymentService.getPaymentByReference(reference, userId);

      res.status(200).json({
        success: true,
        data: intent,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const intent = await PaymentService.getPaymentById(id, userId);

      res.status(200).json({
        success: true,
        data: intent,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/verify
   */
  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const {
        paymentIntentId,
        payment_intent_id,
        txHash,
        transactionHash,
        transaction_hash,
      } = req.body || {};

      const intentId = paymentIntentId || payment_intent_id;
      const hash = txHash || transactionHash || transaction_hash;

      if (!intentId || !hash) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Both Payment Intent ID and Blockchain Transaction Hash are required',
          },
        });
      }

      const result = await PaymentService.verifyPayment(userId, intentId, hash);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/:id/mock-confirm (Dev Mode)
   */
  static async confirmMockPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { txHash } = req.body || {};

      const confirmedIntent = await PaymentService.confirmMockPayment(id, userId, txHash);

      res.status(200).json({
        success: true,
        message: 'Mock payment confirmed successfully',
        data: confirmedIntent,
      });
    } catch (err) {
      next(err);
    }
  }
}
