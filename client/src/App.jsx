import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import TripsListPage from './pages/TripsListPage';
import TripDetailsPage from './pages/TripDetailsPage';
import InvitationsPage from './pages/InvitationsPage';
import NotificationsPage from './pages/NotificationsPage';
import AiTripPlannerPage from './pages/AiTripPlannerPage';
import ToastProvider from './context/ToastContext';

import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Public Website Shell */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password/:token" element={<ResetPasswordPage />} />
          </Route>

          {/* Authenticated Dashboard Shell */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="trips" element={<TripsListPage />} />
            <Route path="trips/:id" element={<TripDetailsPage />} />
            <Route path="ai-trip-planner" element={<AiTripPlannerPage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />

          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
