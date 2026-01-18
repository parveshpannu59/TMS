# Driver Load Assignment Fix - Implementation Guide

## Issue Summary
**Problem:** Loads assigned by Dispatcher/Owner were not appearing in the Driver App because driver profiles were not linked to user accounts.

**Root Cause:** The Driver model didn't have a `userId` field to establish a relationship between the driver profile and the user login account.

---

## Solution Overview

### Backend Changes

#### 1. Driver Model Update
- **File:** `backend/src/models/Driver.model.ts`
- **Change:** Added `userId` field to link driver profiles to user accounts
```typescript
export interface IDriver extends Document {
  userId?: string; // Reference to User account for driver login
  name: string;
  // ... rest of fields
}
```

#### 2. New API Endpoints

##### a) Get Driver Profile for Current User
- **Route:** `GET /api/drivers/me/profile`
- **Purpose:** Allows logged-in drivers to fetch their own profile
- **Authorization:** All authenticated users
- **Implementation:**
  - Controller: `DriverController.getMyProfile`
  - Service: `DriverService.getDriverByUserId`

##### b) Get Assigned Loads for Current Driver
- **Route:** `GET /api/loads/me/assigned`
- **Purpose:** Fetches all loads assigned to the currently logged-in driver
- **Authorization:** Driver role only
- **Implementation:**
  - Controller: `LoadController.getMyAssignedLoads`
  - Automatically finds driver profile using `userId` and returns their loads

### Frontend Changes

#### 1. Driver API Updates
- **File:** `frontend/src/api/driver.api.ts`
- **New Method:** `getMyProfile()` - Fetches driver profile for logged-in user

#### 2. Load API Updates
- **File:** `frontend/src/api/load.api.ts`
- **New Method:** `getMyAssignedLoads()` - Fetches loads assigned to current driver

#### 3. Driver Dashboard Simplification
- **File:** `frontend/src/pages/DriverDashboard.tsx`
- **Change:** Simplified load fetching to use new dedicated endpoint
- **Before:** Complex logic to match driver by email/phone
- **After:** Single API call to `loadApi.getMyAssignedLoads()`

---

## How Load Assignment Works Now

### Complete Flow

1. **Dispatcher/Owner Creates Load**
   - Navigate to Loads page
   - Click "Create Load" button
   - Fill in load details (origin, destination, cargo, rate, etc.)
   - Save the load (status: BOOKED)

2. **Dispatcher/Owner Assigns Load to Driver**
   - On Loads page, find the load to assign
   - Click the "Assign" button (truck icon)
   - **Assignment Dialog Opens:**
     - Select **Driver** (must be active)
     - Select **Truck** (must be available)
     - Select **Trailer** (must be available)
   - Click "Assign"
   - **Backend Process:**
     - Updates `load.driverId`, `load.truckId`, `load.trailerId`
     - Changes load status to ASSIGNED
     - Updates driver status to ON_TRIP
     - Updates truck status to on_road
     - Updates trailer status to on_road
     - Sends notification to driver

3. **Driver Sees Assigned Load**
   - Driver logs in to their account
   - **Driver Dashboard automatically:**
     - Calls `/api/drivers/me/profile` to get driver profile
     - Calls `/api/loads/me/assigned` to get assigned loads
     - Displays all loads assigned to them
     - Shows current active load prominently

4. **Driver Accepts and Starts Trip**
   - Driver can view load details
   - Accept the trip
   - Fill in driver form details
   - Start the trip
   - Continue through trip workflow

---

## Critical Setup Requirement

### Linking Drivers to User Accounts

**IMPORTANT:** For drivers to see their assigned loads, their driver profile **MUST** be linked to their user account.

### Option 1: Link Existing Drivers (Database Update)

If you already have driver profiles and user accounts, you need to link them:

```javascript
// Run this in MongoDB shell or create a script
// This is a one-time setup

// Example: Link driver with email "john@example.com" to their user account
db.drivers.updateOne(
  { email: "john@example.com" },
  { $set: { userId: db.users.findOne({ email: "john@example.com" })._id } }
);

// Or link all drivers that have matching emails
db.drivers.find({ email: { $exists: true, $ne: null } }).forEach(function(driver) {
  const user = db.users.findOne({ email: driver.email, role: "driver" });
  if (user) {
    db.drivers.updateOne(
      { _id: driver._id },
      { $set: { userId: user._id } }
    );
    print("Linked driver: " + driver.name + " to user: " + user.email);
  } else {
    print("No user found for driver: " + driver.name + " (" + driver.email + ")");
  }
});
```

### Option 2: Update Driver Creation Flow (Recommended for New Drivers)

When creating a new driver, you should also create a user account for them:

1. **Create User Account First:**
   ```typescript
   POST /api/auth/register
   {
     "name": "John Doe",
     "email": "john@example.com",
     "phone": "1234567890",
     "password": "SecurePassword123",
     "role": "driver"
   }
   ```
   - Save the returned `userId`

2. **Create Driver Profile with userId:**
   ```typescript
   POST /api/drivers
   {
     "userId": "<user_id_from_step_1>",
     "name": "John Doe",
     "email": "john@example.com",
     "phone": "1234567890",
     "licenseNumber": "DL12345678",
     "licenseExpiry": "2025-12-31",
     "address": "123 Main St",
     "city": "Chennai",
     "state": "Tamil Nadu",
     "pincode": "600001",
     "emergencyContact": "9876543210",
     "emergencyContactName": "Jane Doe",
     "salary": 30000
   }
   ```

