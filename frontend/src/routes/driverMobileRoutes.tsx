import { Navigate } from 'react-router-dom';
import DriverMobileShell from '../layouts/mobile/DriverMobileShell';
import DriverDashboardMobile from '../pages/driver/DriverDashboardMobile';
import DriverTripsMobile from '../pages/driver/DriverTripsMobile';
import DriverMessagesMobile from '../pages/driver/DriverMessagesMobile';
import DriverSettingsMobile from '../pages/driver/DriverSettingsMobile';
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
      { path: 'trips', element: <DriverTripsMobile /> },
      { path: 'messages', element: <DriverMessagesMobile /> },
      { path: 'settings', element: <DriverSettingsMobile /> },
    ],
  },
];
