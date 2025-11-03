import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  getUsers,
  createUser,
  createFirstAdmin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} from '../controllers/authController.js';
import { protect, isAdmin } from '../middlewares/auth.js';
import { validateRegister, validateLogin, validateCreateUser, validateForgotPassword, validateResetPassword } from '../middlewares/validation.js';
import { loginLimiter, resetPasswordLimiter } from '../middlewares/security.js';

const router = express.Router();

router.post('/register', loginLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/users', protect, isAdmin, getUsers);
router.post('/create-first-admin', loginLimiter, ...validateRegister, createFirstAdmin);
router.post('/create-user', protect, isAdmin, validateCreateUser, createUser);
router.post('/forgot-password', resetPasswordLimiter, validateForgotPassword, forgotPassword);
router.put('/reset-password/:resetToken', resetPasswordLimiter, validateResetPassword, resetPassword);
router.get('/verify-email/:verificationToken', verifyEmail);
router.post('/resend-verification', resetPasswordLimiter, validateForgotPassword, resendVerificationEmail);

export default router;
