import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticateWeb3Token } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createPaymentIntentSchema,
  createPartialUpgradeIntentSchema,
  getPaymentByIdSchema,
  getPaymentByReferenceSchema,
  verifyPaymentSchema,
} from '../validators/payment.validator.js';

const router = Router();

// All payment intent routes require authentication
router.use(authenticateWeb3Token);

// Verify payment endpoint
router.post('/verify', validateRequest(verifyPaymentSchema), PaymentController.verifyPayment);

// Create payment intent endpoints
router.post('/intent', PaymentController.createGenericIntent);
router.post('/create-intent', PaymentController.createGenericIntent);
router.post('/join-intent', validateRequest(createPaymentIntentSchema), PaymentController.createJoinIntent);
router.post('/upgrade-intent', validateRequest(createPaymentIntentSchema), PaymentController.createUpgradeIntent);
router.post('/partial-upgrade-intent', validateRequest(createPartialUpgradeIntentSchema), PaymentController.createPartialUpgradeIntent);
router.post('/retopup-intent', validateRequest(createPaymentIntentSchema), PaymentController.createRetopupIntent);

// Query payment intents by Reference or ID
router.get('/reference/:reference', validateRequest(getPaymentByReferenceSchema), PaymentController.getByReference);
router.get('/:id', validateRequest(getPaymentByIdSchema), PaymentController.getById);

// Dev Mode Mock Confirmation endpoint
router.post('/:id/mock-confirm', validateRequest(getPaymentByIdSchema), PaymentController.confirmMockPayment);

export default router;
