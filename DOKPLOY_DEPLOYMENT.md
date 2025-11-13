# Dokploy Deployment Guide for 36x Medusa Dashboard

This guide will help you deploy your Medusa v2 e-commerce backend with Razorpay integration to Dokploy.

## Prerequisites

- A Dokploy instance up and running
- GitHub repository connected to Dokploy
- Domain name (optional but recommended)
- Razorpay account with API credentials

## Deployment Steps

### 1. Prepare Your GitHub Repository

Make sure all the following files are committed to your repository:
- `Dockerfile` - Multi-stage Docker build configuration
- `.dockerignore` - Files to exclude from Docker build
- `dokploy.yaml` - Dokploy configuration (optional, can configure via UI)
- `.env.template` - Environment variables template

### 2. Connect Repository to Dokploy

1. Log in to your Dokploy dashboard
2. Create a new project: **36x-dashboard**
3. Click "Add Application" → "From GitHub"
4. Select your repository
5. Choose the main/master branch

### 3. Configure Database (PostgreSQL)

#### Option A: Using Dokploy Managed Database
1. In Dokploy, go to "Databases" → "Add Database"
2. Select **PostgreSQL**
3. Configuration:
   - **Name**: `medusa-postgres`
   - **Version**: `16`
   - **Database Name**: `medusa-v2`
   - **Username**: `medusa`
   - **Password**: Generate a strong password
4. Note the connection string (internal): `postgresql://medusa:password@medusa-postgres:5432/medusa-v2`

#### Option B: External Database
Use your own PostgreSQL instance and note the connection URL.

### 4. Configure Redis

#### Option A: Using Dokploy Managed Redis
1. In Dokploy, go to "Databases" → "Add Database"
2. Select **Redis**
3. Configuration:
   - **Name**: `medusa-redis`
   - **Version**: `7`
4. Note the connection string (internal): `redis://medusa-redis:6379`

#### Option B: External Redis
Use your own Redis instance and note the connection URL.

### 5. Configure Environment Variables in Dokploy

In your application settings, add these environment variables:

#### Required Variables
```bash
# Application
NODE_ENV=production

# Database (use your actual credentials)
DATABASE_URL=postgresql://medusa:YOUR_PASSWORD@medusa-postgres:5432/medusa-v2

# Redis (use internal service name if using Dokploy Redis)
REDIS_URL=redis://medusa-redis:6379

# Security (GENERATE NEW SECRETS!)
JWT_SECRET=<generate-strong-random-secret-64-chars>
COOKIE_SECRET=<generate-strong-random-secret-64-chars>

# CORS - Update with your actual domains
STORE_CORS=https://your-store-domain.com,https://www.your-store-domain.com
ADMIN_CORS=https://your-admin-domain.com,https://admin.your-domain.com
AUTH_CORS=https://your-admin-domain.com,https://admin.your-domain.com

# Razorpay Configuration (Production)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### How to Generate Secrets
Use one of these methods:

**Method 1: OpenSSL**
```bash
openssl rand -base64 48
```

**Method 2: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Method 3: Online Tool**
Visit: https://www.random.org/strings/

### 6. Configure Build Settings in Dokploy

1. **Build Method**: Dockerfile
2. **Dockerfile Path**: `./Dockerfile`
3. **Context Path**: `.`
4. **Port**: `9000`

### 7. Set Up Domain (Optional)

1. In Dokploy application settings, go to "Domains"
2. Add your domain: `api.yourdomain.com`
3. Enable SSL/HTTPS (Let's Encrypt)
4. Save and apply

### 8. Configure Razorpay Webhooks

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/app/webhooks)
2. Click "Add New Webhook"
3. Configuration:
   - **Webhook URL**: `https://your-domain.com/webhooks/razorpay`
   - **Secret**: Generate a secret and add it to `RAZORPAY_WEBHOOK_SECRET` env var
   - **Events**: Select all payment-related events
4. Save the webhook

### 9. Deploy the Application

1. In Dokploy, click **"Deploy"** button
2. Monitor the build logs
3. Wait for the deployment to complete

The deployment process will:
- Pull your code from GitHub
- Build the Docker image using the Dockerfile
- Run database migrations automatically
- Start the Medusa server on port 9000

### 10. Verify Deployment

Check if the application is running:

```bash
# Health check
curl https://your-domain.com/health

# Admin panel
https://your-domain.com/app

# Store API
curl https://your-domain.com/store/products
```

## Post-Deployment

