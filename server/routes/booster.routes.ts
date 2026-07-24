import { Router } from 'express';
import { BoosterController } from '../controllers/booster.controller.js';
import { optionalAuthenticateWeb3Token } from '../middlewares/authMiddleware.js';

const router = Router();

// Booster Plan APIs
router.get('/plans', BoosterController.getPlans);
router.get('/plans/:slug', BoosterController.getPlanBySlug);
router.get('/current-plan', optionalAuthenticateWeb3Token, BoosterController.getCurrentPlan);
router.get('/eligibility', optionalAuthenticateWeb3Token, BoosterController.getEligibility);
router.post('/eligibility', optionalAuthenticateWeb3Token, BoosterController.getEligibility);
router.post('/calculate', BoosterController.calculate);

// Legacy calculation endpoint
router.get('/calculations', BoosterController.getCalculations);

export default router;
