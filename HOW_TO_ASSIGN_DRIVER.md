# 🚛 HOW TO ASSIGN DRIVER TO LOAD - QUICK GUIDE

## இப்போது நீங்கள் செய்ய வேண்டியது (What You Need to Do Now)

### ⚡ STEP 1: Link Existing Drivers (ஒரு முறை மட்டும்)

```bash
cd backend
npm run tsx src/scripts/linkDriversToUsers.ts
```

**இது என்ன செய்யும்:** Existing driver profiles-ஐ user accounts-உடன் automatic-ஆக link செய்யும்.

---

### ⚡ STEP 2: Load-ஐ Driver-க்கு Assign செய்தல்

#### விரிவான படிகள்:

1. **Owner/Dispatcher-ஆக login செய்யவும்**

2. **Loads page-க்கு செல்லவும்**

3. **உங்கள் load-ஐ table-இல் கண்டுபிடிக்கவும்**
   - Example: LOAD-1003

4. **Actions column-இல் Assignment icon click செய்யவும்** 
   - Icon: 🚛 (truck/assignment icon)
   - Load status "BOOKED" அல்லது "RATE_CONFIRMED" இருக்க வேண்டும்

5. **Assignment Dialog-இல்:**

   ```
   ┌─────────────────────────────────┐
   │  Assign Load                    │
   ├─────────────────────────────────┤
   │                                 │
   │  Step 1: Select Driver ▼        │
   │  [Srinath Manivannan - TN...]   │
   │                                 │
   │  Step 2: Select Truck ▼         │
   │  [daasdgafdhzgb - 2026]        │
   │                                 │
   │  Step 3: Select Trailer ▼       │
   │  [123f45s56fe - Dry Van]       │
   │                                 │
   │          [Assign Button]        │
   └─────────────────────────────────┘
   ```

6. **மூன்றையும் தேர்வு செய்து "Assign" click செய்யவும்**

7. **✅ Success!**
   - Load status → "ASSIGNED"
   - Driver column → Driver பெயர் காட்டும்

---

### ⚡ STEP 3: Driver App-இல் Verify செய்தல்

1. **Driver-ஆக login செய்யவும்**

2. **Dashboard check செய்யவும்:**
   - Active Loads: 1 (என்று காட்ட வேண்டும்)
   - Load details தெரிய வேண்டும்

3. **Driver இப்போது செய்ய முடியும்:**
   - View load details
   - Accept trip
   - Start trip
   - Complete full workflow

---

## 🎯 WHERE TO CLICK (எங்கே click செய்ய வேண்டும்)

### From Loads Page:

```
Load Table
┌────────────┬────────┬────────┬────────────┬────────┐
│ Load #     │ Origin │ Dest   │ Driver     │ Actions│
├────────────┼────────┼────────┼────────────┼────────┤
│ LOAD-1003  │Chennai │Tindiva │Unassigned  │ 👁 🚛  │ ← Click this 🚛
└────────────┴────────┴────────┴────────────┴────────┘
                                                 ↑
                                            Assignment Icon
```

---

## ⚠️ IMPORTANT NOTES

### For New Drivers (புதிய drivers-க்கு):

**இரண்டு steps தேவை:**

1. **User Account Create:**
   - Users → Add User
   - Role = "driver"
   - Save

2. **Driver Profile Create:**
   - Drivers → Add Driver
   - **"Select User" dropdown-இல் user தேர்வு செய்யவும்** ⭐
   - மற்ற details நிரப்பவும்
   - Save

**இல்லையென்றால்:** Driver login செய்ய முடியாது, loads தெரியாது!

---

## ✅ CHECKLIST

Before assigning a load:

- [ ] Driver profile created
- [ ] Driver linked to user account (userId field set)
- [ ] Driver status = ACTIVE
- [ ] Truck status = AVAILABLE
- [ ] Trailer status = AVAILABLE
- [ ] Load status = BOOKED or RATE_CONFIRMED

After assigning:

- [ ] Load status changed to ASSIGNED
- [ ] Driver column shows driver name
- [ ] Driver app shows the load
- [ ] Driver can accept/start trip

---

## 🆘 QUICK FIXES

### Driver-க்கு load போகவில்லையா?

```bash
# Run this script
cd backend
npm run tsx src/scripts/linkDriversToUsers.ts
```

### Assignment button தெரியவில்லையா?

- Load status check செய்யவும்
- "BOOKED" அல்லது "RATE_CONFIRMED" ஆக இருக்க வேண்டும்

### Driver list empty ஆக இருக்கிறதா?

- Drivers page → Driver status "ACTIVE" ஆக மாற்றவும்

---

## 📱 WORKFLOW AT A GLANCE

```
DISPATCHER/OWNER                    DRIVER APP
─────────────────                  ────────────

1. Create Load
   └─→ BOOKED

2. Confirm Rate (optional)
   └─→ RATE_CONFIRMED

3. Assign Load
   ├─→ Select Driver
   ├─→ Select Truck            ──→  Load appears
   └─→ Select Trailer               in Driver App!
       └─→ ASSIGNED            

                               4. Accept Trip
                               
                               5. Fill Form Details
                               
                               6. Start Trip
                               
                               7-11. Complete Workflow
                               
                               12. End Trip
                                   └─→ COMPLETED
```

---

## 📞 SUPPORT

For detailed information, see:
- [COMPLETE_ASSIGNMENT_GUIDE.md](COMPLETE_ASSIGNMENT_GUIDE.md)
- [DRIVER_LOAD_ASSIGNMENT_FIX.md](DRIVER_LOAD_ASSIGNMENT_FIX.md)
- [QUICK_FIX_SUMMARY.md](QUICK_FIX_SUMMARY.md)

---

**எல்லாம் ready! இப்போது test செய்யவும்! 🚀**