### Access the Admin Dashboard

1. Navigate to: `https://your-domain.com/app`
2. Create your admin user (first-time setup)
3. Log in with your credentials

### Seed Initial Data (Optional)

If you want to seed your database with initial data:

1. Connect to your Dokploy application shell/terminal
2. Run: `npm run seed`

## Troubleshooting

### Build Fails

**Check build logs in Dokploy**:
- Look for missing environment variables
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility (requires Node 20+)

### Application Won't Start

**Common issues**:
1. Database connection failure
   - Verify `DATABASE_URL` is correct
   - Ensure PostgreSQL service is running
   - Check network connectivity between services

2. Redis connection failure
   - Verify `REDIS_URL` is correct
   - Ensure Redis service is running

3. Migration errors
   - Check database permissions
   - Review migration logs
   - Manually run migrations if needed: `npx medusa db:migrate`

### CORS Errors

Update the CORS environment variables with your actual domains:
```bash
STORE_CORS=https://your-frontend.com,https://www.your-frontend.com
ADMIN_CORS=https://admin.your-domain.com
```

### Razorpay Webhook Not Working

1. Verify `RAZORPAY_WEBHOOK_SECRET` matches the Razorpay dashboard
2. Check webhook URL is publicly accessible
3. Review webhook logs in Razorpay dashboard
4. Ensure HTTPS is enabled (required for production webhooks)

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Application environment | `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Yes | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | Random 64-char string |
| `COOKIE_SECRET` | Yes | Secret for cookies | Random 64-char string |
| `STORE_CORS` | Yes | Allowed origins for store API | `https://store.com` |
| `ADMIN_CORS` | Yes | Allowed origins for admin | `https://admin.com` |
| `AUTH_CORS` | Yes | Allowed origins for auth | `https://admin.com` |
| `RAZORPAY_KEY_ID` | Yes | Razorpay API key ID | `rzp_live_xxxxx` |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay API secret | `your_secret_key` |
| `RAZORPAY_WEBHOOK_SECRET` | Recommended | Razorpay webhook secret | `whsec_xxxxx` |

## Updating Your Application

To deploy updates:

1. Push changes to your GitHub repository
2. In Dokploy, click **"Redeploy"**
3. Monitor the build and deployment process
4. Changes will be live once deployment completes

## Automatic Deployments

Enable automatic deployments in Dokploy:
1. Go to application settings → "Git"
2. Enable "Auto Deploy"
3. Select branch (main/master)
4. Save

Now every push to the selected branch will trigger an automatic deployment.

## Scaling

To handle more traffic:

1. **Vertical Scaling**: Increase memory/CPU in Dokploy resource settings
2. **Horizontal Scaling**: Increase replica count in Dokploy
3. **Database**: Consider upgrading your PostgreSQL instance
4. **Redis**: Consider Redis Cluster for high availability

## Monitoring

Monitor your application:
- Use Dokploy built-in monitoring
- Check application logs regularly
- Set up health check alerts
- Monitor database and Redis performance

## Backup Strategy

**Database Backups**:
1. Use Dokploy automatic backups (if available)
2. Or set up manual PostgreSQL backups:
   ```bash
   pg_dump -h host -U medusa medusa-v2 > backup.sql
   ```

**Configuration Backups**:
- Keep `.env.production` template in a secure location (1Password, etc.)
- Document all environment variables

## Security Best Practices

1. ✅ Use strong, unique secrets for JWT and cookies
2. ✅ Enable HTTPS/SSL for all domains
3. ✅ Use production Razorpay keys (not test keys)
4. ✅ Restrict CORS to your actual domains only
5. ✅ Keep Razorpay webhook secret secure
6. ✅ Regularly update dependencies
7. ✅ Use strong PostgreSQL passwords
8. ✅ Never commit `.env` or `.env.production` to Git

## Support Resources

- **Medusa Documentation**: https://docs.medusajs.com
- **Dokploy Documentation**: https://dokploy.com/docs
- **Razorpay Documentation**: https://razorpay.com/docs
- **This Project**: See [README.md](./README.md)

## Next Steps

After successful deployment:
1. Configure your storefront to connect to this backend
2. Set up your product catalog
3. Configure shipping and tax settings
4. Test the complete checkout flow with Razorpay
5. Monitor logs and performance

---

**Need Help?**
- Check Dokploy logs for errors
- Review this guide's troubleshooting section
- Consult Medusa documentation for backend issues
- Check Razorpay dashboard for payment issues
