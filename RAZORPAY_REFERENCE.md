# Razorpay Integration - Quick Reference

## Environment Variables

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

## File Locations

| Purpose | File Path |
|---------|-----------|
| Payment Service | [src/modules/razorpay/service.ts](src/modules/razorpay/service.ts) |
| Type Definitions | [src/modules/razorpay/types.ts](src/modules/razorpay/types.ts) |
| Utilities | [src/modules/razorpay/utils.ts](src/modules/razorpay/utils.ts) |
| Webhook Endpoint | [src/api/webhooks/razorpay/route.ts](src/api/webhooks/razorpay/route.ts) |
| Configuration | [medusa-config.ts](medusa-config.ts) |

## API Methods

### Payment Lifecycle

```typescript
// 1. Create order
initiatePayment(input) → Returns order data with key_id

// 2. Authorize payment (after customer pays)
authorizePayment(sessionData, context) → Verifies signature

// 3. Capture payment
capturePayment(sessionData) → Captures the payment

// 4. Refund (if needed)
refundPayment(sessionData, amount) → Creates refund
```

### Utility Functions

```typescript
import { verifyPaymentSignature } from './utils'

// Verify payment
verifyPaymentSignature(orderId, paymentId, signature, secret)

// Verify webhook
verifyWebhookSignature(body, signature, secret)
```

## Frontend Integration

### 1. Load Razorpay Script

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2. Payment Handler

```javascript
const options = {
  key: paymentSession.data.key_id,
  amount: paymentSession.data.amount,
  currency: paymentSession.data.currency,
  order_id: paymentSession.data.id,
  name: "Your Store",
  handler: function(response) {
    // Send to backend
    authorizePayment({
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
    })
  }
}

new Razorpay(options).open()
```

## Webhook Configuration

### URL Format
```
https://your-domain.com/webhooks/razorpay
```

### Required Events
- `payment.authorized`
- `payment.captured`
- `payment.failed`

## Test Credentials

### Card Payment
```
Card: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25
Name: Test User
```

### UPI
```
Success: success@razorpay
Failure: failure@razorpay
```

### Net Banking
Use any test bank from Razorpay checkout

## Status Mapping

| Razorpay Status | Medusa Status |
|-----------------|---------------|
| `captured` | `AUTHORIZED` |
| `authorized` | `AUTHORIZED` |
| `failed` | `ERROR` |
| `refunded` | `CANCELED` |
| Other | `PENDING` |

## Common Commands

```bash
# Install
npm install razorpay --legacy-peer-deps

# Build
npm run build

# Start
npm run dev

# Check logs
# (Razorpay operations are logged to console)
```

## Error Codes

| Code | Meaning |
|------|---------|
| `payment_initiation_failed` | Failed to create order |
| `invalid_signature` | Signature verification failed |
| `payment_not_authorized` | Payment not in correct status |
| `authorization_failed` | Error during authorization |
| `capture_failed` | Error capturing payment |
| `refund_failed` | Error processing refund |

## Data Structure

### Payment Session Data
```typescript
{
  id: string              // Razorpay order ID
  amount: number          // Amount in smallest unit
  currency: string        // Currency code
  status: string          // Order status
  key_id: string          // For frontend
  payment_id?: string     // After authorization
  payment_status?: string // Payment status
}
```

### Webhook Payload
```typescript
{
  entity: "event",
  event: "payment.captured",
  payload: {
    payment: {
      entity: { /* payment object */ }
    }
  }
}
```

## Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| Provider not showing | Enable in Admin → Settings → Regions |
| Invalid credentials | Check `.env` file |
| Signature fails | Verify all 3 values passed correctly |
| Webhook not working | Check URL accessibility & secret |

## Important Links

- **Razorpay Dashboard**: https://dashboard.razorpay.com/
- **API Keys**: https://dashboard.razorpay.com/app/keys
- **Webhooks**: https://dashboard.razorpay.com/app/webhooks
- **Razorpay Docs**: https://razorpay.com/docs/
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/

## Support Contacts

- **Razorpay Support**: support@razorpay.com
- **Documentation**: [RAZORPAY_INTEGRATION.md](./RAZORPAY_INTEGRATION.md)
- **Quick Start**: [RAZORPAY_QUICKSTART.md](./RAZORPAY_QUICKSTART.md)

---

**Keep this handy for quick reference!**
