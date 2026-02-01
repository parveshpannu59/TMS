// import React, { Suspense, lazy } from 'react';
// import { Routes, Route, Navigate } from 'react-router-dom';
// import { ProtectedRoute } from '@components/auth/ProtectedRoute';
// import { LoadingSpinner } from '@components/common/LoadingSpinner';

// const Login = lazy(() => import('@pages/Login'));
// const Dashboard = lazy(() => import('@pages/Dashboard'));
// const UsersPage = lazy(() => import('@pages/UsersPage'));

// export const AppRoutes: React.FC = () => {
//   return (
//     <Suspense fallback={<LoadingSpinner />}>
//       <Routes>
//         <Route path="/login" element={<Login />} />

//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute>
//               <Dashboard />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/users"
//           element={
//             <ProtectedRoute>
//               <UsersPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route path="/" element={<Navigate to="/dashboard" replace />} />

//         <Route path="*" element={<Navigate to="/dashboard" replace />} />
//       </Routes>
//     </Suspense>
//   );
// };
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@components/auth/ProtectedRoute';
import { LoadingFallback } from '@components/common/LoadingFallback';

// Lazy load all pages for better performance
const Login = lazy(() => import('@pages/Login'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const UsersPage = lazy(() => import('@pages/UsersPage'));
const LoadsPage = lazy(() => import('@pages/LoadsPage'));
const TrucksPage = lazy(() => import('@pages/TrucksPage'));
const TrailersPage = lazy(() => import('@pages/TrailersPage'));
const DriversPage = lazy(() => import('@pages/DriversPage'));
const TripManagementDashboard = lazy(() => import('@pages/TripManagementDashboard'));
const AccountingPage = lazy(() => import('@pages/AccountingPage'));
const SettingsPage = lazy(() => import('@pages/SettingsPage'));
const ActivityHistoryPage = lazy(() => import('@pages/ActivityHistoryPage'));
const DriverDashboard = lazy(() => import('@pages/DriverDashboard'));
const PendingAssignmentsPage = lazy(() => import('@pages/driver/PendingAssignmentsPage'));
import DriverMobileShell from '../layouts/mobile/DriverMobileShell';
import DriverDashboardMobile from '../pages/driver/DriverDashboardMobile';
import DriverTripsMobile from '../pages/driver/DriverTripsMobile';
import DriverMessagesMobile from '../pages/driver/DriverMessagesMobile';
import DriverLoginMobile from '../pages/driver/DriverLoginMobile';
import DriverSettingsMobile from '../pages/driver/DriverSettingsMobile';
import { DriverMobileProvider } from '../contexts/DriverMobileContext';
import { isDriverAuthenticated } from '../utils/mobileAuth';

function roleIsDriver() {
  try {
    const raw = localStorage.getItem('driver_mobile_auth_v1');
    if (!raw) return false;
    const data = JSON.parse(raw);
    const role = data?.role || data?.user?.role || data?.user?.userType;
    return role === 'driver';
  } catch {
    return false;
  }
}

function DriverMobileGuard({ children }: { children: JSX.Element }) {
  const ok = isDriverAuthenticated();
  if (!ok) return <Navigate to="/driver/login" replace />;
  return children;
}

export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback fullScreen message="Loading application..." />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            roleIsDriver() ? (
              <Navigate to="/driver/mobile/dashboard" replace />
            ) : (
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loads"
          element={
            <ProtectedRoute>
              <LoadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trucks"
          element={
            <ProtectedRoute>
              <TrucksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trailers"
          element={
            <ProtectedRoute>
              <TrailersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drivers"
          element={
            <ProtectedRoute>
              <DriversPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips"
          element={
            <ProtectedRoute>
              <TripManagementDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting"
          element={
            <ProtectedRoute>
              <AccountingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <ActivityHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver"
          element={
            <ProtectedRoute>
              <DriverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute>
              <PendingAssignmentsPage />
            </ProtectedRoute>
          }
        />

        {/* Mobile-only driver routes */}
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
          <Route path="trips" element={<DriverTripsMobile />} />
          <Route path="messages" element={<DriverMessagesMobile />} />
          <Route path="settings" element={<DriverSettingsMobile />} />
        </Route>
        <Route path="/" element={roleIsDriver() ? <Navigate to="/driver/mobile/dashboard" replace /> : <Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};