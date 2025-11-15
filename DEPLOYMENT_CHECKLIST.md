# 🚀 Deployment Checklist

Use this checklist to ensure a smooth deployment to Dokploy.

---

## ✅ Pre-Deployment Checklist

### Files & Configuration
- [x] **Dockerfile** - Production-ready 3-stage build
- [x] **.dockerignore** - Optimized for minimal build context
- [x] **medusa-config.ts** - Environment variables configured
- [x] **package.json** - Dependencies up to date
- [ ] **Git repository** - All changes committed and pushed

### Local Verification
```bash
# 1. Check all files are present
ls -la Dockerfile .dockerignore medusa-config.ts

# 2. Verify no sensitive data in code
grep -r "rzp_live" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "password" . --exclude-dir=node_modules --exclude-dir=.git

# 3. Commit and push
git add .
git commit -m "Production deployment setup"
git push origin main
```

---

## 🔧 Dokploy Setup Checklist

### 1. Create Project
- [ ] Login to Dokploy dashboard
- [ ] Create new project: `36x-dashboard`

### 2. Connect GitHub Repository
- [ ] Add application → Select "GitHub"
- [ ] Choose repository
- [ ] Select branch: `main`

### 3. Configure Build Settings
- [ ] Build Method: `Dockerfile`
- [ ] Dockerfile Path: `./Dockerfile`
- [ ] Context Path: `.`
- [ ] Port: `9000`

### 4. Setup PostgreSQL Database
- [ ] Go to Databases → Add Database
- [ ] Type: PostgreSQL
- [ ] Name: `medusa-postgres`
- [ ] Version: `16`
- [ ] Database: `medusa-v2`
- [ ] Username: `medusa`
- [ ] Password: _(Generate strong password)_
- [ ] **Save connection URL**: `postgresql://medusa:PASSWORD@medusa-postgres:5432/medusa-v2`

### 5. Setup Redis
- [ ] Go to Databases → Add Database
- [ ] Type: Redis
- [ ] Name: `medusa-redis`
- [ ] Version: `7`
- [ ] **Save connection URL**: `redis://medusa-redis:6379`

---

## 🔐 Environment Variables Setup

### Generate Secrets
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Cookie Secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### Add to Dokploy
Go to Application → Environment Variables → Add these:

#### Required Variables
- [ ] `NODE_ENV` = `production`
- [ ] `DATABASE_URL` = _(from PostgreSQL setup)_
- [ ] `REDIS_URL` = _(from Redis setup)_
- [ ] `JWT_SECRET` = _(generated above)_
- [ ] `COOKIE_SECRET` = _(generated above)_
- [ ] `STORE_CORS` = `https://your-store.com`
- [ ] `ADMIN_CORS` = `https://admin.your-domain.com`
- [ ] `AUTH_CORS` = `https://admin.your-domain.com`

#### Razorpay Variables
- [ ] `RAZORPAY_KEY_ID` = `rzp_live_xxxxx`
- [ ] `RAZORPAY_KEY_SECRET` = _(from Razorpay dashboard)_
- [ ] `RAZORPAY_WEBHOOK_SECRET` = _(create webhook first)_

**Reference**: See [.env.production.example](.env.production.example)

---

## 🌐 Domain Configuration (Optional but Recommended)

