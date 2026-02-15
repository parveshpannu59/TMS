import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@components/auth/ProtectedRoute';
import { LoadingFallback } from '@components/common/LoadingFallback';

// Lazy load all pages for better performance
const Login = lazy(() => import('@pages/Login'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const UsersPage = lazy(() => import('@pages/UsersPage'));
const LoadsPage = lazy(() => import('@pages/LoadsPage'));
const VehiclesPage = lazy(() => import('@pages/VehiclesPage'));
const TrucksPage = lazy(() => import('@pages/TrucksPage'));
const TrailersPage = lazy(() => import('@pages/TrailersPage'));
const DriversPage = lazy(() => import('@pages/DriversPage'));
const TripManagementDashboard = lazy(() => import('@pages/TripManagementDashboard'));
const AccountingPage = lazy(() => import('@pages/AccountingPage'));
const SettingsPage = lazy(() => import('@pages/SettingsPage'));
const ActivityHistoryPage = lazy(() => import('@pages/ActivityHistoryPage'));
const MessagesPage = lazy(() => import('@pages/MessagesPage'));
const MaintenancePage = lazy(() => import('@pages/MaintenancePage'));
const ResourcesPage = lazy(() => import('@pages/ResourcesPage'));
const DriverDashboard = lazy(() => import('@pages/DriverDashboard'));
const PendingAssignmentsPage = lazy(() => import('@pages/driver/PendingAssignmentsPage'));
const DriverMobileShell = lazy(() => import('../layouts/mobile/DriverMobileShell'));
const DriverDashboardMobile = lazy(() => import('../pages/driver/DriverDashboardMobile'));
const DriverTripsMobile = lazy(() => import('../pages/driver/DriverTripsMobile'));
const DriverMessagesMobile = lazy(() => import('../pages/driver/DriverMessagesMobile'));
const DriverLoadDetailMobile = lazy(() => import('../pages/driver/DriverLoadDetailMobile'));
const LoadTrackingMobile = lazy(() => import('../pages/driver/LoadTrackingMobile'));
const DriverLoginMobile = lazy(() => import('../pages/driver/DriverLoginMobile'));
const DriverSettingsMobile = lazy(() => import('../pages/driver/DriverSettingsMobile'));
import { DriverMobileProvider } from '../contexts/DriverMobileContext';
import { isDriverAuthenticated } from '../utils/mobileAuth';

// ─── Unified owner/dispatcher layout shell ──────
const OwnerShell = lazy(() => import('../layouts/OwnerShell'));

function roleIsDriver() {
  try {
    // Only consider it a driver session if the driver-specific mobile auth exists
    // AND a valid session token exists (prevents stale localStorage after logout)
    const hasSessionToken = !!sessionStorage.getItem('auth_token');
    const raw = localStorage.getItem('driver_mobile_auth_v1');
    if (!raw || !hasSessionToken) return false;
    const data = JSON.parse(raw);
    const role = data?.role || data?.user?.role || data?.user?.userType;
    return role === 'driver';
  } catch {
    return false;
  }
}

function DriverMobileGuard({ children }: { children: JSX.Element }) {
  const ok = isDriverAuthenticated();
  if (!ok) return <Navigate to="/login" replace />;
  return children;
}

export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback fullScreen message="Loading application..." />}>
      <Routes>
        {/* ─── Public ── */}
        <Route path="/login" element={<Login />} />

        {/* ─── Owner / Dispatcher pages — all share OwnerShell layout ── */}
        <Route
          element={
            <ProtectedRoute>
              <OwnerShell />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={roleIsDriver() ? <Navigate to="/driver/mobile/dashboard" replace /> : <Dashboard />}
          />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/loads" element={<LoadsPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/trucks" element={<TrucksPage />} />
          <Route path="/trailers" element={<TrailersPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/trips" element={<TripManagementDashboard />} />
          <Route path="/accounting" element={<AccountingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/history" element={<ActivityHistoryPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/assignments" element={<PendingAssignmentsPage />} />
        </Route>

        {/* ─── Mobile-only driver routes ── */}
        <Route path="/driver/login" element={<DriverLoginMobile />} />
        <Route
          path="/driver/mobile"
          element={
            <DriverMobileGuard>
              <DriverMobileProvider>
                <DriverMobileShell />
              </DriverMobileProvider>
            </DriverMobileGuard>
          }
        >
          <Route index element={<Navigate to="/driver/mobile/dashboard" replace />} />
          <Route path="dashboard" element={<DriverDashboardMobile />} />
          <Route path="load/:id" element={<DriverLoadDetailMobile />} />
          <Route path="tracking/:id" element={<LoadTrackingMobile />} />
          <Route path="trips" element={<DriverTripsMobile />} />
          <Route path="messages" element={<DriverMessagesMobile />} />
          <Route path="settings" element={<DriverSettingsMobile />} />
        </Route>

        {/* ─── Fallbacks ── */}
        <Route path="/" element={roleIsDriver() ? <Navigate to="/driver/mobile/dashboard" replace /> : <Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
