import { Router } from 'express';
import {
  getDashboardData,
  getTrips,
  createTrip,
  getTripById,
  updateTrip,
  archiveTrip,
  deleteTrip,
  joinTrip,
  uploadTripBanner,
} from '../controllers/tripController.js';
import {
  inviteMember,
  getTripInvitations,
  revokeInvitation,
  removeMember,
  updateMemberRole,
} from '../controllers/invitationController.js';
import {
  getItinerary,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  reorderItineraryItems,
  geocodeQuery,
} from '../controllers/itineraryController.js';
import {
  getTripExpenses,
  getExpenseBalances,
  createExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getTripSettlements,
  createSettlement,
  deleteSettlement,
  uploadReceipt,
} from '../controllers/expenseController.js';
import {
  getTripAnalytics,
  updateBudgetAlertThreshold,
} from '../controllers/analyticsController.js';
import {
  getPackingItems,
  createPackingItem,
  togglePackingItem,
  updatePackingItem,
  deletePackingItem,
} from '../controllers/packingController.js';
import { getTripActivities } from '../controllers/activityController.js';
import { receiptUpload, bannerUpload } from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';
import { tripPaymentRouter } from './paymentRoutes.js';

const router = Router();

// All trip routes require authentication
router.use(protect);

router.get('/dashboard', getDashboardData);
router.get('/geocode', geocodeQuery);
router.post('/upload-banner', bannerUpload.single('banner'), uploadTripBanner);
router.get('/', getTrips);
router.post('/', createTrip);
router.get('/:id', getTripById);
router.put('/:id', updateTrip);
router.patch('/:id/archive', archiveTrip);
router.delete('/:id', deleteTrip);
router.post('/join/:inviteCode', joinTrip);

// Trip Invitations & Members
router.post('/:id/invitations', inviteMember);
router.get('/:id/invitations', getTripInvitations);
router.delete('/:id/invitations/:invitationId', revokeInvitation);
router.delete('/:id/members/:userId', removeMember);
router.patch('/:id/members/:userId/role', updateMemberRole);

// Daily Itinerary Planner Endpoints
router.get('/:tripId/itinerary', getItinerary);
router.post('/:tripId/itinerary', createItineraryItem);
router.patch('/:tripId/itinerary/reorder', reorderItineraryItems);
router.put('/:tripId/itinerary/:itemId', updateItineraryItem);
router.delete('/:tripId/itinerary/:itemId', deleteItineraryItem);

// Group Expenses & Budget Endpoints
router.get('/:tripId/expenses', getTripExpenses);
router.get('/:tripId/expenses/balances', getExpenseBalances);
router.post('/:tripId/expenses', createExpense);
router.post('/:tripId/expenses/upload-receipt', receiptUpload.single('receipt'), uploadReceipt);
router.get('/:tripId/expenses/:expenseId', getExpenseById);
router.put('/:tripId/expenses/:expenseId', updateExpense);
router.delete('/:tripId/expenses/:expenseId', deleteExpense);

// Debt Settlements Endpoints
router.get('/:tripId/settlements', getTripSettlements);
router.post('/:tripId/settlements', createSettlement);
router.delete('/:tripId/settlements/:settlementId', deleteSettlement);

// Budget Analytics Endpoints
router.get('/:tripId/analytics', getTripAnalytics);
router.patch('/:tripId/budget-alert', updateBudgetAlertThreshold);

// Packing Checklist Endpoints
router.get('/:tripId/packing', getPackingItems);
router.post('/:tripId/packing', createPackingItem);
router.patch('/:tripId/packing/:itemId/toggle', togglePackingItem);
router.put('/:tripId/packing/:itemId', updatePackingItem);
router.delete('/:tripId/packing/:itemId', deletePackingItem);

// Activity Feed Endpoints
router.get('/:tripId/activities', getTripActivities);

// Razorpay Payments & Settlements Integration
router.use('/:tripId/payments', tripPaymentRouter);

export default router;
