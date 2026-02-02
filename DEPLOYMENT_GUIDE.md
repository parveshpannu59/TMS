# TMS Professional Deployment Guide

**Complete step-by-step guide to deploy TMS to production**

## நீங்கள் செய்ய வேண்டியவை (What You Need To Do)

| Step | Task | When |
|------|------|------|
| 1 | MongoDB Atlas – Database setup | First |
| 2 | Backend – Hostinger VPS / Railway / Render | Second |
| 3 | Frontend – Cloudflare Pages | Third |
| 4 | iOS App Store – **Client-ஓட Mac needed** | Last |

**Mac / iPhone இல்லாம:** iOS App Store-க்கு submit பண்ண client-க்கு Mac வேணும். நீங்க cloud Mac (MacinCloud) rent பண்ணலாம் அல்லது client Mac use பண்ணலாம்.

---
- **Backend** → Hostinger VPS (or Railway/Render)
- **Frontend** → Cloudflare Pages (or AWS S3 + CloudFront)
- **iOS App** → App Store (client needs Mac or cloud Mac)
- **Database** → MongoDB Atlas (cloud)

---

## Prerequisites

| Item | Needed For | Cost |
|------|------------|------|
| MongoDB Atlas account | Database | Free tier |
| Hostinger VPS (or Railway) | Backend | ~$4–10/mo |
| Cloudflare account | Frontend | Free |
| Apple Developer account | iOS App Store | $99/year |
| Domain (optional) | Custom URL | ~$10/year |

---

# PHASE 1: MongoDB Atlas (Database)

## Step 1.1: Create MongoDB Atlas Cluster

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Sign up (free)
3. Create a **Free Cluster** (M0)
4. Choose region closest to your Hostinger server
5. Create cluster → Wait 3–5 minutes

## Step 1.2: Get Connection String

1. Click **Connect** on your cluster
2. **Connect your application** → Driver: Node.js
3. Copy the connection string, e.g.:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your DB user password
5. Replace `<dbname>` with `tms` (or any name)

**Save this URI** – you’ll use it in backend env.

---

# PHASE 2: Backend Deployment (Hostinger VPS)

## Option A: Hostinger VPS

### Step 2.1: Create VPS

