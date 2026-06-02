import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import './index.css';

// Pages
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import TrackPage from './pages/TrackPage';
import LessonPage from './pages/LessonPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminChapters from './pages/admin/AdminChapters';
import AdminLessons from './pages/admin/AdminLessons';
import AdminProgress from './pages/admin/AdminProgress';
import AdminUsers from './pages/admin/AdminUsers';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !profile?.is_admin) return <Navigate to="/track" replace />;

  return children;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={profile?.is_admin ? '/admin' : '/track'} replace /> : <LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Learner routes */}
      <Route path="/track" element={<ProtectedRoute><TrackPage /></ProtectedRoute>} />
      <Route path="/lesson/:lessonId" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/chapters" element={<ProtectedRoute adminOnly><AdminChapters /></ProtectedRoute>} />
      <Route path="/admin/chapters/:chapterId/lessons" element={<ProtectedRoute adminOnly><AdminLessons /></ProtectedRoute>} />
      <Route path="/admin/progress" element={<ProtectedRoute adminOnly><AdminProgress /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to={user ? (profile?.is_admin ? '/admin' : '/track') : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
