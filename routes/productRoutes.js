import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, isAdmin, isAdminOrVendedor } from '../middlewares/auth.js';
import { validateProduct } from '../middlewares/validation.js';

const router = express.Router();

router.get('/', protect, getProducts);
router.get('/:id', protect, getProduct);
router.post('/', protect, isAdminOrVendedor, validateProduct, createProduct);
router.put('/:id', protect, isAdminOrVendedor, validateProduct, updateProduct);
router.delete('/:id', protect, isAdmin, deleteProduct);

export default router;
