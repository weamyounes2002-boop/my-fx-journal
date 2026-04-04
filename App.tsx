import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { EmailVerificationGuard } from './components/EmailVerificationGuard';
import CookieConsent from './components/CookieConsent';
import { usePageTracking } from './hooks/useAnalytics';
import { Loader2 } from 'lucide-react';

// Eager load critical routes for faster initial render
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Lazy load non-critical routes to reduce initial bundle size
const Dashboard = lazy(() => import('./pages/Index'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Goals = lazy(() => import('./pages/Goals'));

// Loading component with better UX
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function AppRoutes() {
  // Automatically track page views on route changes
  usePageTracking();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/verify-email" element={<Navigate to="/dashboard" replace />} />
        
        {/* Protected routes with lazy loading */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Dashboard />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/overview"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Dashboard />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trades"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Dashboard />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/position-calculator"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Dashboard />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Accounts />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Analytics />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Goals />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/referral"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Dashboard />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile-settings"
          element={
            <ProtectedRoute>
              <EmailVerificationGuard>
                <Dashboard />
              </EmailVerificationGuard>
            </ProtectedRoute>
          }
        />
        
        {/* Catch all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" richColors />
        <AppRoutes />
        <CookieConsent />
      </Router>
    </AuthProvider>
  );
}

export default App;
