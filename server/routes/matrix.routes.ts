import { Router } from 'express';
import { MatrixController } from '../controllers/matrix.controller.js';
import { optionalAuthenticateWeb3Token } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(optionalAuthenticateWeb3Token);

router.get('/summary', MatrixController.getSummary);
router.get('/current', MatrixController.getCurrentCycle);
router.get('/cycles', MatrixController.getCycles);
router.get('/cycles/:id', MatrixController.getCycleById);
router.get('/cycles/:id/positions', MatrixController.getCyclePositions);
router.get('/tree', MatrixController.getMatrixTree);

// Legacy compatibility routes
router.get('/13-level-tree', MatrixController.get13LevelTree);
router.get('/special-matrices', MatrixController.getSpecialMatrices);

export default router;
