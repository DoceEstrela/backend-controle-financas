import express from 'express';
import {
  getMaterialConsumptions,
  createMaterialConsumption,
  deleteMaterialConsumption,
} from '../controllers/materialConsumptionController.js';
import { protect, isAdminOrVendedor, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getMaterialConsumptions);
router.post('/', protect, isAdminOrVendedor, createMaterialConsumption);
router.delete('/:id', protect, isAdmin, deleteMaterialConsumption);

export default router;

