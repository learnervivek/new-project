import api from '../lib/api';

/**
 * Authentication API Service Layer
 * Interacts with /api/auth endpoints using credentialed Axios instance (HTTP-only cookies).
 */
export const authService = {
  /**
   * Register a new user
   */
  async register({ name, email, password, confirmPassword }) {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
      confirmPassword,
    });
    return response.data;
  },

  /**
   * Login user with email & password
   */
  async login({ email, password }) {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Logout user and clear HTTP-only cookie
   */
  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  /**
   * Fetch current authenticated user session
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Update profile (name, avatar, bio)
   */
  async updateProfile({ name, avatar, bio }) {
    const response = await api.put('/auth/profile', {
      name,
      avatar,
      bio,
    });
    return response.data;
  },

  /**
   * Upload profile avatar image file
   */
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/auth/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Request password reset token
   */
  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   */
  async resetPassword(token, { password, confirmPassword }) {
    const response = await api.put(`/auth/reset-password/${token}`, {
      password,
      confirmPassword,
    });
    return response.data;
  },
};

export default authService;
