import { Router } from 'express';
import {
  getSummary,
  getDirect,
  getTree,
  getLink,
  validateReferralCode,
  assignSponsor,
} from '../controllers/referral.controller.js';
import {
  authenticateWeb3Token,
  optionalAuthenticateWeb3Token,
} from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/referrals/summary
router.get('/summary', authenticateWeb3Token, getSummary);

// GET /api/referrals/direct
router.get('/direct', authenticateWeb3Token, getDirect);
router.get('/directs', authenticateWeb3Token, getDirect);

// GET /api/referrals/tree
router.get('/tree', authenticateWeb3Token, getTree);

// GET /api/referrals/link
router.get('/link', authenticateWeb3Token, getLink);

// GET /api/referrals/validate-sponsor
router.get('/validate-sponsor', optionalAuthenticateWeb3Token, validateReferralCode);

// GET /api/referrals/validate/:referralCode
router.get('/validate/:referralCode', optionalAuthenticateWeb3Token, validateReferralCode);

// POST /api/referrals/assign-sponsor
router.post('/assign-sponsor', authenticateWeb3Token, assignSponsor);
router.post('/assign', authenticateWeb3Token, assignSponsor);

export default router;