1. Go to [hostinger.com](https://www.hostinger.com)
2. **VPS Hosting** → Choose a plan (e.g. KVM 1)
3. Select Linux (Ubuntu 22.04)
4. Complete purchase and note:
   - IP address
   - SSH username/password

### Step 2.2: Connect via SSH

```bash
ssh root@YOUR_VPS_IP
```

### Step 2.3: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # Should show v20.x
```

### Step 2.4: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Step 2.5: Upload Backend Code

**Option 1: Git (recommended)**

```bash
# On VPS
cd /var/www
git clone YOUR_REPO_URL tms-backend
cd tms-backend/backend
npm install
npm run build
```

**Option 2: File upload**

- Zip backend folder locally
- Use SFTP (FileZilla) or `scp` to upload to VPS
- Unzip and run `npm install && npm run build`

### Step 2.6: Create .env on VPS

```bash
cd /var/www/tms-backend/backend
nano .env
```

Add (replace values):

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxx.mongodb.net/tms?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://your-frontend-domain.pages.dev
```

**CORS_ORIGIN** = your deployed frontend URL (Cloudflare or custom domain)

### Step 2.7: Start Backend with PM2

```bash
pm2 start dist/server.js --name tms-api
pm2 save
pm2 startup   # Enable auto-start on reboot
```

### Step 2.8: Configure Nginx (Reverse Proxy + SSL)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo nano /etc/nginx/sites-available/tms
```

Paste (replace `api.yourdomain.com` and `YOUR_VPS_IP`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 25M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

**Backend URL:** `https://api.yourdomain.com/api`

---

## Option B: Railway (Easier, No VPS)

1. Go to [railway.app](https://railway.app) → Sign up
2. **New Project** → Deploy from GitHub
3. Connect repo → Select `backend` folder (or root if backend is root)
4. Add variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CORS_ORIGIN` = your frontend URL
5. **Settings** → Add start command: `npm run build && npm start`
6. Deploy → Railway gives URL like `https://xxx.railway.app`

## Option C: Render (Free Tier Available)

1. Go to [render.com](https://render.com) → Sign up
2. **New** → **Web Service**
3. Connect GitHub repo
4. **Root directory:** `backend`
5. **Build command:** `npm install && npm run build`
6. **Start command:** `npm start`
7. Add **Environment variables** (same as above)
8. Deploy → Get URL like `https://tms-api.onrender.com`

---

# PHASE 3: Frontend Deployment (Cloudflare Pages)

## Step 3.1: Build Frontend Locally

```bash
cd TMS/frontend
```

Create `.env.production`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

Replace with your real backend URL (Hostinger/Railway).

Then:

```bash
npm run build
```

This creates `dist/` folder.

## Step 3.2: Deploy to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Connect GitHub → Select TMS repo
4. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontend`
5. **Environment variables** → Add:
   - `VITE_API_BASE_URL` = `https://api.yourdomain.com/api`
6. **Save and Deploy**

**Frontend URL:** `https://your-project.pages.dev`

## Step 3.3: Custom Domain (Optional)

1. In Cloudflare Pages → **Custom domains**
2. Add `app.yourdomain.com` or `tms.yourdomain.com`
3. Update DNS as shown by Cloudflare

---

# PHASE 4: Update Backend CORS

After frontend is live:

1. Update backend `.env`:
   ```
   CORS_ORIGIN=https://your-project.pages.dev
   ```
   Or your custom domain.

2. Restart backend:
   ```bash
   pm2 restart tms-api
   ```

---

# PHASE 5: iOS App – App Store (Mac Required)

**Important:** Building and submitting an iOS app needs a Mac with Xcode. You have two paths.

## Option A: Client’s Mac (Simplest)

Client must:

1. **Apple Developer Account**
   - [developer.apple.com](https://developer.apple.com)
   - $99/year

2. **Xcode** (free from Mac App Store)

3. **Steps on their Mac:**
   ```bash
   cd TMS/ios
   open TMSDriver.xcodeproj
   ```
   - In Xcode: Set **Team** (Apple ID)
   - Edit `TMSDriver/Config/APIConfig.swift`:
     ```swift
     // Production
     return "https://api.yourdomain.com/api"
     ```
   - **Product → Archive**
   - **Distribute App** → App Store Connect
   - Create app in [App Store Connect](https://appstoreconnect.apple.com)
   - Upload build, fill metadata, submit for review

## Option B: Cloud Mac (No Mac at Your Side)

Use a rented Mac in the cloud:

1. **MacinCloud** – [macincloud.com](https://www.macincloud.com)  
2. **MacStadium** – [macstadium.com](https://www.macstadium.com)  
3. **AWS EC2 Mac** – If you use AWS

Workflow: Remote into the Mac, install Xcode, clone repo, then follow the same steps as Option A.

---

# PHASE 6: Verification & Testing

## 6.1 Backend

```bash
curl https://api.yourdomain.com/api/health
```

Expected: `{"success":true,"message":"TMS API is running"}`

## 6.2 Frontend

1. Open `https://your-project.pages.dev` (or your custom domain)
2. Try **Login** with a test user
3. Check Dashboard, Loads, etc.
4. Open DevTools (F12) → Console: no `ERR_CONNECTION_REFUSED`

## 6.3 iOS App (After App Store Approval)

1. Install app from App Store on iPhone
2. Login with driver account
3. Dashboard, Trips, Start Trip flow

## 6.4 End-to-End Test

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open frontend URL | Login page loads |
| 2 | Login | Dashboard loads |
| 3 | Create load | Load appears in list |
| 4 | Assign driver | Assignment works |
| 5 | Driver app (web or iOS) | Sees assigned load |

---

# Quick Reference

## URLs After Deployment

| Component | URL Example |
|-----------|-------------|
| Frontend | `https://tms-app.pages.dev` |
| Backend API | `https://api.yourdomain.com/api` |
| Health check | `https://api.yourdomain.com/api/health` |
| iOS App | App Store (after approval) |

## Environment Variables Summary

### Backend (.env)

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=strong-random-secret-32-chars
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://your-frontend-url
```

### Frontend (Build-time)

```
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### iOS (APIConfig.swift)

```swift
return "https://api.yourdomain.com/api"
```

---

# Deployment Order (Recommended)

1. **MongoDB Atlas** (database)
2. **Backend** (Hostinger/Railway)
3. **Frontend** (Cloudflare)
4. **Update CORS** on backend with frontend URL
5. **iOS App** (client with Mac)

# Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS error | Ensure `CORS_ORIGIN` exactly matches frontend URL (no trailing slash) |
| 502 Bad Gateway | Backend not running: `pm2 status`, `pm2 logs tms-api` |
| MongoDB connection fail | Check `MONGODB_URI`, IP whitelist in Atlas (allow `0.0.0.0/0` for testing) |
| Login fails | Check JWT_SECRET, MongoDB has seeded users |
| iOS app can’t connect | Use HTTPS URL in `APIConfig`, no `localhost` |
| CORS blocks frontend | `CORS_ORIGIN` must match frontend URL exactly (no trailing slash) |
| Hostinger shared hosting | Use **VPS**, not shared – Node.js needs VPS/Cloud |

---

# Checklist for Client Handover

- [ ] MongoDB Atlas cluster created and URI saved
- [ ] Backend deployed (Hostinger/Railway) and health check passes
- [ ] Frontend deployed (Cloudflare Pages) and loads
- [ ] CORS set for frontend URL
- [ ] Test login and core flows
- [ ] iOS: Client has Apple Developer account
- [ ] iOS: Client uses Mac (or cloud Mac) to build and submit
- [ ] API URL updated in iOS `APIConfig.swift` before archive
- [ ] All credentials (DB, JWT, etc.) stored securely and shared only with client
