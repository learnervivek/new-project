import api from '../lib/api';

/**
 * Trip & Dashboard API Service Layer
 */
export const tripService = {
  /**
   * Fetch aggregated real-time dashboard data for authenticated user
   */
  async getDashboardData() {
    const response = await api.get('/trips/dashboard');
    return response.data;
  },

  /**
   * Fetch authorized trips with optional status, search, and pagination
   */
  async getTrips(params = {}) {
    const response = await api.get('/trips', { params });
    return response.data;
  },

  /**
   * Fetch single trip details by ID
   */
  async getTripById(id) {
    const response = await api.get(`/trips/${id}`);
    return response.data;
  },

  /**
   * Create a new collaborative trip
   */
  async createTrip(tripData) {
    const response = await api.post('/trips', tripData);
    return response.data;
  },

  /**
   * Update an existing trip
   */
  async updateTrip(id, updateData) {
    const response = await api.put(`/trips/${id}`, updateData);
    return response.data;
  },

  /**
   * Toggle or set archive status for a trip
   */
  async archiveTrip(id) {
    const response = await api.patch(`/trips/${id}/archive`);
    return response.data;
  },

  /**
   * Permanently delete a trip (owner only)
   */
  async deleteTrip(id) {
    const response = await api.delete(`/trips/${id}`);
    return response.data;
  },

  /**
   * Join an existing trip with invite code
   */
  async joinTrip(inviteCode) {
    const response = await api.post(`/trips/join/${inviteCode}`);
    return response.data;
  },

  /**
   * Send an invitation by email to a companion
   */
  async inviteMember(tripId, { email, role }) {
    const response = await api.post(`/trips/${tripId}/invitations`, { email, role });
    return response.data;
  },

  /**
   * Get all invitations for a trip
   */
  async getTripInvitations(tripId) {
    const response = await api.get(`/trips/${tripId}/invitations`);
    return response.data;
  },

  /**
   * Revoke a pending trip invitation
   */
  async revokeInvitation(tripId, invitationId) {
    const response = await api.delete(`/trips/${tripId}/invitations/${invitationId}`);
    return response.data;
  },

  /**
   * Remove a member from a trip
   */
  async removeMember(tripId, userId) {
    const response = await api.delete(`/trips/${tripId}/members/${userId}`);
    return response.data;
  },

  /**
   * Update a member's role on a trip
   */
  async updateMemberRole(tripId, userId, role) {
    const response = await api.patch(`/trips/${tripId}/members/${userId}/role`, { role });
    return response.data;
  },

  /**
   * Fetch current user's received pending invitations
   */
  async getMyInvitations() {
    const response = await api.get('/invitations/me');
    return response.data;
  },

  /**
   * Verify an invitation token
   */
  async getInvitationByToken(token) {
    const response = await api.get(`/invitations/token/${token}`);
    return response.data;
  },

  /**
   * Accept an invitation using token
   */
  async acceptInvitationByToken(token) {
    const response = await api.post(`/invitations/token/${token}/accept`);
    return response.data;
  },

  /**
   * Decline an invitation using token
   */
  async declineInvitationByToken(token) {
    const response = await api.post(`/invitations/token/${token}/decline`);
    return response.data;
  },

  /**
   * Accept an invitation by ID
   */
  async acceptInvitationById(id) {
    const response = await api.post(`/invitations/${id}/accept`);
    return response.data;
  },

  /**
   * Decline an invitation by ID
   */
  async declineInvitationById(id) {
    const response = await api.post(`/invitations/${id}/decline`);
    return response.data;
  },

  /**
   * Get all daily itinerary items for a trip
   */
  async getItinerary(tripId) {
    const response = await api.get(`/trips/${tripId}/itinerary`);
    return response.data;
  },

  /**
   * Create a new itinerary activity
   */
  async createItineraryItem(tripId, itemData) {
    const response = await api.post(`/trips/${tripId}/itinerary`, itemData);
    return response.data;
  },

  /**
   * Update an existing itinerary activity
   */
  async updateItineraryItem(tripId, itemId, itemData) {
    const response = await api.put(`/trips/${tripId}/itinerary/${itemId}`, itemData);
    return response.data;
  },

  /**
   * Delete an itinerary activity
   */
  async deleteItineraryItem(tripId, itemId) {
    const response = await api.delete(`/trips/${tripId}/itinerary/${itemId}`);
    return response.data;
  },

  /**
   * Reorder itinerary items
   */
  async reorderItineraryItems(tripId, items) {
    const response = await api.patch(`/trips/${tripId}/itinerary/reorder`, { items });
    return response.data;
  },

  /**
   * Geocode a place query via backend OSM Nominatim proxy
   */
  async geocode(query) {
    const response = await api.get('/trips/geocode', { params: { q: query } });
    return response.data;
  },

  /**
   * Get all expenses for a trip with optional filters (category, paidBy, startDate, endDate, search)
   */
  async getExpenses(tripId, params = {}) {
    const response = await api.get(`/trips/${tripId}/expenses`, { params });
    return response.data;
  },

  /**
   * Get authoritative balance breakdown, net balances, and suggested settlements
   */
  async getExpenseBalances(tripId) {
    const response = await api.get(`/trips/${tripId}/expenses/balances`);
    return response.data;
  },

  /**
   * Record a new expense with equal or custom split
   */
  async createExpense(tripId, expenseData) {
    const response = await api.post(`/trips/${tripId}/expenses`, expenseData);
    return response.data;
  },

  /**
   * Get single expense details
   */
  async getExpenseById(tripId, expenseId) {
    const response = await api.get(`/trips/${tripId}/expenses/${expenseId}`);
    return response.data;
  },

  /**
   * Update an existing expense
   */
  async updateExpense(tripId, expenseId, updateData) {
    const response = await api.put(`/trips/${tripId}/expenses/${expenseId}`, updateData);
    return response.data;
  },

  /**
   * Delete an expense
   */
  async deleteExpense(tripId, expenseId) {
    const response = await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
    return response.data;
  },

  /**
   * Get all recorded settlements for a trip
   */
  async getSettlements(tripId) {
    const response = await api.get(`/trips/${tripId}/settlements`);
    return response.data;
  },

  /**
   * Record a new settlement between members
   */
  async createSettlement(tripId, settlementData) {
    const response = await api.post(`/trips/${tripId}/settlements`, settlementData);
    return response.data;
  },

  /**
   * Delete a recorded settlement (reverses balance impact)
   */
  async deleteSettlement(tripId, settlementId) {
    const response = await api.delete(`/trips/${tripId}/settlements/${settlementId}`);
    return response.data;
  },

  /**
   * Upload an expense receipt image or PDF
   */
  async uploadReceipt(tripId, file) {
    const formData = new FormData();
    formData.append('receipt', file);
    const response = await api.post(`/trips/${tripId}/expenses/upload-receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Upload custom trip banner image
   */
  async uploadBanner(file) {
    const formData = new FormData();
    formData.append('banner', file);
    const response = await api.post('/trips/upload-banner', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get comprehensive budget analytics for a trip
   */
  async getTripAnalytics(tripId) {
    const response = await api.get(`/trips/${tripId}/analytics`);
    return response.data;
  },

  /**
   * Update budget alert threshold percentage
   */
  async updateBudgetAlertThreshold(tripId, threshold) {
    const response = await api.patch(`/trips/${tripId}/budget-alert`, { threshold });
    return response.data;
  },

  /**
   * Get all packing checklist items with optional filters
   */
  async getPackingItems(tripId, params = {}) {
    const response = await api.get(`/trips/${tripId}/packing`, { params });
    return response.data;
  },

  /**
   * Add a new item to the packing checklist
   */
  async createPackingItem(tripId, itemData) {
    const response = await api.post(`/trips/${tripId}/packing`, itemData);
    return response.data;
  },

  /**
   * Toggle packed status of a checklist item
   */
  async togglePackingItem(tripId, itemId) {
    const response = await api.patch(`/trips/${tripId}/packing/${itemId}/toggle`);
    return response.data;
  },

  /**
   * Update details of a checklist item
   */
  async updatePackingItem(tripId, itemId, updateData) {
    const response = await api.put(`/trips/${tripId}/packing/${itemId}`, updateData);
    return response.data;
  },

  /**
   * Delete an item from the packing checklist
   */
  async deletePackingItem(tripId, itemId) {
    const response = await api.delete(`/trips/${tripId}/packing/${itemId}`);
    return response.data;
  },

  /**
   * Get chronological trip activities with pagination and optional entity filter
   */
  async getTripActivities(tripId, params = {}) {
    const response = await api.get(`/trips/${tripId}/activities`, { params });
    return response.data;
  },

  /**
   * Get notifications for authenticated user
   */
  async getNotifications(params = {}) {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  /**
   * Mark single notification as read
   */
  async markNotificationRead(notificationId) {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllNotificationsRead() {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId) {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Clear all read notifications
   */
  async clearReadNotifications() {
    const response = await api.delete('/notifications/clear-read');
    return response.data;
  },

  /**
   * Get notification preferences for current user
   */
  async getNotificationPreferences() {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  /**
   * Update notification preferences for current user
   */
  async updateNotificationPreferences(preferences) {
    const response = await api.patch('/notifications/preferences', preferences);
    return response.data;
  },

  /**
   * Run scheduled trip and expense reminders check
   */
  async triggerScheduledReminders() {
    const response = await api.post('/notifications/run-reminders');
    return response.data;
  },

  /**
   * Get Razorpay configuration status and public key
   */
  async getPaymentConfig() {
    const response = await api.get('/payments/config');
    return response.data;
  },

  /**
   * Create Razorpay payment order for a settlement
   */
  async createPaymentOrder(tripId, data) {
    const response = await api.post(`/trips/${tripId}/payments/create-order`, data);
    return response.data;
  },

  /**
   * Verify Razorpay payment signature
   */
  async verifyPayment(tripId, data) {
    const response = await api.post(`/trips/${tripId}/payments/verify`, data);
    return response.data;
  },

  /**
   * Get all payment orders and online transaction history for a trip
   */
  async getTripPayments(tripId) {
    const response = await api.get(`/trips/${tripId}/payments`);
    return response.data;
  },

  /**
   * Get details for a single payment order
   */
  async getPaymentOrder(tripId, paymentOrderId) {
    const response = await api.get(`/trips/${tripId}/payments/${paymentOrderId}`);
    return response.data;
  },
};

export default tripService;


