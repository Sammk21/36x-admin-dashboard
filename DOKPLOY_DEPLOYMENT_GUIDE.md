# Medusa v2 Production Deployment Guide for Dokploy

This guide will walk you through deploying your Medusa v2 application on Dokploy with proper production configuration using Docker.

## Prerequisites

- [x] GitHub repository connected to Dokploy
- [x] Dockerfile configured (already included in this repository)
- [ ] PostgreSQL database (can be created in Dokploy or external service like Neon)
- [ ] Redis database (can be created in Dokploy or external service like Redis Cloud)

## Quick Reference: Dockerfile Configuration in Dokploy

When configuring your application in Dokploy, use these settings:

| Setting | Value | Description |
|---------|-------|-------------|
| **Dockerfile Path** | `Dockerfile` (server) or `Dockerfile.worker` (worker) | Path to Dockerfile in repo |
| **Docker Context Path** | `.` | Root directory of the project |
| **Docker Build Stage** | `runner` | Production stage from multi-stage build |

The Dockerfile handles:
- Multi-stage build for optimization
- Installing dependencies
- Building the Medusa application
- Running migrations (server only)
- Starting the application in production mode
- Health checks (server only)

## Architecture Overview

You will deploy **TWO separate instances** of your Medusa application:

1. **Server Instance**: Handles API requests and serves the Admin dashboard
2. **Worker Instance**: Processes background tasks (scheduled jobs, subscribers)

Both instances share the same PostgreSQL and Redis databases.

---

## Step 1: Create PostgreSQL Database

### Option A: Using Dokploy
1. In Dokploy dashboard, go to **Databases** → **Create Database**
2. Select **PostgreSQL**
3. Set database name: `medusa_production`
4. Note the connection URL provided by Dokploy

