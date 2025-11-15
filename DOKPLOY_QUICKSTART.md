# Dokploy Quick Start Guide

## Overview
Your Medusa v2 application is ready for deployment on Dokploy. Just push to GitHub and deploy!

## Pre-Deployment Checklist

✅ **Files Ready:**
- [Dockerfile](Dockerfile) - Production-ready 3-stage build (Deps → Builder → Runner)
- [.dockerignore](.dockerignore) - Optimized build context
- [dokploy.yaml](dokploy.yaml) - Dokploy configuration
- [DOKPLOY_DEPLOYMENT.md](DOKPLOY_DEPLOYMENT.md) - Detailed deployment guide

## Key Features of This Setup

✅ **3-Stage Docker Build**: Deps → Builder → Runner for optimal caching
✅ **Node 22 LTS**: Latest stable version with security patches
✅ **Debian-based**: Avoids Alpine/musl compatibility issues
✅ **Health Checks**: Built-in container health monitoring
✅ **Security**: Non-root user, minimal dependencies, dumb-init
✅ **Auto-migrations**: Database migrations run automatically on startup

## Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Dokploy deployment"
git push origin main
```

### 2. Create Application in Dokploy

1. **Login** to your Dokploy dashboard
2. **Create Project** → Name: `36x-dashboard`
3. **Add Application** → Choose "GitHub"
4. **Connect Repository** → Select this repo
5. **Branch** → Select `main`

### 3. Configure Build Settings

**In Dokploy Application Settings:**
- **Build Method:** `Dockerfile`
- **Dockerfile Path:** `./Dockerfile`
- **Context Path:** `.`
- **Port:** `9000`

### 4. Set Up Database & Redis

#### Option A: Dokploy Managed (Recommended)

**PostgreSQL:**
- Navigate to: Databases → Add Database → PostgreSQL
- Name: `medusa-postgres`
- Version: `16`
- Database: `medusa-v2`
- Username: `medusa`
- Password: Generate strong password
- **Note the connection URL:** `postgresql://medusa:PASSWORD@medusa-postgres:5432/medusa-v2`

**Redis:**
- Navigate to: Databases → Add Database → Redis
- Name: `medusa-redis`
- Version: `7`
- **Note the connection URL:** `redis://medusa-redis:6379`

### 5. Configure Environment Variables

**In Dokploy Application → Environment Variables, add:**

```bash
# Application
NODE_ENV=production

# Database (use your actual credentials from step 4)
DATABASE_URL=postgresql://medusa:YOUR_PASSWORD@medusa-postgres:5432/medusa-v2

# Redis (use internal service name)
REDIS_URL=redis://medusa-redis:6379

# Security - Generate these using commands below
JWT_SECRET=<your-generated-secret>
COOKIE_SECRET=<your-generated-secret>

# CORS - Update with your actual domains
STORE_CORS=https://your-store.com,https://www.your-store.com
ADMIN_CORS=https://admin.your-domain.com
AUTH_CORS=https://admin.your-domain.com

# Razorpay Production Credentials
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Generate Secrets:**
```bash
# Run these commands to generate strong secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### 6. Deploy! 🚀

1. Click **"Deploy"** in Dokploy
2. Monitor build logs
3. Wait for deployment to complete (~5-10 minutes)

### 7. Setup Domain (Optional)

1. In Dokploy → Your Application → Domains
2. Add domain: `api.yourdomain.com`
3. Enable SSL (Let's Encrypt)
4. Save

### 8. Configure Razorpay Webhook

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/app/webhooks)
2. Add webhook:
   - **URL:** `https://your-domain.com/webhooks/razorpay`
   - **Secret:** Generate and add to `RAZORPAY_WEBHOOK_SECRET`
   - **Events:** Select all payment events

### 9. Verify Deployment

```bash
# Health check
curl https://your-domain.com/health

# Access admin panel
https://your-domain.com/app
```

## Enable Auto-Deploy (Important!)

**To auto-deploy on every push:**

1. In Dokploy → Your Application → Git Settings
2. Enable **"Auto Deploy"**
3. Branch: `main`
4. Save

**Now you can just push changes and they'll deploy automatically! 🎉**

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin main

# Dokploy automatically detects the push and deploys!
```

## Post-Deployment

### Access Admin Dashboard
1. Navigate to: `https://your-domain.com/app`
2. Create admin user (first-time)
3. Login and configure your store

### Seed Data (Optional)
Connect to Dokploy shell and run:
```bash
npm run seed
```

## Troubleshooting

### Build Fails
- Check Dokploy build logs
- Verify Node.js version (requires 20+)
- Ensure environment variables are set

### App Won't Start
- **Database:** Verify `DATABASE_URL` is correct
- **Redis:** Verify `REDIS_URL` is correct
- **Migrations:** Check migration logs in Dokploy

### CORS Errors
Update CORS environment variables with actual domains:
```bash
STORE_CORS=https://your-frontend.com
ADMIN_CORS=https://admin.your-domain.com
```

## Need More Details?

See [DOKPLOY_DEPLOYMENT.md](DOKPLOY_DEPLOYMENT.md) for comprehensive deployment guide.

## Support

- **Medusa Docs:** https://docs.medusajs.com
- **Dokploy Docs:** https://dokploy.com/docs
- **Razorpay Docs:** https://razorpay.com/docs

---

**Ready to deploy? Follow steps 1-9 above and you're live!** 🚀
