import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMyInvitations,
  getInvitationByToken,
  acceptInvitationByToken,
  declineInvitationByToken,
  acceptInvitationById,
  declineInvitationById,
} from '../controllers/invitationController.js';

const router = express.Router();

// User's received invitations
router.get('/me', protect, getMyInvitations);

// Token-based operations
router.get('/token/:token', getInvitationByToken);
router.post('/token/:token/accept', protect, acceptInvitationByToken);
router.post('/token/:token/decline', declineInvitationByToken);

// ID-based operations for logged-in user
router.post('/:id/accept', protect, acceptInvitationById);
router.post('/:id/decline', protect, declineInvitationById);

export default router;