### In Dokploy
- [ ] Go to Application → Domains
- [ ] Add domain: `api.yourdomain.com` (or your preferred subdomain)
- [ ] Enable SSL/HTTPS (Let's Encrypt)
- [ ] Save and wait for DNS propagation

### DNS Configuration
Add these DNS records at your domain provider:

```
Type: A or CNAME
Name: api (or your subdomain)
Value: [Your Dokploy server IP or hostname]
TTL: 300
```

---

## 💳 Razorpay Webhook Setup

### 1. Create Webhook
- [ ] Go to: https://dashboard.razorpay.com/app/webhooks
- [ ] Click "Add New Webhook"
- [ ] URL: `https://your-domain.com/webhooks/razorpay`
- [ ] Generate secret
- [ ] Select Events:
  - [ ] payment.authorized
  - [ ] payment.captured
  - [ ] payment.failed
  - [ ] refund.created
  - [ ] All payment-related events

### 2. Update Environment Variables
- [ ] Copy webhook secret
- [ ] Add to Dokploy: `RAZORPAY_WEBHOOK_SECRET`
- [ ] Redeploy application

---

## 🚀 Deploy Application

### First Deployment
- [ ] Click **"Deploy"** in Dokploy
- [ ] Monitor build logs
- [ ] Wait for build to complete (~5-10 minutes)
- [ ] Check deployment status: "Running"

### Verify Deployment
```bash
# Health check
curl https://your-domain.com/health
# Expected: {"status":"ok"}

# Admin panel
# Open in browser: https://your-domain.com/app

# Store API
curl https://your-domain.com/store/products
```

---

## 🔄 Enable Auto-Deploy

### Configure Git Auto-Deploy
- [ ] Go to Application → Git Settings
- [ ] Enable **"Auto Deploy"**
- [ ] Branch: `main`
- [ ] Save

### Test Auto-Deploy
```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "Test auto-deploy"
git push origin main

# Watch Dokploy - should auto-deploy!
```

---

## 📊 Post-Deployment

### Access Admin Dashboard
- [ ] Navigate to: `https://your-domain.com/app`
- [ ] Create first admin user
- [ ] Login with credentials
- [ ] Verify dashboard loads

### Configure Store (in Admin)
- [ ] Add regions and currencies
- [ ] Configure shipping options
- [ ] Set up tax rates
- [ ] Add products

### Test Razorpay Integration
- [ ] Create test order in storefront
- [ ] Process payment with Razorpay
- [ ] Verify payment captured
- [ ] Check webhook received

### Optional: Seed Data
```bash
# Connect to Dokploy terminal/shell
# Run:
npm run seed
```

---

## 🏥 Health & Monitoring

### Setup Monitoring
- [ ] Check Dokploy built-in monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure alerts for downtime

### Regular Checks
```bash
# Health endpoint
curl https://your-domain.com/health

# Check logs in Dokploy
# Application → Logs → View real-time logs

# Database connection
# Should see in logs: "Successfully connected to database"
```

---

## 🔒 Security Checklist

### Verify Security
- [ ] HTTPS/SSL enabled and working
- [ ] Strong passwords for database
- [ ] JWT_SECRET and COOKIE_SECRET are random and secure
- [ ] CORS properly configured (not using *)
- [ ] Razorpay LIVE keys (not test keys)
- [ ] Webhook secret configured
- [ ] No `.env` files committed to Git

### Review Access
- [ ] Database accessible only from Dokploy network
- [ ] Redis accessible only from Dokploy network
- [ ] Admin panel requires authentication
- [ ] API rate limiting (consider adding)

---

## 📚 Resources & Documentation

- [x] **Setup Complete**: [DEPLOYMENT_READY.md](DEPLOYMENT_READY.md)
- [x] **Quick Start**: [DOKPLOY_QUICKSTART.md](DOKPLOY_QUICKSTART.md)
- [x] **Full Guide**: [DOKPLOY_DEPLOYMENT.md](DOKPLOY_DEPLOYMENT.md)
- [x] **Env Variables**: [.env.production.example](.env.production.example)

### External Documentation
- **Medusa v2**: https://docs.medusajs.com
- **Dokploy**: https://dokploy.com/docs
- **Razorpay**: https://razorpay.com/docs

---

## 🐛 Troubleshooting

### Build Fails
- [ ] Check build logs in Dokploy
- [ ] Verify Node.js version compatibility (>=20)
- [ ] Ensure all dependencies in package.json

### App Won't Start
- [ ] Verify DATABASE_URL is correct
- [ ] Check Redis is running and accessible
- [ ] Review application logs
- [ ] Verify all environment variables are set

### Can't Access Admin
- [ ] Check ADMIN_CORS includes your domain
- [ ] Verify admin built successfully (check logs)
- [ ] Clear browser cache
- [ ] Try incognito/private window

### Payment Issues
- [ ] Using LIVE Razorpay keys (not test)
- [ ] Webhook URL is publicly accessible
- [ ] Webhook secret matches
- [ ] Check Razorpay dashboard logs

---

## ✅ Deployment Complete!

When all items are checked:

🎉 **Your Medusa v2 store is live and ready for business!**

### Next Steps
1. Configure your products and collections
2. Set up shipping and tax rules
3. Test complete checkout flow
4. Connect your storefront
5. Monitor performance and errors

---

**Need Help?**
- Review documentation in this repository
- Check Medusa Discord: https://discord.gg/medusajs
- Dokploy Support: https://dokploy.com/docs
