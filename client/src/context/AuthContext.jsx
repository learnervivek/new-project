import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { useToast } from './ToastContext';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  /**
   * Check current session on mount via HTTP-only cookie
   */
  const checkSession = useCallback(async () => {
    try {
      const data = await authService.getCurrentUser();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // 401 or network error means no active session
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Log in user
   */
  const login = async ({ email, password }) => {
    try {
      const data = await authService.login({ email, password });
      if (data.success && data.user) {
        setUser(data.user);
        toast.success('Welcome Back!', data.message || `Signed in as ${data.user.name}`);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err) {
      const message = err.message || 'Failed to sign in. Please verify your credentials.';
      toast.error('Sign In Failed', message);
      return { success: false, message };
    }
  };

  /**
   * Register new user
   */
  const register = async ({ name, email, password, confirmPassword }) => {
    try {
      const data = await authService.register({ name, email, password, confirmPassword });
      if (data.success && data.user) {
        setUser(data.user);
        toast.success('Account Created!', `Welcome to TripTally, ${data.user.name}!`);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (err) {
      const message = err.message || 'Registration could not be completed.';
      toast.error('Registration Failed', message);
      return { success: false, message };
    }
  };

  /**
   * Logout user & clear cookie
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('[Auth] Logout warning:', err.message);
    } finally {
      setUser(null);
      toast.info('Signed Out', 'You have been logged out of TripTally.');
    }
  };

  /**
   * Update profile
   */
  const updateProfile = async ({ name, avatar, bio }) => {
    try {
      const data = await authService.updateProfile({ name, avatar, bio });
      if (data.success && data.user) {
        setUser(data.user);
        toast.success('Profile Updated', 'Your profile details have been saved.');
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message };
    } catch (err) {
      const message = err.message || 'Could not update profile.';
      toast.error('Update Failed', message);
      return { success: false, message };
    }
  };

  /**
   * Upload user avatar photo
   */
  const uploadAvatar = async (file) => {
    try {
      const data = await authService.uploadAvatar(file);
      if (data.success && data.user) {
        setUser(data.user);
        toast.success('Photo Uploaded', data.message || 'Profile photo updated successfully.');
        return { success: true, user: data.user, avatarUrl: data.avatarUrl };
      }
      return { success: false, message: data.message };
    } catch (err) {
      const message = err.message || 'Failed to upload photo.';
      toast.error('Upload Failed', message);
      return { success: false, message };
    }
  };

  /**
   * Request password reset token
   */
  const forgotPassword = async (email) => {
    try {
      const data = await authService.forgotPassword(email);
      toast.info('Reset Link Sent', data.message);
      return data;
    } catch (err) {
      const message = err.message || 'Failed to request password reset.';
      toast.error('Reset Failed', message);
      throw err;
    }
  };

  /**
   * Reset password with token
   */
  const resetPassword = async (token, { password, confirmPassword }) => {
    try {
      const data = await authService.resetPassword(token, { password, confirmPassword });
      if (data.success && data.user) {
        setUser(data.user);
        toast.success('Password Updated', 'Your password has been reset and you are now signed in.');
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message };
    } catch (err) {
      const message = err.message || 'Failed to reset password. Link may be expired.';
      toast.error('Reset Error', message);
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    updateProfile,
    uploadAvatar,
    forgotPassword,
    resetPassword,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
