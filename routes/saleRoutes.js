import express from 'express';
import {
  getSales,
  getSale,
  createSale,
  updatePaymentStatus,
  getSalesReport,
} from '../controllers/saleController.js';
import { protect, isAdmin, isAdminOrVendedor } from '../middlewares/auth.js';
import { validateSale } from '../middlewares/validation.js';

const router = express.Router();

router.get('/', protect, getSales);
router.get('/reports/period', protect, isAdmin, getSalesReport);
router.get('/:id', protect, getSale);
router.post('/', protect, isAdminOrVendedor, validateSale, createSale);
router.put('/:id/payment', protect, isAdminOrVendedor, updatePaymentStatus);

export default router;
