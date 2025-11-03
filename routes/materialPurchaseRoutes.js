import express from 'express';
import {
  getMaterialPurchases,
  createMaterialPurchase,
  getMaterialConsumptionReport,
} from '../controllers/materialPurchaseController.js';
import { protect, isAdminOrVendedor } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getMaterialPurchases);
router.post('/', protect, isAdminOrVendedor, createMaterialPurchase);
router.get('/consumption-report', protect, getMaterialConsumptionReport);

export default router;
