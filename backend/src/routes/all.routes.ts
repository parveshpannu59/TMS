import { Router } from 'express';
import { LoadController } from '../controllers/load.controller';
import { GPSController } from '../controllers/gps.controller';
import { DriverController } from '../controllers/driver.controller';
import { TruckController } from '../controllers/truck.controller';
import { LoadValidator, DriverValidator, TruckValidator } from '../validators/all.validators';
import { handleValidationErrors } from '../middleware/validation.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

// LOAD ROUTES
export const loadRoutes = Router();
loadRoutes.use(authenticate);

loadRoutes.get('/stats', authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.ACCOUNTANT), LoadController.getLoadStats);

loadRoutes.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadValidator.createLoad(),
  handleValidationErrors,
  LoadController.createLoad
);

loadRoutes.get('/', LoadController.getAllLoads);
loadRoutes.get('/:id', LoadController.getLoadById);

loadRoutes.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  handleValidationErrors,
  LoadController.updateLoad
);

loadRoutes.patch(
  '/:id/status',
  authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER),
  LoadValidator.updateLoadStatus(),
  handleValidationErrors,
  LoadController.updateLoadStatus
);

loadRoutes.delete('/:id', authorize(UserRole.OWNER, UserRole.DISPATCHER), LoadController.deleteLoad);

// GPS ROUTES
export const gpsRoutes = Router();
gpsRoutes.use(authenticate);

gpsRoutes.get('/status', GPSController.checkGPSStatus);
gpsRoutes.post('/update-location', GPSController.updateLocation);
gpsRoutes.get('/load/:loadId/location', GPSController.getCurrentLocation);
gpsRoutes.get('/load/:loadId/history', GPSController.getLocationHistory);
gpsRoutes.get('/load/:loadId/route', GPSController.getRouteData);
gpsRoutes.post('/start-tracking/:loadId', GPSController.startTracking);
gpsRoutes.post('/stop-tracking/:loadId', GPSController.stopTracking);
gpsRoutes.get('/active-loads', GPSController.getActiveTrackedLoads);

// DRIVER ROUTES
export const driverRoutes = Router();
driverRoutes.use(authenticate);

driverRoutes.get('/stats', authorize(UserRole.OWNER, UserRole.DISPATCHER), DriverController.getDriverStats);
driverRoutes.get('/available', authorize(UserRole.OWNER, UserRole.DISPATCHER), DriverController.getAvailableDrivers);

driverRoutes.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  DriverValidator.createDriver(),
  handleValidationErrors,
  DriverController.createDriver
);

driverRoutes.get('/', authorize(UserRole.OWNER, UserRole.DISPATCHER), DriverController.getAllDrivers);
driverRoutes.get('/:id', authorize(UserRole.OWNER, UserRole.DISPATCHER), DriverController.getDriverById);

driverRoutes.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  DriverValidator.updateDriver(),
  handleValidationErrors,
  DriverController.updateDriver
);

driverRoutes.delete('/:id', authorize(UserRole.OWNER), DriverController.deleteDriver);

// TRUCK ROUTES
export const truckRoutes = Router();
truckRoutes.use(authenticate);

truckRoutes.get('/stats', authorize(UserRole.OWNER, UserRole.DISPATCHER), TruckController.getTruckStats);
truckRoutes.get('/available', authorize(UserRole.OWNER, UserRole.DISPATCHER), TruckController.getAvailableTrucks);

truckRoutes.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  TruckValidator.createTruck(),
  handleValidationErrors,
  TruckController.createTruck
);

truckRoutes.get('/', authorize(UserRole.OWNER, UserRole.DISPATCHER), TruckController.getAllTrucks);
truckRoutes.get('/:id', authorize(UserRole.OWNER, UserRole.DISPATCHER), TruckController.getTruckById);

truckRoutes.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  TruckValidator.updateTruck(),
  handleValidationErrors,
  TruckController.updateTruck
);

truckRoutes.delete('/:id', authorize(UserRole.OWNER), TruckController.deleteTruck);