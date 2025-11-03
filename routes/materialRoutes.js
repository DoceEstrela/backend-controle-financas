import express from 'express';
import {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialStats,
} from '../controllers/materialController.js';
import { protect, isAdmin, isAdminOrVendedor } from '../middlewares/auth.js';
import { validateMaterial } from '../middlewares/validation.js';

const router = express.Router();

router.get('/', protect, getMaterials);
router.get('/stats', protect, getMaterialStats);
router.get('/:id', protect, getMaterial);
router.post('/', protect, isAdminOrVendedor, validateMaterial, createMaterial);
router.put('/:id', protect, isAdminOrVendedor, validateMaterial, updateMaterial);
router.delete('/:id', protect, isAdmin, deleteMaterial);

export default router;
