# Razorpay Integration - Quick Start Guide

## Prerequisites

- Razorpay account ([Sign up here](https://dashboard.razorpay.com/signup))
- Medusa backend running
- Node.js 20+

## Setup (5 minutes)

### Step 1: Get Razorpay Credentials

1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Click **Generate Test Key** (for development)
4. Copy both `Key Id` and `Key Secret`

### Step 2: Configure Environment

Edit your `.env` file:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
RAZORPAY_WEBHOOK_SECRET=optional_for_now
```

### Step 3: Rebuild and Restart

```bash
npm run build
npm run dev
```

### Step 4: Enable in Admin

1. Open Medusa Admin: http://localhost:9000
2. Navigate to **Settings** → **Regions**
3. Select your region (e.g., "India" or "Default")
4. Click **Edit**
5. Scroll to **Payment Providers**
6. Check ✅ **Razorpay**
7. Click **Save**

### Step 5: Test Payment

Use these test credentials:

**Card Number**: `4111 1111 1111 1111`
**CVV**: `123`
**Expiry**: Any future date
**Name**: Any name

**UPI**: `success@razorpay` (for success) or `failure@razorpay` (for failure)

## Frontend Integration

### Minimum Required Code

```html
<!-- Add Razorpay script to your HTML -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

```javascript
// In your payment button handler
const handlePayment = () => {
  const options = {
    key: paymentSession.data.key_id,
    amount: paymentSession.data.amount,
    currency: paymentSession.data.currency,
    order_id: paymentSession.data.id,
    name: "Your Store Name",
    handler: async function(response) {
      // Authorize payment in Medusa
      await authorizePayment({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      })

      // Complete cart
      await completeCart()
    }
  }

  const razorpay = new Razorpay(options)
  razorpay.open()
}
```

## Webhook Setup (Optional but Recommended)

### For Production

1. Go to [Razorpay Webhooks](https://dashboard.razorpay.com/app/webhooks)
2. Click **Create Webhook**
3. URL: `https://your-domain.com/webhooks/razorpay`
4. Active Events:
   - ✅ payment.authorized
   - ✅ payment.captured
   - ✅ payment.failed
5. Generate Secret
6. Add to `.env`: `RAZORPAY_WEBHOOK_SECRET=whsec_...`

### For Development (using ngrok)

```bash
# Terminal 1: Start Medusa
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 9000

# Use ngrok URL in webhook: https://xxxx.ngrok.io/webhooks/razorpay
```

## Verification

### ✅ Checklist

- [ ] Razorpay credentials in `.env`
- [ ] Backend rebuilt and running
- [ ] Payment provider enabled in region
- [ ] Frontend can load Razorpay checkout
- [ ] Test payment completes successfully
- [ ] Order created after payment

## Common Issues

### "Payment provider not found"

**Solution**: Enable Razorpay in region settings (Admin)

### "Invalid key_id"

**Solution**: Check `.env` file, ensure no extra spaces in credentials

### Checkout not opening

**Solution**: Verify Razorpay script is loaded in frontend

### Payment succeeds but order not created

**Solution**: Check authorization step in payment handler

## Next Steps

- Read full documentation: [RAZORPAY_INTEGRATION.md](./RAZORPAY_INTEGRATION.md)
- Set up webhooks for production
- Customize checkout UI
- Test refund flows
- Switch to Live keys for production

## Support

- **Integration Issues**: Check [RAZORPAY_INTEGRATION.md](./RAZORPAY_INTEGRATION.md) troubleshooting section
- **Razorpay API**: [Razorpay Docs](https://razorpay.com/docs/)
- **Medusa**: [Medusa Discord](https://discord.gg/medusajs)

## Production Checklist

Before going live:

- [ ] Generate Live API keys from Razorpay
- [ ] Update `.env` with Live keys
- [ ] Configure webhooks with production URL
- [ ] Test end-to-end payment flow
- [ ] Test refund flow
- [ ] Set up error monitoring
- [ ] Enable 3D Secure
- [ ] Review Razorpay fees and settlement schedule

---

**Quick Start Complete!** 🎉

You're now ready to accept payments via Razorpay.
