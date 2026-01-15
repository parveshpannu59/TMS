import { body, ValidationChain } from 'express-validator';

// LOAD VALIDATOR
export class LoadValidator {
  static createLoad(): ValidationChain[] {
    return [
      body('customerName').trim().notEmpty().withMessage('Customer name is required'),
      body('customerContact')
        .trim()
        .notEmpty()
        .withMessage('Customer contact is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Contact must be 10 digits'),
      body('pickupLocation.address').notEmpty().withMessage('Pickup address is required'),
      body('pickupLocation.city').notEmpty().withMessage('Pickup city is required'),
      body('pickupLocation.state').notEmpty().withMessage('Pickup state is required'),
      body('pickupLocation.pincode')
        .notEmpty()
        .matches(/^[0-9]{6}$/)
        .withMessage('Pickup pincode must be 6 digits'),
      body('deliveryLocation.address').notEmpty().withMessage('Delivery address is required'),
      body('deliveryLocation.city').notEmpty().withMessage('Delivery city is required'),
      body('deliveryLocation.state').notEmpty().withMessage('Delivery state is required'),
      body('deliveryLocation.pincode')
        .notEmpty()
        .matches(/^[0-9]{6}$/)
        .withMessage('Delivery pincode must be 6 digits'),
      body('pickupDate').isISO8601().withMessage('Valid pickup date is required'),
      body('expectedDeliveryDate').isISO8601().withMessage('Valid delivery date is required'),
      body('cargoType').trim().notEmpty().withMessage('Cargo type is required'),
      body('cargoDescription').trim().notEmpty().withMessage('Cargo description is required'),
      body('weight').isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
      body('loadType').isIn(['FTL', 'LTL']).withMessage('Invalid load type'),
      body('rate').isFloat({ min: 0 }).withMessage('Rate must be a positive number'),
      body('distance').isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
    ];
  }

  static updateLoadStatus(): ValidationChain[] {
    return [
      body('status')
        .isIn(['created', 'assigned', 'in_transit', 'delivered', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
    ];
  }
}

// DRIVER VALIDATOR
export class DriverValidator {
  static createDriver(): ValidationChain[] {
    return [
      body('name')
        .trim()
        .notEmpty()
        .withMessage('Driver name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
      body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
      body('licenseNumber').trim().notEmpty().withMessage('License number is required'),
      body('licenseExpiry').isISO8601().withMessage('Valid license expiry date is required'),
      body('address').trim().notEmpty().withMessage('Address is required'),
      body('city').trim().notEmpty().withMessage('City is required'),
      body('state').trim().notEmpty().withMessage('State is required'),
      body('pincode')
        .trim()
        .notEmpty()
        .matches(/^[0-9]{6}$/)
        .withMessage('Pincode must be 6 digits'),
      body('emergencyContact')
        .trim()
        .notEmpty()
        .withMessage('Emergency contact is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Emergency contact must be 10 digits'),
      body('emergencyContactName')
        .trim()
        .notEmpty()
        .withMessage('Emergency contact name is required'),
    ];
  }

  static updateDriver(): ValidationChain[] {
    return [
      body('name').optional().trim().isLength({ min: 2, max: 100 }),
      body('phone').optional().trim().matches(/^[0-9]{10}$/),
      body('licenseNumber').optional().trim(),
      body('licenseExpiry').optional().isISO8601(),
      body('pincode').optional().trim().matches(/^[0-9]{6}$/),
      body('emergencyContact').optional().trim().matches(/^[0-9]{10}$/),
    ];
  }
}

// TRUCK VALIDATOR
export class TruckValidator {
  static createTruck(): ValidationChain[] {
    return [
      body('truckNumber').trim().notEmpty().withMessage('Truck number is required'),
      body('make').trim().notEmpty().withMessage('Make is required'),
      body('model').trim().notEmpty().withMessage('Model is required'),
      body('year')
        .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
        .withMessage('Valid year is required'),
      body('truckType').trim().notEmpty().withMessage('Truck type is required'),
      body('capacity').isFloat({ min: 0 }).withMessage('Capacity must be a positive number'),
      body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
      body('registrationExpiry').isISO8601().withMessage('Valid registration expiry is required'),
      body('fuelType')
        .optional()
        .isIn(['Diesel', 'Petrol', 'CNG', 'Electric'])
        .withMessage('Invalid fuel type'),
    ];
  }

  static updateTruck(): ValidationChain[] {
    return [
      body('truckNumber').optional().trim(),
      body('make').optional().trim(),
      body('model').optional().trim(),
      body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
      body('capacity').optional().isFloat({ min: 0 }),
      body('registrationExpiry').optional().isISO8601(),
    ];
  }
}