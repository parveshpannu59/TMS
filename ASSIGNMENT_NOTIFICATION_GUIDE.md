# Assignment & Notification System - Complete Implementation Guide

## Overview

A complete workflow has been implemented allowing dispatchers to assign loads to drivers with automatic notifications and accept/reject functionality.

## Workflow Diagram

```
Dispatcher assigns Load to Driver
        ↓
Assignment record created with PENDING status
        ↓
Notification sent to Driver ("You have a load assignment")
        ↓
Driver logs in and sees notification in assignment panel
        ↓
Driver can:
  → ACCEPT → Load status changes to "trip_accepted"
  → REJECT → Load reverts to "booked", dispatcher notified
```

## Backend Implementation

### 1. Assignment Model (`backend/src/models/Assignment.ts`)

Tracks the assignment workflow:
- **Status tracking**: PENDING → ACCEPTED/REJECTED
- **Expiration**: Assignments expire after 24 hours if not responded
- **Driver response**: Records accept/reject action with timestamp and reason
- **Relationships**: Links Load, Driver, Truck, Trailer, and Dispatcher

```typescript
interface IAssignment {
  loadId: string;              // Which load
  driverId: string;            // Assigned to which driver
  truckId?: string;            // Truck for the trip
  trailerId?: string;          // Trailer for the trip
  assignedBy: string;          // Which dispatcher assigned it
  status: AssignmentStatus;    // PENDING, ACCEPTED, REJECTED
  driverResponse?: {
    status: ACCEPTED | REJECTED;
    respondedAt: Date;
    reason?: string;           // Why they rejected
  };
  expiresAt: Date;             // 24h default
}
```

### 2. Assignment Service (`backend/src/services/assignment.service.ts`)

Business logic for assignment lifecycle:

#### Create Assignment
```typescript
const assignment = await AssignmentService.createAssignment({
  loadId: "123",
  driverId: "456",
  truckId: "789",
  trailerId: "abc",
  assignedBy: userId,
  expiresIn: 24 // hours
});
// Returns: Assignment record with populated references
```

#### Driver Accept
```typescript
const updated = await AssignmentService.acceptAssignment(assignmentId, driverId);
// Effects:
// - Assignment.status = "accepted"
// - Load.status = "trip_accepted"
// - Dispatcher notified
```

#### Driver Reject
```typescript
const updated = await AssignmentService.rejectAssignment(
  assignmentId, 
  driverId, 
  "Truck not suitable"
);
// Effects:
// - Assignment.status = "rejected"
// - Load.status = "booked" (revert)
// - Dispatcher notified with reason
```

### 3. Updated Load Controller

When dispatcher assigns a load:
```typescript
// POST /api/loads/:id/assign
{
  "driverId": "xxx",
  "truckId": "yyy",
  "trailerId": "zzz"
}
```

**Process**:
1. Validate load, driver, truck, trailer exist and are available
2. Update load: `status = "assigned"`, set driverId, truckId, trailerId
3. Update driver: `status = "on_trip"`, set currentLoadId
4. Update truck & trailer: `status = "on_road"`, set currentLoadId
5. **Create Assignment record** (NEW)
6. Find driver's user account and send notification (NEW)

### 4. Assignment Routes (`backend/src/routes/assignment.routes.ts`)

**Driver endpoints**:
- `GET /api/assignments/me/pending` - Get pending assignments for current driver
- `GET /api/assignments/me` - Get all assignments (with history)
- `GET /api/assignments/:id` - Get single assignment details
- `POST /api/assignments/:id/accept` - Driver accepts
- `POST /api/assignments/:id/reject` - Driver rejects with optional reason

**Dispatcher endpoints**:
- `GET /api/assignments` - View all assignments with filters (status, driverId, loadId)

### 5. Updated Notification System

When assignment is created, notification is generated:
- **Type**: `NotificationType.ASSIGNMENT`
- **Title**: "New Load Assignment"
- **Message**: "You have been assigned Load #XXX"
- **Data**: loadId, assignmentId, driverId, truck/trailer info
- **Action URL**: `/driver-dashboard` or similar

When driver accepts/rejects, dispatcher is notified:
- **Accept**: "Driver accepted Load #XXX"
- **Reject**: "Driver rejected Load #XXX. Reason: [reason]"

## Frontend Implementation

### 1. Assignment API (`frontend/src/api/assignment.api.ts`)

```typescript
assignmentApi.getPendingAssignments()    // Get driver's pending assignments
assignmentApi.getMyAssignments()         // Get all assignments (history)
assignmentApi.acceptAssignment(id)       // Driver accepts
assignmentApi.rejectAssignment(id, reason) // Driver rejects
assignmentApi.getAllAssignments(filters) // Dispatcher view
```

### 2. Assignment Notifications Component (`frontend/src/components/dialogs/AssignmentNotifications.tsx`)

Displays pending assignments with Accept/Reject buttons:

**Features**:
- Shows load number, origin, destination, pickup date
- Displays assigned truck and trailer
- 24-hour countdown timer indicator
- Quick accept/reject actions
- Rejection dialog with optional reason field
- Auto-refresh after action
- Loading and error states

**Integration**: Added to top of DriverDashboard page

**Usage in DriverDashboard**:
```tsx
// Now appears at the top of driver dashboard
<AssignmentNotifications />
```

### 3. Update to DriverDashboard

- Added import of AssignmentNotifications component
- Added import of assignmentApi
- AssignmentNotifications now displays as first card in dashboard
- Shows all pending assignments driver hasn't responded to yet

## User Workflow - Dispatcher

### How to Assign a Load to a Driver

