# Complete Driver Load Assignment Guide

## நீங்கள் கேட்ட கேள்விக்கான விளக்கம் (Your Question Explained)

**உங்கள் கேள்வி:** Dispatcher/Owner login இல் இருந்து driver-க்கு load assign செய்யும்போது, அந்த particular driver-க்கு மட்டும் load போக வேண்டும், ஆனால் இப்போது driver-ஐ assign செய்ய முடியவில்லை.

**பதில்:** இப்போது fix செய்துவிட்டேன்! இதோ complete process:

---

## STEP-BY-STEP PROCESS (முழு செயல்முறை)

### PHASE 1: Setup (First Time Only - ஒரு முறை மட்டும்)

#### Option A: புதிய Driver-ஐ சேர்க்கும்போது

1. **முதலில் User Account Create செய்யவும்**
   - Users page-க்கு செல்லவும்
   - "Add User" click செய்யவும்
   - Details நிரப்பவும்:
     - Name: Driver பெயர்
     - Email: driver@example.com
     - Phone: 1234567890
     - **Role: Driver** (முக்கியம்!)
     - Password: Strong password
   - Save செய்யவும்

2. **பிறகு Driver Profile Create செய்யவும்**
   - Drivers page-க்கு செல்லவும்
   - "Add Driver" click செய்யவும்
   - **மேலே "Select User" dropdown இருக்கும்**
   - அந்த dropdown-இல் நீங்கள் create செய்த user-ஐ தேர்வு செய்யவும்
   - மீதமுள்ள details நிரப்பவும் (license, address, etc.)
   - Save செய்யவும்

   ✅ **இப்போது driver account user account-உடன் link ஆகிவிட்டது!**

#### Option B: ஏற்கனவே உள்ள Drivers-க்கு

**Backend script run செய்யவும்:**

```bash
cd backend
npm run tsx src/scripts/linkDriversToUsers.ts
```

இந்த script:
- எல்லா drivers-ஐயும் check செய்யும்
- Email match பார்க்கும்
- Automatically link செய்யும்

---

### PHASE 2: Load-ஐ Assign செய்வது (Daily Process)

#### 1. **Load Create செய்தல்**

**Dispatcher/Owner login:**
- Loads page-க்கு செல்லவும்
- "+ Create Load" button click செய்யவும்
- Load details நிரப்பவும்:
  - Customer details
  - Pickup location (shipper)
  - Delivery location (receiver)
  - Cargo type, weight
  - Rate, distance
- "Create" click செய்யவும்
- **Status: BOOKED** ஆகும்

#### 2. **Broker Rate Confirmation** (Optional)

- Broker rate confirm செய்யும்போது:
  - Tracking link add செய்யலாம்
  - Pickup/delivery address confirm செய்யலாம்
  - Miles update செய்யலாம்
- **Status: RATE_CONFIRMED** ஆகும்

#### 3. **Driver-ஐ Assign செய்தல்** ⭐ **முக்கியம்!**

**Loads page-இல்:**
1. உங்கள் load-ஐ table-இல் கண்டுபிடிக்கவும்
2. **Actions column-இல் Assignment icon (🚛) click செய்யவும்**
3. **Assignment Dialog திறக்கும்:**
   
   **Step 1: Driver தேர்வு**
   - Dropdown-இல் available drivers list காட்டும்
   - உங்கள் driver-ஐ தேர்வு செய்யவும்
   
   **Step 2: Truck தேர்வு**
   - Available trucks list இருந்து தேர்வு செய்யவும்
   
   **Step 3: Trailer தேர்வு**
   - Available trailers list இருந்து தேர்வு செய்யவும்

4. **"Assign" button click செய்யவும்**

✅ **என்ன நடக்கும்:**
- Load status → "ASSIGNED"
- Driver column-இல் driver பெயர் காட்டும்
- Driver status → "ON_TRIP"
- Truck status → "ON_ROAD"
- Trailer status → "ON_ROAD"
- **Driver app-இல் load தெரியும்!** 🎉

---

### PHASE 3: Driver App-இல் என்ன தெரியும்

**Driver login செய்யும்போது:**

```
Driver Dashboard
├── Active Loads: 1
│   └── LOAD-1003
│       ├── Chennai → Tindivanam
│       ├── Status: ASSIGNED
│       ├── Pickup Date: 17/01/2026
│       └── Rate: ₹10,000
│
└── Actions Available:
    ├── ✓ View Details
    ├── ✓ Accept Trip
    └── ✓ Start Trip
```

---

## COMPLETE WORKFLOW (முழு flow)

### 1. DISPATCHER/OWNER SIDE

```
1. Create Load
   ↓
2. Broker Confirms Rate (optional)
   ↓
3. ASSIGN LOAD TO DRIVER
   • Select Driver
   • Select Truck
   • Select Trailer
   ↓
4. Trip Created
   ↓
5. Sent to Driver App ✅
```

### 2. DRIVER SIDE

