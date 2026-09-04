import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller.js';
import { optionalAuthenticateWeb3Token } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/summary', optionalAuthenticateWeb3Token, WalletController.getSummary);
router.get('/bititan', optionalAuthenticateWeb3Token, WalletController.getBititanSummary);
router.get('/ledger', optionalAuthenticateWeb3Token, WalletController.getLedger);
router.post('/faucet', optionalAuthenticateWeb3Token, WalletController.claimDemoCoins);
router.post('/demo-activate', optionalAuthenticateWeb3Token, WalletController.demoActivate);

export default router;
