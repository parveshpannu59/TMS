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
const AccountingPage = lazy(() => import('@pages/AccountingPage'));
const SettingsPage = lazy(() => import('@pages/SettingsPage'));
const ActivityHistoryPage = lazy(() => import('@pages/ActivityHistoryPage'));
const DriverDashboard = lazy(() => import('@pages/DriverDashboard'));

export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback fullScreen message="Loading application..." />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};