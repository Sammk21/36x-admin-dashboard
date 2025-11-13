# Razorpay Payment Gateway Integration for Medusa

This document provides comprehensive information about the Razorpay payment gateway integration for your Medusa backend.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Testing](#testing)
- [Storefront Integration](#storefront-integration)
- [Webhook Setup](#webhook-setup)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## Overview

This integration seamlessly connects Razorpay's payment processing capabilities with Medusa's Payment Module architecture. It follows Medusa's Payment Provider pattern and implements all required payment lifecycle methods.

## Features

- ✅ **Payment Initiation**: Create Razorpay orders for cart checkout
- ✅ **Payment Authorization**: Verify and authorize payments with signature validation
- ✅ **Payment Capture**: Capture authorized payments
- ✅ **Refunds**: Full and partial refund support with optimum speed
- ✅ **Webhook Support**: Real-time payment status updates via webhooks
- ✅ **Signature Verification**: Secure payment and webhook signature validation
- ✅ **Multiple Payment Methods**: Support for cards, UPI, wallets, net banking, etc.
- ✅ **TypeScript Support**: Full type definitions for Razorpay entities

## Installation

The Razorpay SDK has already been installed. If you need to reinstall:

```bash
npm install razorpay --legacy-peer-deps
```

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Getting your credentials:**
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to Settings → API Keys
3. Generate keys for Test Mode (development) or Live Mode (production)

### 2. Medusa Configuration

The payment provider is configured in `medusa-config.ts`:

```typescript
modules: [
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "./src/modules/razorpay",
          id: "razorpay",
          options: {
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
            webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET,
          }
        }
      ]
    }
  }
]
```

### 3. Enable Payment Provider in Admin

1. Start your Medusa backend: `npm run dev`
2. Access Medusa Admin (default: http://localhost:9000)
3. Navigate to Settings → Regions
4. Select your region (e.g., "India")
5. Add "Razorpay" as a payment provider
6. Save changes

## Architecture

### File Structure

```
src/
├── modules/
│   └── razorpay/
│       ├── index.ts          # Module provider definition
│       ├── service.ts         # Payment provider service
│       └── types.ts           # TypeScript type definitions
└── api/
    └── webhooks/
        └── razorpay/
            └── route.ts       # Webhook endpoint
```

### Payment Flow

```
1. Checkout Initiation
   ↓
2. initiatePayment() → Creates Razorpay Order
   ↓
3. Frontend: Display Razorpay Checkout
   ↓
4. Customer completes payment
   ↓
5. authorizePayment() → Verifies signature & authorizes
   ↓
6. capturePayment() → Captures the payment
   ↓
7. Order confirmed
```

### Key Methods Implemented

| Method | Purpose | Razorpay API |
|--------|---------|--------------|
| `initiatePayment` | Create order | `orders.create()` |
| `authorizePayment` | Verify & authorize | `payments.fetch()` + signature verification |
| `capturePayment` | Capture payment | `payments.capture()` |
| `refundPayment` | Process refund | `payments.refund()` |
| `cancelPayment` | Cancel payment | N/A (auto-expires) |
| `retrievePayment` | Get payment details | `payments.fetch()` |
| `getPaymentStatus` | Check status | `payments.fetch()` |
| `getWebhookActionAndData` | Process webhooks | Signature verification |

## Testing

### Test Mode

Razorpay provides test credentials for development:

1. Use Test Mode API keys from your dashboard
2. Use [test card numbers](https://razorpay.com/docs/payments/payments/test-card-details/)
3. Test UPI: `success@razorpay`, `failure@razorpay`

### Test Cards

```
Success: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
```

### Webhook Testing

Use [ngrok](https://ngrok.com/) or similar to expose localhost:

```bash
ngrok http 9000
```

Then use the ngrok URL for webhook configuration.

## Storefront Integration

### Next.js Example

```typescript
import { useEffect } from 'react'

declare global {
  interface Window {
    Razorpay: any
  }
}

function CheckoutButton({ cart, paymentSession }) {
  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const handlePayment = async () => {
    const options = {
      key: paymentSession.data.key_id,
      amount: paymentSession.data.amount,
      currency: paymentSession.data.currency,
      name: "Your Store Name",
      description: "Order Payment",
      order_id: paymentSession.data.id,
      handler: async function (response) {
        // Send to Medusa backend to authorize payment
        await fetch('/store/carts/{cart_id}/payment-session/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider_id: 'razorpay',
            data: {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }
          })
        })

        // Complete the cart
        await completeCart(cart.id)
      },
      prefill: {
        name: cart.billing_address?.first_name,
        email: cart.email,
        contact: cart.billing_address?.phone,
      },
      theme: {
        color: "#3399cc"
      }
    }

    const razorpay = new window.Razorpay(options)
    razorpay.open()
  }

  return <button onClick={handlePayment}>Pay with Razorpay</button>
}
```

### React Example (Storefront)

```typescript
// components/RazorpayPayment.tsx
import { useState } from 'react'

export function RazorpayPayment({ paymentSession, onSuccess }) {
  const [loading, setLoading] = useState(false)

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const displayRazorpay = async () => {
    setLoading(true)
    const res = await loadRazorpay()

    if (!res) {
      alert('Razorpay SDK failed to load')
      setLoading(false)
      return
    }

    const options = {
      key: paymentSession.data.key_id,
      amount: paymentSession.data.amount,
      currency: paymentSession.data.currency,
      name: 'Your Store',
      order_id: paymentSession.data.id,
      handler: function (response) {
        onSuccess({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        })
      },
      modal: {
        ondismiss: () => setLoading(false)
      }
    }

    const paymentObject = new window.Razorpay(options)
    paymentObject.open()
  }

  return (
    <button onClick={displayRazorpay} disabled={loading}>
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  )
}
```

## Webhook Setup

### 1. Configure Webhook in Razorpay Dashboard

1. Go to [Razorpay Webhooks](https://dashboard.razorpay.com/app/webhooks)
2. Click "Create Webhook"
3. Set URL: `https://your-domain.com/webhooks/razorpay`
4. Select events:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
5. Set secret and save
6. Add the secret to your `.env` as `RAZORPAY_WEBHOOK_SECRET`

### 2. Supported Webhook Events

| Event | Action |
|-------|--------|
| `payment.authorized` | Updates payment to authorized status |
| `payment.captured` | Updates payment to captured status |
| `payment.failed` | Marks payment as failed |
| Other events | Logged but not processed |

## API Reference

### Payment Session Data Structure

```typescript
{
  id: string              // Razorpay order ID
  amount: number          // Amount in smallest currency unit
  currency: string        // Currency code (e.g., "INR")
  status: string          // Order status
  receipt: string         // Receipt identifier
  key_id: string          // Razorpay key for frontend
  payment_id?: string     // Payment ID (after authorization)
  payment_status?: string // Payment status
  payment_method?: string // Payment method used
  captured?: boolean      // Whether payment is captured
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `payment_initiation_failed` | Failed to create Razorpay order |
| `invalid_signature` | Payment signature verification failed |
| `payment_not_authorized` | Payment status is not authorized |
| `authorization_failed` | Error during authorization |
| `capture_failed` | Error capturing payment |
| `refund_failed` | Error processing refund |

## Troubleshooting

### Common Issues

#### 1. Payment Initiation Fails

**Error**: "Razorpay key_id is required"

**Solution**: Ensure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in `.env`

#### 2. Signature Verification Fails

**Error**: "Invalid payment signature"

**Solution**:
- Ensure you're passing all three values from Razorpay response
- Verify `RAZORPAY_KEY_SECRET` matches the one used for key generation
- Check that signature is not modified during transmission

#### 3. Webhooks Not Working

**Solution**:
- Verify webhook URL is accessible from internet
- Check webhook secret in `.env` matches Razorpay dashboard
- Examine webhook logs in Razorpay dashboard
- Check server logs for webhook processing errors

#### 4. Payment Provider Not Showing

**Solution**:
- Rebuild the backend: `npm run build`
- Clear cache and restart: `npm run dev`
- Verify provider is enabled in region settings (Admin)

### Debug Mode

Enable detailed logging:

```typescript
// In service.ts, the logger is already configured
// Check your console/logs for detailed Razorpay operation info
```

### Testing Checklist

- [ ] Environment variables configured
- [ ] Payment provider enabled in region
- [ ] Test payment successful
- [ ] Signature verification working
- [ ] Capture working
- [ ] Refund working
- [ ] Webhooks configured and tested
- [ ] Error handling tested

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Node.js SDK](https://github.com/razorpay/razorpay-node)
- [Medusa Payment Module](https://docs.medusajs.com/resources/commerce-modules/payment)
- [Razorpay Dashboard](https://dashboard.razorpay.com/)

## Support

For issues specific to:
- **Medusa Integration**: Check Medusa logs and payment module documentation
- **Razorpay API**: Contact Razorpay support or check their documentation
- **This Implementation**: Review code in `src/modules/razorpay/`

## License

This integration follows your project's license terms.
