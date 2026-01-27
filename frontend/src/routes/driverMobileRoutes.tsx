import { Navigate } from 'react-router-dom';
import DriverMobileShell from '../layouts/mobile/DriverMobileShell';
import DriverDashboardMobile from '../pages/driver/DriverDashboardMobile';
import DriverLoginMobile from '../pages/driver/DriverLoginMobile';
import { isDriverAuthenticated } from '../utils/mobileAuth';

function DriverGuard({ children }: { children: JSX.Element }) {
  const ok = isDriverAuthenticated();
  if (!ok) return <Navigate to="/driver/login" replace />;
  return children;
}

export const driverMobileRoutes = [
  { path: '/driver/login', element: <DriverLoginMobile /> },
  {
    path: '/driver/mobile',
    element: (
      <DriverGuard>
        <DriverMobileShell />
      </DriverGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/driver/mobile/dashboard" replace /> },
      { path: 'dashboard', element: <DriverDashboardMobile /> },
      // placeholders for future mobile-first driver pages
      { path: 'trips', element: <div className="dm-content">Trips (mobile)</div> },
      { path: 'messages', element: <div className="dm-content">Messages (mobile)</div> },
      { path: 'settings', element: <div className="dm-content">Settings (mobile)</div> },
    ],
  },
];
