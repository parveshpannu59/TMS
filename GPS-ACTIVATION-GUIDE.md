# 🗺️ GPS Activation Guide

## Overview

The TMS system includes **full GPS tracking capabilities** that are ready to use. GPS tracking is currently **disabled by default** and can be activated by simply adding your Google Maps API key.

## ✅ What's Already Built

- ✅ Complete GPS backend service
- ✅ GPS API endpoints
- ✅ Frontend GPS components
- ✅ Live location tracking
- ✅ Route history
- ✅ ETA calculations
- ✅ Geofencing support
- ✅ Map integration

## 🚀 Activation Steps

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Geocoding API**
   - **Directions API**
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key
6. (Optional) Restrict the API key to your domain for security

### Step 2: Update Backend .env

Edit `backend/.env`:

```env
# GPS Configuration
GPS_ENABLED=true
GOOGLE_MAPS_API_KEY=your_api_key_here
GPS_UPDATE_INTERVAL=30000
GPS_GEOFENCE_RADIUS=500
```

### Step 3: Update Frontend .env

Create or edit `frontend/.env`:

```env
# GPS Configuration
VITE_GPS_ENABLED=true
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
VITE_GPS_UPDATE_INTERVAL=30000
VITE_MAP_DEFAULT_ZOOM=12
```

### Step 4: Restart Servers

```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

### Step 5: Test GPS

1. Login to the application
2. Navigate to any load
3. Click "View Details"
4. You should see the GPS map component
5. If GPS is enabled but no location data exists, you'll see a placeholder

## 📱 How GPS Tracking Works

### For Drivers (Mobile App)

1. Driver opens the app on their mobile device
2. App requests location permission
3. When a load is assigned, driver can start tracking
4. App automatically sends location updates every 30 seconds
5. Location is saved to the database
6. Owner/Dispatcher sees live updates on the dashboard

### For Owners/Dispatchers (Dashboard)

1. Open any load details page
2. See live map with truck location
3. View route traveled (breadcrumb trail)
4. See ETA and distance remaining
5. Get notifications when truck reaches pickup/delivery points

## 🔧 GPS Features

### 1. Live Location Tracking
- Real-time position updates
- Speed monitoring
- Direction (heading)
- Last update timestamp
- Auto-refresh every 30 seconds

### 2. Route History
- Save all locations (breadcrumb trail)
- Show route traveled on map
- Distance covered calculation
- Stop points detection

### 3. ETA Calculation
- Based on distance remaining
- Based on current speed
- Updates in real-time

### 4. Geofencing
- Alert when truck reaches pickup location
- Alert when truck reaches delivery location
- Alert if truck goes off-route
- Customizable radius (default: 500m)

### 5. Map Display
- Google Maps integration
- Truck icon on map
- Route line (pickup → delivery)
- Traveled vs remaining route
- Zoom controls

## 💰 Google Maps API Pricing

**Free Tier:**
- 28,000 map loads per month FREE
- $200 monthly credit

**For 50 active trucks:**
- ~50 updates/hour × 24 hours × 30 days = 36,000 updates/month
- Well within free tier! ✅

**Cost: FREE for typical use cases!**

## 🐛 Troubleshooting

### GPS Not Showing

1. **Check .env files** - Ensure `GPS_ENABLED=true` in both backend and frontend
2. **Check API key** - Verify Google Maps API key is correct
3. **Check browser console** - Look for any JavaScript errors
4. **Check network tab** - Verify API calls are successful

### Map Not Loading

1. **API Key Issues:**
   - Verify API key is correct
   - Check if API key has restrictions
   - Ensure required APIs are enabled

2. **CORS Issues:**
   - Check backend CORS configuration
   - Verify frontend URL is in allowed origins

### Location Updates Not Working

1. **Check GPS service:**
   - Verify `GPS_ENABLED=true` in backend
   - Check backend logs for errors

2. **Check location permissions:**
   - Ensure browser/device has location permission
   - Check if HTTPS is required (some browsers require HTTPS for geolocation)

## 📝 API Endpoints

### GPS Endpoints

```
GET    /api/gps/status                    - Check if GPS is enabled
POST   /api/gps/update-location           - Update current location
GET    /api/gps/load/:id/location         - Get current location
GET    /api/gps/load/:id/route            - Get route data
GET    /api/gps/load/:id/history          - Get location history
POST   /api/gps/start-tracking/:loadId    - Start tracking
POST   /api/gps/stop-tracking/:loadId     - Stop tracking
GET    /api/gps/active-loads              - Get all tracked loads
```

## 🎯 Next Steps

After activating GPS:

1. **Test with a sample load:**
   - Create a test load
   - Assign a driver and truck
   - Start tracking
   - Verify location updates appear

2. **Configure geofencing:**
   - Adjust `GPS_GEOFENCE_RADIUS` if needed
   - Test pickup/delivery alerts

3. **Monitor usage:**
   - Check Google Cloud Console for API usage
   - Monitor costs (should be $0 for free tier)

## 📞 Support

If you encounter any issues:

1. Check the browser console for errors
2. Check backend logs
3. Verify all environment variables are set correctly
4. Ensure Google Maps APIs are enabled

---

**GPS is fully coded and ready! Just add your API key and it works! 🎉**
