# TMS Enterprise Deployment Guide

**1000+ Users | Professional Support | Production-Ready**

---

## Recommended Stack (1000+ Users)

| Component | Service | Why |
|-----------|---------|-----|
| **Database** | MongoDB Atlas M10+ | Dedicated cluster, auto-scaling |
| **Backend** | AWS EC2 / DigitalOcean / Railway Pro | Multiple instances, load balancer |
| **Frontend** | Cloudflare Pages + CDN | Global CDN, DDoS protection |
| **Monitoring** | UptimeRobot + Sentry | 24/7 uptime, error tracking |
| **Support** | Help docs + Status page | User self-service |

---

## 1. Database (MongoDB Atlas)

### For 1000+ Users: M10 Cluster

1. **MongoDB Atlas** → Create **M10** cluster (not free M0)
2. **Region**: Same as backend (low latency)
3. **Backup**: Enable continuous backup
4. **Indexes**: Ensure indexes on:
   - `loads`: companyId, driverId, status, createdAt
   - `users`: email, companyId
   - `notifications`: userId, read, createdAt

### Connection String

```
MONGODB_URI=mongodb+srv://user:pass@cluster.xxx.mongodb.net/tms?retryWrites=true&w=majority&maxPoolSize=50
```

`maxPoolSize=50` helps with concurrent connections.

---

## 2. Backend (Scalable)

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<64-char-random-string>
JWT_EXPIRES_IN=24h

# Multiple origins - web, custom domains
CORS_ORIGIN=https://app.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://tms.pages.dev
```

### Rate Limiting (Already Added)

- **200 requests / 15 min** per IP (production)
- Prevents abuse, DDoS
- Adjust in `app.ts` if needed

### Scaling Options

| Option | Setup | Cost/mo |
|--------|-------|---------|
| **Single server** | 4 CPU, 8GB RAM | ~$40 |
| **2 instances + load balancer** | High availability | ~$80 |
| **Railway Pro** | Auto-scale | ~$20 |
| **AWS ECS/Fargate** | Container, auto-scale | ~$50+ |

---

## 3. Monitoring & Support

### Uptime Monitoring (Free)

1. [UptimeRobot.com](https://uptimerobot.com) → Free account
2. Add monitor: `https://api.yourdomain.com/api/health`
3. Check interval: 5 min
4. Alerts: Email/SMS when down

### Error Tracking (Sentry)

1. [sentry.io](https://sentry.io) → Create project
2. Add to backend (optional):
   ```bash
   npm install @sentry/node
   ```
3. Get errors in real-time, stack traces

### Status Page (Optional)

- [statuspage.io](https://statuspage.io) or custom `/status` page
- Shows: API, Frontend, Database status
- Users check before contacting support

---

## 4. Support for Users

### In-App Help

- Add **Help** or **?** in settings
- Link to: FAQ, Contact, Status page

### Common Support Scenarios

| Issue | Solution |
|-------|----------|
| Login failed | Reset password, check email |
| App slow | Check status page, try again |
| iOS app not loading | Reinstall, check network |
| Document upload failed | File size < 25MB, retry |

### Support Channels

- Email: support@yourdomain.com (update in Sidebar.tsx)
- In-app: Help & Support link in sidebar
- Status page: For outages

---

## 5. Security Checklist

- [ ] HTTPS only (no HTTP)
- [ ] Strong JWT_SECRET (64+ chars)
- [ ] MongoDB: IP whitelist or VPC peering
- [ ] Rate limiting enabled
- [ ] CORS restricted to known origins
- [ ] Regular backups (MongoDB Atlas)
- [ ] Env vars not in git

---

## 6. Performance for 1000+ Users

### Backend

- **Connection pooling**: `maxPoolSize=50` in MongoDB URI
- **Indexes**: On frequently queried fields
- **Pagination**: All list APIs use limit/skip

### Frontend

- **CDN**: Cloudflare (automatic)
- **Lazy loading**: Already in place
- **Caching**: Browser cache for static assets

### iOS App

- **API URL**: Use production HTTPS
- **Retry logic**: On network failure

---

## 7. Deployment Checklist

| Step | Done |
|------|------|
| MongoDB Atlas M10 cluster | |
| Backend env vars set | |
| CORS_ORIGIN + CORS_ORIGINS configured | |
| Frontend built with correct API URL | |
| SSL/HTTPS enabled | |
| UptimeRobot monitoring | |
| Backup schedule verified | |
| Support email/channel set | |

---

## 8. Quick Verification

```bash
# Health
curl https://api.yourdomain.com/api/health

# Readiness (DB connected)
curl https://api.yourdomain.com/api/health/ready
```

Both should return 200 OK.