1. **Navigate to Loads page**
2. **Find the load** with status "booked" or "rate_confirmed"
3. **Click "Assign" button** in the load row
4. **Assignment Dialog opens**:
   - Select Driver (dropdown - filtered to active drivers)
   - Select Truck (dropdown - filtered to available trucks)
   - Select Trailer (dropdown - filtered to available trailers)
5. **Click "Confirm"**
   - System creates assignment
   - Driver's user account is found
   - Notification is sent immediately
   - Load status changes to "assigned"
   - Driver, truck, trailer status change to "on_trip"/"on_road"

## User Workflow - Driver

### How to Respond to Assignment

1. **Log into Driver App**
2. **See "Pending Load Assignments" card** at top of dashboard
3. **Review assignment details**:
   - Load number
   - Origin and destination
   - Pickup date
   - Assigned truck and trailer
   - Time to respond (24 hours)
4. **Choose one**:
   - **ACCEPT**: "I can do this trip"
     - Assignment status → "accepted"
     - Load status → "trip_accepted"
     - Load moves to "Current Load" section
     - Can proceed with trip workflow
   - **REJECT**: "I cannot do this trip"
     - Opens dialog for reason
     - Assignment status → "rejected"
     - Load status → reverts to "booked"
     - Dispatcher sees rejection with reason
     - Dispatcher can reassign to another driver

## Database Changes

### New Collection: `Assignment`

```javascript
db.assignments.createIndex({ driverId: 1, status: 1 });
db.assignments.createIndex({ loadId: 1 });
db.assignments.createIndex({ createdAt: -1 });
db.assignments.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Modified Collections

**Load**:
- Already has driverId, truckId, trailerId fields
- Status now transitions: booked → assigned → trip_accepted → trip_started → ...

**Driver**:
- Already has currentLoadId field

## API Examples

### Create Assignment (Auto-called when load is assigned)
```bash
POST /api/assignments
{
  "loadId": "64a123",
  "driverId": "64b456",
  "truckId": "64c789",
  "trailerId": "64d012",
  "assignedBy": "dispatcher_user_id",
  "expiresIn": 24
}

Response:
{
  "success": true,
  "data": {
    "_id": "64e345",
    "status": "pending",
    "driverId": { "name": "John", "phone": "555-1234" },
    "loadId": { "loadNumber": "LGP-2024-001" },
    "expiresAt": "2024-01-15T10:00:00Z"
  }
}
```

### Driver Accept
```bash
POST /api/assignments/64e345/accept

Response:
{
  "success": true,
  "message": "Assignment accepted successfully",
  "data": {
    "_id": "64e345",
    "status": "accepted",
    "driverResponse": {
      "status": "accepted",
      "respondedAt": "2024-01-14T15:30:00Z"
    }
  }
}
```

### Driver Reject
```bash
POST /api/assignments/64e345/reject
{
  "reason": "Truck not suitable for this route"
}

Response:
{
  "success": true,
  "message": "Assignment rejected",
  "data": {
    "_id": "64e345",
    "status": "rejected",
    "driverResponse": {
      "status": "rejected",
      "respondedAt": "2024-01-14T15:30:00Z",
      "reason": "Truck not suitable for this route"
    }
  }
}
```

### Get Pending Assignments (Driver)
```bash
GET /api/assignments/me/pending

Response:
{
  "success": true,
  "data": [
    {
      "_id": "64e345",
      "loadId": {
        "loadNumber": "LGP-2024-001",
        "origin": "Los Angeles",
        "destination": "Phoenix",
        "pickupDate": "2024-01-15"
      },
      "truckId": { "unitNumber": "TK-001" },
      "trailerId": { "unitNumber": "TR-001" },
      "expiresAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## Troubleshooting

### Driver doesn't receive notification
**Check**:
1. Driver profile has `userId` field linking to user account
2. User account has `role: 'driver'`
3. Check notification logs for errors
4. Verify email/phone matching if auto-linking by email/phone

**Fix**:
```bash
# Run driver linking script
npm run tsx src/scripts/linkDriversToUsers.ts
```

### Assignment not showing in driver app
**Check**:
1. Driver is logged in with correct account
2. Assignment status is "pending" and not expired
3. Check /api/assignments/me/pending endpoint returns data

### Load not updating after driver accepts
**Check**:
1. Check load status in database
2. Verify driver has correct permissions
3. Check error logs for assignment service errors

## Performance Considerations

### Database Indexes
- `driverId + status`: Fast lookup of pending assignments
- `loadId`: Find assignment for a load
- `expiresAt`: TTL cleanup of expired assignments

### API Caching
- Assignments auto-refresh on DriverDashboard
- Use React Query or SWR for caching if needed

### Real-time Updates (Optional Future Enhancement)
- Integrate WebSocket for live notification push
- Remove polling-based refresh

## Security Notes

✅ **Implemented**:
- JWT authentication required for all endpoints
- Driver can only accept/reject own assignments
- Dispatcher can only assign from available resources
- Proper role-based access control

⚠️ **To Add** (Optional):
- Rate limiting on reject/accept endpoints
- Audit trail for assignment changes
- Email/SMS backup notifications

## Testing Checklist

- [ ] Dispatcher can assign load to driver
- [ ] Assignment notification appears in driver app
- [ ] Driver can accept assignment
- [ ] Driver can reject assignment with reason
- [ ] Load status updates correctly on accept
- [ ] Load status reverts on reject
- [ ] Dispatcher sees accept/reject notifications
- [ ] Expired assignments don't show after 24h
- [ ] Multiple pending assignments display correctly
- [ ] No errors in browser console

## Support

For issues or questions:
1. Check error logs: `docker logs tms-api`
2. Check browser console for frontend errors
3. Review assignment collection in MongoDB
4. Check notification delivery in notification logs
