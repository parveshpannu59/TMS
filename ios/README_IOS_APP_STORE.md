# TMS Driver - Native iOS App for App Store

This is a **native iOS app** built with **Swift & SwiftUI** and **Xcode** – ready for App Store deployment. Drivers using iPhones can install it from the App Store.

## Requirements

- **macOS** with **Xcode 15+** (from Mac App Store)
- **Apple Developer Account** ($99/year) for App Store distribution
- **iPhone** with iOS 16+ for testing

## Quick Start

### 1. Open the Project in Xcode

```bash
cd TMS/ios
open TMSDriver.xcodeproj
```

### 2. Configure API URL

Edit `TMSDriver/Config/APIConfig.swift`:

- **Development**: Use your Mac's IP (e.g. `http://192.168.1.100:5000/api`) so the iPhone can reach the backend
- **Production**: Replace with your deployed backend URL (e.g. `https://api.yourtms.com/api`)

### 3. Set Your Team

1. In Xcode, select the **TMSDriver** project in the navigator
2. Select the **TMSDriver** target
3. Go to **Signing & Capabilities**
4. Under **Team**, select your Apple Developer account

### 4. Run on Simulator or Device

- **Simulator**: Choose any iPhone simulator and press **Run** (⌘R)
- **Real Device**: Connect your iPhone, select it as the run destination, then Run

> **Note**: For a real device, the backend must be reachable from the phone. Use your Mac's LAN IP (e.g. `http://192.168.1.100:5000/api`) if testing locally.

---

## App Store Deployment

### Step 1: Apple Developer Account

1. Enroll at [developer.apple.com](https://developer.apple.com)
2. Pay the $99/year fee
3. Create an **App ID** for `com.tms.driver`

### Step 2: App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app: **TMS Driver**
3. Fill in metadata:
   - App name, subtitle, description
   - Screenshots (required sizes)
   - Privacy policy URL
   - Support URL

### Step 3: App Icon

1. In Xcode: **Assets.xcassets** → **AppIcon**
2. Add a **1024x1024 px** icon (PNG, no transparency)

### Step 4: Archive & Upload

1. In Xcode: **Product** → **Archive**
2. When the Organizer opens, click **Distribute App**
3. Choose **App Store Connect** → **Upload**
4. Follow the prompts and wait for processing

### Step 5: Submit for Review

1. In App Store Connect, open your app
2. Create a new version (e.g. 1.0.0)
3. Add the build you uploaded
4. Complete all required fields
5. Click **Submit for Review**

---

## App Features

| Screen      | Description                                      |
|-------------|--------------------------------------------------|
| **Login**   | Driver sign-in (email + password)                |
| **Dashboard** | Active load, Start Trip, status updates        |
| **Trips**   | List of assigned loads                           |
| **Messages**| Placeholder (extend with messaging API)          |
| **Settings**| Profile, Sign Out                                |

## API Backend

The app talks to your existing TMS backend:

- `POST /api/auth/login` – Login
- `GET /api/loads/me/assigned` – Assigned loads
- `POST /api/loads/:id/start-trip` – Start trip with mileage
- `PATCH /api/loads/:id/status` – Update load status

Ensure the backend is reachable at the URL set in `APIConfig.swift` (HTTPS required for production).

---

## Project Structure

```
ios/
├── TMSDriver.xcodeproj/     # Xcode project
├── TMSDriver/
│   ├── TMSDriverApp.swift   # App entry point
│   ├── Config/
│   │   └── APIConfig.swift  # API base URL
│   ├── Models/
│   │   ├── User.swift
│   │   └── Load.swift
│   ├── Services/
│   │   ├── AuthManager.swift
│   │   ├── APIClient.swift
│   │   ├── AuthAPI.swift
│   │   └── LoadAPI.swift
│   ├── Views/
│   │   ├── LoginView.swift
│   │   ├── DashboardView.swift
│   │   ├── TripsView.swift
│   │   ├── MessagesView.swift
│   │   └── SettingsView.swift
│   ├── Assets.xcassets/
│   └── Info.plist
└── README_IOS_APP_STORE.md
```

---

## Verification Checklist

Before submitting to App Store, verify:

1. **Build succeeds**: Product → Build (⌘B) in Xcode
2. **Run on simulator**: Works with `http://localhost:5000/api` if backend runs on Mac
3. **Run on device**: Set `APIConfig.baseURL` to your Mac's IP (e.g. `http://192.168.1.x:5000/api`)
4. **Login**: Use a driver account (role: driver) from your TMS
5. **Dashboard**: Shows assigned loads after login
6. **Start Trip**: Select odometer photo + enter mileage → trip starts
7. **Trips tab**: Lists all assigned loads
8. **Settings**: Profile displays, Sign Out works

## Troubleshooting

### "Could not connect to server"

- Check `APIConfig.baseURL`
- For device testing, use your Mac's IP (not `localhost`)
- Ensure backend allows your network (CORS, firewall)

### Code signing errors

- Add your Apple ID in Xcode → **Settings** → **Accounts**
- Select the correct **Team** in **Signing & Capabilities**

### Build fails

- Ensure deployment target is **iOS 16.0+**
- Clean build folder: **Product** → **Clean Build Folder** (⇧⌘K)
