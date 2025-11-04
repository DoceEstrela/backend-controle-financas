import express from 'express';
import {
  getMaterialPurchases,
  createMaterialPurchase,
  updateMaterialPurchase,
  deleteMaterialPurchase,
  getMaterialConsumptionReport,
} from '../controllers/materialPurchaseController.js';
import { protect, isAdminOrVendedor, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getMaterialPurchases);
router.post('/', protect, isAdminOrVendedor, createMaterialPurchase);
router.put('/:id', protect, isAdminOrVendedor, updateMaterialPurchase);
router.delete('/:id', protect, isAdmin, deleteMaterialPurchase);
router.get('/consumption-report', protect, getMaterialConsumptionReport);

export default router;
