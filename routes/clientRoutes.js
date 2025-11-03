import express from 'express';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientPurchases,
} from '../controllers/clientController.js';
import { protect, isAdmin } from '../middlewares/auth.js';
import { validateClient } from '../middlewares/validation.js';

const router = express.Router();

router.get('/', protect, getClients);
router.get('/:id', protect, getClient);
router.get('/:id/purchases', protect, getClientPurchases);
router.post('/', protect, validateClient, createClient);
router.put('/:id', protect, validateClient, updateClient);
router.delete('/:id', protect, isAdmin, deleteClient);

export default router;
