import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticateWeb3Token } from '../middlewares/authMiddleware.js';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(authenticateWeb3Token);

router.get('/dashboard/stats', AdminController.getDashboardStats);
router.get('/users', AdminController.getUsers);
router.get('/transactions', AdminController.getTransactions);

export default router;
