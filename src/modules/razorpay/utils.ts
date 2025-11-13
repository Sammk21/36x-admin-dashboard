import crypto from "crypto"

/**
 * Utility functions for Razorpay payment verification
 */

/**
 * Verify Razorpay payment signature
 *
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Signature from Razorpay response
 * @param secret - Razorpay key secret
 * @returns true if signature is valid, false otherwise
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const body = orderId + "|" + paymentId
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  return expectedSignature === signature
}

/**
 * Verify Razorpay webhook signature
 *
 * @param body - Raw webhook request body (as string)
 * @param signature - x-razorpay-signature header value
 * @param secret - Webhook secret from Razorpay dashboard
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  return expectedSignature === signature
}

/**
 * Verify Razorpay subscription signature
 *
 * @param subscriptionId - Razorpay subscription ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Signature from Razorpay response
 * @param secret - Razorpay key secret
 * @returns true if signature is valid, false otherwise
 */
export function verifySubscriptionSignature(
  subscriptionId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const body = subscriptionId + "|" + paymentId
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  return expectedSignature === signature
}

/**
 * Verify Razorpay payment link signature
 *
 * @param paymentLinkId - Payment link ID
 * @param paymentId - Razorpay payment ID
 * @param paymentLinkReferenceId - Payment link reference ID
 * @param paymentLinkStatus - Payment link status
 * @param signature - Signature from Razorpay response
 * @param secret - Razorpay key secret
 * @returns true if signature is valid, false otherwise
 */
export function verifyPaymentLinkSignature(
  paymentLinkId: string,
  paymentId: string,
  paymentLinkReferenceId: string,
  paymentLinkStatus: string,
  signature: string,
  secret: string
): boolean {
  const body = `${paymentLinkId}|${paymentId}|${paymentLinkReferenceId}|${paymentLinkStatus}`
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  return expectedSignature === signature
}

/**
 * Convert amount from currency to smallest unit (paise for INR)
 *
 * @param amount - Amount in currency (e.g., 100.50)
 * @param currency - Currency code (default: INR)
 * @returns Amount in smallest unit (e.g., 10050 paise)
 */
export function convertToSmallestUnit(
  amount: number,
  currency: string = "INR"
): number {
  // Most currencies use 2 decimal places
  // Some exceptions: JPY, KRW use 0 decimal places
  const zeroDecimalCurrencies = ["JPY", "KRW"]

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount)
  }

  return Math.round(amount * 100)
}

/**
 * Convert amount from smallest unit to currency
 *
 * @param amount - Amount in smallest unit (e.g., 10050 paise)
 * @param currency - Currency code (default: INR)
 * @returns Amount in currency (e.g., 100.50)
 */
export function convertFromSmallestUnit(
  amount: number,
  currency: string = "INR"
): number {
  const zeroDecimalCurrencies = ["JPY", "KRW"]

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount
  }

  return amount / 100
}

/**
 * Format Razorpay error message
 *
 * @param error - Error object from Razorpay
 * @returns Formatted error message
 */
export function formatRazorpayError(error: any): string {
  if (error?.error) {
    const { description, code, source, step, reason } = error.error
    return `${description || 'Payment failed'} (${code || 'UNKNOWN_ERROR'})`
  }

  return error?.message || "An unknown error occurred"
}

/**
 * Get Razorpay checkout options for frontend
 *
 * @param params - Checkout parameters
 * @returns Razorpay checkout options object
 */
export function getRazorpayCheckoutOptions(params: {
  keyId: string
  amount: number
  currency: string
  orderId: string
  name: string
  description?: string
  image?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
  handler: (response: {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }) => void
}) {
  return {
    key: params.keyId,
    amount: params.amount,
    currency: params.currency,
    name: params.name,
    description: params.description,
    image: params.image,
    order_id: params.orderId,
    handler: params.handler,
    prefill: params.prefill,
    theme: params.theme || { color: "#3399cc" },
    modal: {
      ondismiss: function() {
        console.log("Checkout form closed")
      }
    }
  }
}
