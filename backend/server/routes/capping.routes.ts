import { Router } from 'express';
import { CappingController } from '../controllers/capping.controller.js';
import { optionalAuthenticateWeb3Token } from '../middlewares/authMiddleware.js';

const router = Router();

// Daily Capping APIs
router.get('/status', optionalAuthenticateWeb3Token, CappingController.getStatus);
router.get('/overview', optionalAuthenticateWeb3Token, CappingController.getStatus);
router.get('/history', optionalAuthenticateWeb3Token, CappingController.getHistory);
router.get('/summary', optionalAuthenticateWeb3Token, CappingController.getSummary);

export default router;
