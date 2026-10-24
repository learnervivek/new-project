import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getPaymentConfig,
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getTripPaymentHistory,
  getPaymentOrderDetails,
} from '../controllers/paymentController.js';

// Top-level payment router for config and webhook
export const paymentPublicRouter = express.Router();
paymentPublicRouter.get('/config', getPaymentConfig);
paymentPublicRouter.post('/webhook', handleRazorpayWebhook);

// Trip-nested payment router
export const tripPaymentRouter = express.Router({ mergeParams: true });
tripPaymentRouter.use(protect);

tripPaymentRouter.post('/create-order', createPaymentOrder);
tripPaymentRouter.post('/verify', verifyPayment);
tripPaymentRouter.get('/', getTripPaymentHistory);
tripPaymentRouter.get('/:paymentOrderId', getPaymentOrderDetails);

export default {
  paymentPublicRouter,
  tripPaymentRouter,
};