### Option 3: Quick Fix Script (Backend Utility)

Create a utility script to link drivers by email:

```typescript
// backend/src/scripts/linkDriversToUsers.ts
import mongoose from 'mongoose';
import { Driver } from '../models/Driver.model';
import { User } from '../models/User.model';
import { config } from '../config/env';

async function linkDriversToUsers() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    const drivers = await Driver.find({ 
      email: { $exists: true, $ne: null },
      userId: { $exists: false } 
    });

    console.log(`Found ${drivers.length} drivers without userId`);

    for (const driver of drivers) {
      const user = await User.findOne({ 
        email: driver.email, 
        role: 'driver' 
      });

      if (user) {
        driver.userId = user._id.toString();
        await driver.save();
        console.log(`✓ Linked driver ${driver.name} to user ${user.email}`);
      } else {
        console.log(`✗ No user found for driver ${driver.name} (${driver.email})`);
      }
    }

    console.log('Linking complete!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

linkDriversToUsers();
```

Run with: `npm run tsx src/scripts/linkDriversToUsers.ts`

---

## Testing the Fix

### Test Scenario 1: New Assignment

1. **Login as Dispatcher/Owner**
2. **Create a new load** or select existing load
3. **Assign the load:**
   - Click "Assign" button
   - Select driver, truck, trailer
   - Confirm assignment
4. **Verify assignment:**
   - Load status should change to "ASSIGNED"
   - Driver column should show driver name
5. **Login as the assigned Driver**
6. **Check Driver Dashboard:**
   - Assigned load should appear in the loads list
   - Load details should be visible
   - Driver can proceed with accept/start trip

### Test Scenario 2: Multiple Loads

1. Assign multiple loads to the same driver
2. Login as that driver
3. All assigned loads should appear
4. Active (non-completed) load should be highlighted

### Test Scenario 3: Driver Without userId

1. If a driver doesn't have userId set:
   - They will get "Driver profile not found" error
   - Solution: Link their driver profile to user account (see setup steps above)

---

## API Reference

### Driver Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/drivers/me/profile` | Driver | Get current driver's profile |
| GET | `/api/drivers` | All | Get all drivers |
| GET | `/api/drivers/:id` | All | Get driver by ID |
| POST | `/api/drivers` | Owner/Dispatcher | Create driver |
| PUT | `/api/drivers/:id` | Owner/Dispatcher | Update driver |
| DELETE | `/api/drivers/:id` | Owner | Delete driver |

### Load Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/loads/me/assigned` | Driver | Get my assigned loads |
| GET | `/api/loads` | All | Get all loads (with filters) |
| GET | `/api/loads/:id` | All | Get load by ID |
| POST | `/api/loads` | Owner/Dispatcher | Create load |
| PUT | `/api/loads/:id` | Owner/Dispatcher | Update load |
| POST | `/api/loads/:id/assign` | Owner/Dispatcher | Assign load to driver |
| DELETE | `/api/loads/:id` | Owner/Dispatcher | Delete load |

---

## Troubleshooting

### Problem: Driver doesn't see assigned loads

**Possible Causes:**
1. **Driver profile not linked to user account**
   - Solution: Check if driver has `userId` field set
   - Fix: Use one of the linking methods described above

2. **Load not properly assigned**
   - Solution: Check load in database, ensure `driverId` is set
   - Fix: Re-assign the load through UI

3. **Wrong user logged in**
   - Solution: Verify driver is logged in with correct account
   - Fix: Ensure email matches between User and Driver

### Problem: Cannot assign load

**Possible Causes:**
1. **Driver not available**
   - Solution: Check driver status is "ACTIVE"
   - Fix: Update driver status to ACTIVE

2. **Truck/Trailer not available**
   - Solution: Check truck/trailer status
   - Fix: Update status to "available"

3. **Load already assigned**
   - Solution: Check load status
   - Fix: Unassign or create new load

---

## Database Schema Changes

### Driver Model
```typescript
{
  _id: ObjectId,
  userId: String (reference to User._id), // NEW FIELD
  name: String,
  email: String,
  phone: String,
  licenseNumber: String,
  licenseExpiry: Date,
  status: Enum['active', 'inactive', 'on_trip'],
  currentLoadId: String,
  // ... other fields
}
```

### Load Model (Unchanged, already had this)
```typescript
{
  _id: ObjectId,
  loadNumber: String,
  driverId: String (reference to Driver._id),
  truckId: String (reference to Truck._id),
  trailerId: String (reference to Trailer._id),
  status: Enum[...],
  // ... other fields
}
```

---

## Summary

The driver load assignment flow is now fully functional with the following improvements:

1. ✅ **Driver Model Enhanced** - Added `userId` field for user account linkage
2. ✅ **New API Endpoints** - Driver profile and assigned loads endpoints
3. ✅ **Simplified Driver Dashboard** - Direct API calls for assigned loads
4. ✅ **Existing Assignment UI** - Already working, no changes needed
5. ✅ **Complete Workflow** - Dispatcher assigns → Driver sees and accepts

**Next Steps:**
1. Link existing drivers to user accounts (see setup instructions)
2. Test the complete flow
3. For new drivers, ensure user account is created with driver profile

The system is now ready for end-to-end load assignment and driver trip management!
