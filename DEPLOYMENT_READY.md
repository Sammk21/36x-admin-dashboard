# 🚀 Deployment Ready - Complete Setup Summary

Your Medusa v2 application is now **fully configured** for automatic deployment on Dokploy!

## ✅ What's Been Set Up

### 1. **Production-Ready Dockerfile** ([Dockerfile](Dockerfile))
- **3-Stage Build Process**:
  - **Stage 1 (deps)**: Installs all dependencies with proper build tools
  - **Stage 2 (builder)**: Builds the Medusa application (`npx medusa build`)
  - **Stage 3 (runner)**: Minimal production image with only runtime needs

- **Key Features**:
  - ✅ Node.js 22 LTS (latest stable)
  - ✅ Debian Bookworm base (avoids Alpine/musl issues)
  - ✅ Multi-stage for minimal final image size
  - ✅ `--legacy-peer-deps` to handle Medusa v2 OpenTelemetry conflicts
  - ✅ Automatic database migrations on container start
  - ✅ Built-in health checks
  - ✅ Non-root user for security
  - ✅ Proper signal handling with dumb-init

### 2. **Optimized .dockerignore** ([.dockerignore](.dockerignore))
- Excludes development files, tests, and documentation
- Keeps build context minimal for faster builds
- Allows `.medusa` directory to be generated during build

### 3. **Environment Configuration** ([medusa-config.ts](medusa-config.ts))
- Database URL (PostgreSQL)
- Redis URL
- JWT & Cookie secrets
- CORS configuration
- Razorpay payment integration

### 4. **Documentation**
- [DOKPLOY_QUICKSTART.md](DOKPLOY_QUICKSTART.md) - Quick deployment guide
- [DOKPLOY_DEPLOYMENT.md](DOKPLOY_DEPLOYMENT.md) - Comprehensive deployment guide
- [dokploy.yaml](dokploy.yaml) - Dokploy configuration reference

---

## 🎯 Deploy in 3 Steps

### Step 1: Commit & Push
```bash
git add .
git commit -m "Production-ready Dokploy deployment setup"
git push origin main
```

### Step 2: Configure Dokploy
1. **Create Application** in Dokploy dashboard
2. **Connect GitHub** repository
3. **Set Build Settings**:
   - Build Method: `Dockerfile`
   - Dockerfile Path: `./Dockerfile`
   - Port: `9000`

4. **Add Databases**:
   - PostgreSQL 16
   - Redis 7

5. **Configure Environment Variables** (see below)

### Step 3: Deploy!
Click **"Deploy"** in Dokploy → Your app goes live! 🎉

---

## 🔐 Required Environment Variables

Configure these in Dokploy → Application → Environment Variables:

```bash
# Application
NODE_ENV=production

# Database (from Dokploy PostgreSQL)
DATABASE_URL=postgresql://medusa:YOUR_PASSWORD@medusa-postgres:5432/medusa-v2

# Redis (from Dokploy Redis)
REDIS_URL=redis://medusa-redis:6379

# Security Secrets (generate with: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
JWT_SECRET=<your-generated-secret-here>
COOKIE_SECRET=<your-generated-secret-here>

# CORS - Update with your actual domains
STORE_CORS=https://your-store.com,https://www.your-store.com
ADMIN_CORS=https://admin.your-domain.com
AUTH_CORS=https://admin.your-domain.com

# Razorpay Production Credentials
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Generate Secrets:
```bash
# Run these to generate strong secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## 🔄 Enable Auto-Deploy

**After first successful deployment:**

1. Go to Dokploy → Your Application → **Git Settings**
2. Enable **"Auto Deploy"**
3. Branch: `main`
4. Save

**Now every push to `main` automatically deploys!** 🎯

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main
# ✨ Auto-deploys to production!
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────┐
│          DOKPLOY DEPLOYMENT                 │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   Medusa v2 Application             │   │
│  │   Port: 9000                        │   │
│  │   - Admin: /app                     │   │
│  │   - Store API: /store/*             │   │
│  │   - Webhooks: /webhooks/razorpay    │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│  ┌──────────▼──────────┐  ┌──────────────┐ │
│  │  PostgreSQL 16      │  │   Redis 7    │ │
│  │  medusa-v2 database │  │   Cache      │ │
│  └─────────────────────┘  └──────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🏥 Health & Monitoring

### Built-in Health Check
- **Endpoint**: `https://your-domain.com/health`
- **Docker Health Check**: Automatic (30s interval)
- **Startup Grace Period**: 40 seconds

### Test Health:
```bash
curl https://your-domain.com/health
# Expected: {"status":"ok"}
```

---

## 🔧 Build Process Explained

When Dokploy builds your application:

1. **Stage 1 - Dependencies**
   - Installs build tools (Python, build-essential)
   - Runs `npm ci --legacy-peer-deps`
   - Installs ALL dependencies (dev + prod)

2. **Stage 2 - Builder**
   - Copies node_modules from Stage 1
   - Copies application source
   - Runs `npx medusa build`
   - Generates `.medusa/server` (backend) and `.medusa/client` (admin)

3. **Stage 3 - Production Runner**
   - Fresh minimal base image
   - Installs ONLY production dependencies
   - Copies built `.medusa` directory
   - Copies source files (for runtime modules)
   - Runs as non-root user
   - On start: Runs migrations → Starts server

**Total Build Time**: ~5-10 minutes (first build)
**Subsequent Builds**: ~3-5 minutes (with caching)

---

## 🐛 Troubleshooting

### Build Fails
1. Check Dokploy build logs
2. Verify all environment variables are set
3. Ensure PostgreSQL and Redis are running

### App Won't Start
```bash
# Common issues:
DATABASE_URL - incorrect connection string
REDIS_URL - Redis not accessible
JWT_SECRET - not set or too short
```

### Admin Panel Not Loading
1. Verify `ADMIN_CORS` includes your domain
2. Check admin built successfully (look for `.medusa/client` in logs)
3. Access: `https://your-domain.com/app`

### CORS Errors
Update environment variables:
```bash
STORE_CORS=https://your-frontend.com
ADMIN_CORS=https://admin.your-domain.com
```

---

## 📚 Additional Resources

- **Quick Start**: [DOKPLOY_QUICKSTART.md](DOKPLOY_QUICKSTART.md)
- **Full Guide**: [DOKPLOY_DEPLOYMENT.md](DOKPLOY_DEPLOYMENT.md)
- **Medusa Docs**: https://docs.medusajs.com
- **Dokploy Docs**: https://dokploy.com/docs

---

## 🎉 You're Ready!

Your Medusa v2 application is production-ready with:
- ✅ Optimized Docker build
- ✅ Automatic deployments
- ✅ Health monitoring
- ✅ Database migrations
- ✅ Security best practices
- ✅ Razorpay payment integration

**Next Step**: Follow [DOKPLOY_QUICKSTART.md](DOKPLOY_QUICKSTART.md) to deploy! 🚀