### Option B: Using Neon (Recommended for production)
1. Go to [Neon](https://neon.tech/) and create a free account
2. Create a new project
3. Copy the connection string (format: `postgresql://user:password@host/database`)

**Save this URL as `DATABASE_URL`** - you'll need it for both instances.

---

## Step 2: Create Redis Database

### Option A: Using Dokploy
1. In Dokploy dashboard, go to **Databases** → **Create Database**
2. Select **Redis**
3. Set database name: `medusa_redis`
4. Note the connection URL provided by Dokploy

### Option B: Using Redis Cloud (Recommended for production)
1. Go to [Redis Cloud](https://redis.io/cloud/) and create a free account
2. Create a new database
3. Copy the connection string (format: `redis://default:password@host:port`)

**Save this URL as `REDIS_URL`** - you'll need it for both instances.

---

## Step 3: Generate Security Secrets

Generate secure random secrets for production:

```bash
# Generate COOKIE_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32
```

**Save these secrets** - you'll use the same values for both instances.

---

## Step 4: Deploy Server Instance (API + Admin)

### 4.1 Create Application in Dokploy

1. In Dokploy dashboard, go to **Applications** → **Create Application**
2. Select your GitHub repository
3. Set application name: `medusa-server`
4. Set branch: `main` (or your production branch)
5. **Build Type**: Select **Dockerfile**

### 4.2 Configure Docker Build Settings

In Dokploy, configure the following Docker settings:

- **Dockerfile Path**: `Dockerfile`
- **Docker Context Path**: `.` (dot - represents root directory)
- **Docker Build Stage**: `runner` (uses the production stage from multi-stage build)

The Dockerfile is already configured to:
- Build the Medusa application
- Run migrations on startup via `predeploy` script
- Start the server in production mode
- Include health checks

### 4.3 Set Environment Variables

In Dokploy, add the following environment variables for the **server instance**:

```bash
# Database & Redis
DATABASE_URL=<your-postgresql-connection-url>
REDIS_URL=<your-redis-connection-url>

# Security (use the secrets you generated)
COOKIE_SECRET=<your-generated-cookie-secret>
JWT_SECRET=<your-generated-jwt-secret>

# Worker Mode Configuration
MEDUSA_WORKER_MODE=server
DISABLE_MEDUSA_ADMIN=false

# Server Configuration
PORT=9000
NODE_ENV=production

# Backend URL (will be updated after deployment)
MEDUSA_BACKEND_URL=https://your-server-url.com

# CORS Configuration (will be updated after deployment)
ADMIN_CORS=https://your-server-url.com
STORE_CORS=https://your-storefront-url.com
AUTH_CORS=https://your-server-url.com,https://your-storefront-url.com

# Razorpay Configuration
RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_KEY_SECRET=<your-razorpay-key-secret>
RAZORPAY_WEBHOOK_SECRET=<your-razorpay-webhook-secret>
```

### 4.4 Deploy

1. Click **Deploy** in Dokploy
2. Wait for the build and deployment to complete
3. Once deployed, **note the server URL** (e.g., `https://medusa-server.yourdomain.com`)

### 4.5 Update Environment Variables with Server URL

After getting the server URL, update these environment variables:

```bash
MEDUSA_BACKEND_URL=https://medusa-server.yourdomain.com
ADMIN_CORS=https://medusa-server.yourdomain.com
AUTH_CORS=https://medusa-server.yourdomain.com,https://your-storefront-url.com
```

Click **Redeploy** for changes to take effect.

---

## Step 5: Deploy Worker Instance (Background Tasks)

### 5.1 Create Application in Dokploy

1. In Dokploy dashboard, go to **Applications** → **Create Application**
2. Select the **SAME GitHub repository**
3. Set application name: `medusa-worker`
4. Set branch: `main` (same as server instance)
5. **Build Type**: Select **Dockerfile**

### 5.2 Configure Docker Build Settings

In Dokploy, configure the following Docker settings:

- **Dockerfile Path**: `Dockerfile`
- **Docker Context Path**: `.` (dot - represents root directory)
- **Docker Build Stage**: `runner` (uses the same production stage)

**You have TWO options for the worker instance:**

#### Option A: Use Same Dockerfile (Recommended for simplicity)
- **Dockerfile Path**: `Dockerfile`
- The worker will run migrations on startup (harmless, as Medusa migrations are idempotent)

#### Option B: Use Separate Worker Dockerfile (Recommended for optimization)
- **Dockerfile Path**: `Dockerfile.worker`
- This Dockerfile is optimized for workers and **does NOT run migrations**
- Slightly faster startup time

### 5.3 Set Environment Variables

In Dokploy, add the following environment variables for the **worker instance**:

```bash
# Database & Redis (SAME as server instance)
DATABASE_URL=<your-postgresql-connection-url>
REDIS_URL=<your-redis-connection-url>

# Security (SAME secrets as server instance)
COOKIE_SECRET=<same-cookie-secret-as-server>
JWT_SECRET=<same-jwt-secret-as-server>

# Worker Mode Configuration
MEDUSA_WORKER_MODE=worker
DISABLE_MEDUSA_ADMIN=true

# Server Configuration
PORT=9000
NODE_ENV=production

# Razorpay Configuration (SAME as server instance)
RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_KEY_SECRET=<your-razorpay-key-secret>
RAZORPAY_WEBHOOK_SECRET=<your-razorpay-webhook-secret>
```

**Important:** The worker instance doesn't need CORS or ADMIN settings since it only processes background tasks.

### 5.4 Deploy

1. Click **Deploy** in Dokploy
2. Wait for the build and deployment to complete

---

## Step 6: Create Admin User

After both instances are deployed, create an admin user to access the Medusa Admin:

### Option A: Using Dokploy Console

1. Go to your **server instance** in Dokploy
2. Open the **Console/Terminal**
3. Run:
```bash
cd .medusa/server && npx medusa user -e admin@yourdomain.com -p your-secure-password
```

### Option B: SSH into your server

```bash
ssh into-your-dokploy-server
cd /path/to/medusa-server/.medusa/server
npx medusa user -e admin@yourdomain.com -p your-secure-password
```

**Replace:**
- `admin@yourdomain.com` with your email
- `your-secure-password` with a secure password

---

## Step 7: Test Your Deployment

### 7.1 Test Server Health

Visit: `https://your-server-url.com/health`

You should see: `OK`

### 7.2 Access Admin Dashboard

Visit: `https://your-server-url.com/app`

Log in with the admin credentials you created.

### 7.3 Test API Endpoints

Test a simple API endpoint:
```bash
curl https://your-server-url.com/store/products
```

---

## Step 8: Configure Custom Domain (Optional)

If you want to use a custom domain:

1. In Dokploy, go to your **server instance**
2. Navigate to **Domains** section
3. Add your custom domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed by Dokploy
5. Update environment variables with the new domain:
   ```bash
   MEDUSA_BACKEND_URL=https://api.yourdomain.com
   ADMIN_CORS=https://api.yourdomain.com
   AUTH_CORS=https://api.yourdomain.com,https://store.yourdomain.com
   ```
6. Redeploy the application

---

## Resource Requirements

For optimal performance, ensure your Dokploy server/plan has:

- **RAM**: At least 2GB (4GB recommended)
- **CPU**: 2 cores minimum
- **Storage**: At least 10GB

---

## Monitoring and Logs

### View Application Logs

In Dokploy:
1. Go to your application (server or worker)
2. Click on **Logs** tab
3. Monitor real-time logs for errors or issues

### Health Check Endpoint

Monitor your server health: `https://your-server-url.com/health`

Set up automated health checks in Dokploy or use external monitoring tools.

---

## Troubleshooting

### Issue: "Cannot connect to database"
**Solution:** Verify `DATABASE_URL` is correct and the database is accessible from Dokploy.

### Issue: "Cannot connect to Redis"
**Solution:** Verify `REDIS_URL` is correct and Redis is accessible from Dokploy.

### Issue: "Admin login not working"
**Solution:**
- Check that `ADMIN_CORS` includes your server URL
- Verify `COOKIE_SECRET` and `JWT_SECRET` are set
- Ensure you're using HTTPS in production

### Issue: "Worker not processing background tasks"
**Solution:**
- Check worker instance logs in Dokploy
- Verify worker instance is running with `MEDUSA_WORKER_MODE=worker`
- Ensure Redis connection is working

### Issue: "Build failing"
**Solution:**
- Check build logs in Dokploy
- Ensure all dependencies are in `package.json`
- Verify Node.js version (should be >= 20)

### Issue: "Cannot find module @rollup/rollup-linux-x64-gnu" during build
**Solution:** This is a known npm bug with optional dependencies. The Dockerfile has been updated to fix this by using `npm install` instead of `npm ci` in the builder stage. If you still encounter this:
- Make sure you're using the latest Dockerfile from the repository
- The Dockerfile automatically removes package-lock.json before installing dependencies in the build stage
- This is already handled in both `Dockerfile` and `Dockerfile.worker`

### Issue: "Docker build takes too long"
**Solution:**
- The multi-stage build is optimized for layer caching
- Subsequent builds will be faster as Docker caches unchanged layers
- Make sure `.dockerignore` is present to exclude unnecessary files

---

## Security Checklist

- [ ] Generated secure random `COOKIE_SECRET` and `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Configured proper CORS settings
- [ ] Using HTTPS for all URLs
- [ ] Database credentials are secure
- [ ] Redis credentials are secure
- [ ] Razorpay secrets are properly set
- [ ] Admin user has a strong password

---

## Updating Your Application

When you push changes to your GitHub repository:

1. Dokploy will automatically detect the changes
2. Both server and worker instances will rebuild and redeploy
3. Migrations will run automatically on the server instance (via `predeploy` script)

To manually trigger a deployment:
1. Go to your application in Dokploy
2. Click **Redeploy**

---

## Next Steps

1. **Deploy Storefront**: Deploy your Next.js/React storefront (if applicable)
2. **Set up Monitoring**: Configure application monitoring and alerts
3. **Backup Strategy**: Set up automated database backups
4. **CDN**: Consider using a CDN for static assets
5. **Scaling**: Monitor resource usage and scale as needed

---

## Support

- **Medusa Documentation**: https://docs.medusajs.com
- **Dokploy Documentation**: Check your Dokploy instance docs
- **Medusa Discord**: Join the Medusa community for support

---

## Summary of Instances

| Instance | Worker Mode | Admin | Purpose | Port |
|----------|-------------|-------|---------|------|
| **Server** | `server` | Enabled | API + Admin Dashboard | 9000 |
| **Worker** | `worker` | Disabled | Background Tasks | 9000 |

Both instances share:
- Same PostgreSQL database
- Same Redis database
- Same security secrets
- Same codebase (different environment variables)

---

**Congratulations! Your Medusa v2 application is now production-ready and deployed on Dokploy!**