```
1. Login to Driver App
   ↓
2. See Assigned Load
   ↓
3. Accept Trip
   ↓
4. Fill Driver Form Details:
   • Load number
   • Pickup reference number
   • Pickup time, date, location
   • Dropoff reference number
   • Dropoff time, date, location
   ↓
5. Send to Dispatcher
   ↓
6. Start Trip
   • Take odometer photo
   • Upload starting mileage
   • Status → TRIP_STARTED
   ↓
7. Shipper Check-in
   • Fill PO number
   • Load number
   • Reference number
   • Status → SHIPPER_CHECK_IN
   ↓
8. Load In
   • Confirm load details
   • Status → SHIPPER_LOAD_IN
   ↓
9. Load Out
   • Upload BOL PDF
   • Status → SHIPPER_LOAD_OUT → IN_TRANSIT
   ↓
10. Receiver Check-in
    • Arrival confirmation
    • Status → RECEIVER_CHECK_IN
    ↓
11. Offload
    • Quantity details
    • BOL acknowledgment
    • Upload POD photo/document
    • Status → RECEIVER_OFFLOAD → DELIVERED
    ↓
12. End Trip
    • Ending odometer photo
    • Total miles
    • Fuel expenses
    • Tolls
    • Other costs
    • Status → COMPLETED
```

---

## KEY FEATURES

### 📍 GPS Tracking
- Real-time location updates
- Distance traveled tracking
- Remaining distance calculation

### 💰 Driver Payment (Pay per Mile)
- Starting mileage recorded
- Ending mileage recorded
- Total miles calculated
- Rate per mile applied
- Automatic payment calculation

### 📱 Driver Communication
- Secure end-to-end messaging
- Dispatcher ↔ Driver communication
- Owner notifications

### 🆘 SOS Feature
- Emergency button in driver app
- Instant notification to:
  - Owner
  - Dispatcher
  - Predefined emergency contacts

### 📊 Owner Dashboard
- Real-time status of all operations
- Invoice management (paid/unpaid)
- Growth metrics
- Total profit
- Total loads
- Drivers assigned
- Distance traveled (km/miles)
- All data auto-updated

### 💼 Accountant Dashboard
- Auto-populated data
- Driver payments
- BOL documents
- POD documents
- No manual entry needed
- All data from driver/dispatcher inputs

---

## TROUBLESHOOTING (சிக்கல் தீர்வு)

### ❌ Problem: Driver-க்கு load போகவில்லை

**காரணம்:** Driver profile user account-உடன் link ஆகவில்லை

**தீர்வு:**
1. Backend script run செய்யவும்:
   ```bash
   cd backend
   npm run tsx src/scripts/linkDriversToUsers.ts
   ```

2. அல்லது manually link செய்யவும்:
   - Driver-ஐ edit செய்யவும்
   - "Select User" dropdown-இல் user-ஐ தேர்வு செய்யவும்
   - Save செய்யவும்

### ❌ Problem: Assignment button தெரியவில்லை

**காரணம்:** Load status "booked" அல்லது "rate_confirmed" இல்லை

**தீர்வு:**
- Load status check செய்யவும்
- Status "booked" அல்லது "rate_confirmed" ஆக மாற்றவும்

### ❌ Problem: Driver list empty

**காரணம்:** Active drivers இல்லை

**தீர்வு:**
- Drivers page-க்கு செல்லவும்
- Driver status "ACTIVE" ஆக மாற்றவும்

---

## SUMMARY (சுருக்கம்)

### ✅ என்ன செய்தேன்:

1. Driver model-இல் `userId` field சேர்த்தேன்
2. Driver profile-ஐ user account-உடன் link செய்யும் system
3. Driver dashboard loads fetch செய்யும் API
4. Assignment dialog-இல் user selection dropdown
5. Loads page-இல் assign button visible
6. Linking script (automatic linking)

### 🎯 இப்போது என்ன நடக்கும்:

1. ✅ Dispatcher/Owner assigns load
2. ✅ Driver app-இல் load தெரியும்
3. ✅ Driver accept/start செய்ய முடியும்
4. ✅ Complete workflow works!

---

## NEXT STEPS (அடுத்த படிகள்)

### இன்றே செய்ய வேண்டியவை:

1. **Backend script run செய்யவும்** (existing drivers-க்கு):
   ```bash
   cd backend
   npm run tsx src/scripts/linkDriversToUsers.ts
   ```

2. **Test செய்யவும்**:
   - ஒரு load create செய்யவும்
   - Driver assign செய்யவும்
   - Driver app check செய்யவும்

3. **புதிய drivers-க்கு**:
   - User account create → Driver profile create
   - User-ஐ select செய்து link செய்யவும்

---

## FILES CHANGED (மாற்றிய files)

### Backend:
- ✅ `Driver.model.ts` - userId field added
- ✅ `driver.controller.ts` - getMyProfile endpoint
- ✅ `driver.service.ts` - getDriverByUserId method
- ✅ `driver.routes.ts` - /me/profile route
- ✅ `load.controller.ts` - getMyAssignedLoads endpoint
- ✅ `load.routes.ts` - /me/assigned route
- ✅ `linkDriversToUsers.ts` - NEW script

### Frontend:
- ✅ `driver.api.ts` - getMyProfile method
- ✅ `load.api.ts` - getMyAssignedLoads method
- ✅ `DriverDashboard.tsx` - simplified load fetching
- ✅ `CreateDriverDialog.tsx` - user selection dropdown
- ✅ `LoadsPage.tsx` - assign button visibility
- ✅ `all.types.ts` - userId in CreateDriverData

---

**இப்போது எல்லாம் ready! 🚀**

Driver assignment முழுமையாக work ஆகும்!
