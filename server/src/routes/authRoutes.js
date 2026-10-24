import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  uploadAvatar,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { avatarUpload } from '../middleware/upload.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

// Protected routes (require valid JWT in HTTP-only cookie or Bearer token)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);

export default router;
