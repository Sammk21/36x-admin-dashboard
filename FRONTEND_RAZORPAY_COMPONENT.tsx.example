// RazorpayPaymentUI.tsx
// Add this component to your frontend (storefront)

"use client" // include with Next.js 13+

import { useEffect, useState } from "react"
import { sdk } from "@/lib/sdk" // Your Medusa JS SDK instance

interface RazorpayPaymentUIProps {
  paymentSession: any // The active payment session from cart
  cart: any // Your cart object
  onSuccess?: () => void // Optional callback after successful payment
}

// Extend Window to include Razorpay
declare global {
  interface Window {
    Razorpay: any
  }
}

export function RazorpayPaymentUI({
  paymentSession,
  cart,
  onSuccess
}: RazorpayPaymentUIProps) {
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Load Razorpay checkout script
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        // Check if already loaded
        if (window.Razorpay) {
          resolve(true)
          return
        }

        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
      })
    }

    loadRazorpayScript().then((loaded) => {
      setScriptLoaded(!!loaded)
    })
  }, [])

  const handlePayment = async () => {
    if (!scriptLoaded || !window.Razorpay) {
      alert('Payment system is loading. Please try again.')
      return
    }

    setLoading(true)

    try {
      const paymentData = paymentSession.data

      const options = {
        key: paymentData.key_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: "Your Store Name", // TODO: Replace with your store name
        description: `Order for Cart ${cart.id}`,
        order_id: paymentData.id,
        handler: async function (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) {
          try {
            // Step 1: Authorize the payment in Medusa
            await sdk.store.payment.updateSession(
              cart.payment_collection.id,
              paymentSession.id,
              {
                data: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }
              }
            )

            // Step 2: Complete the cart to create the order
            const { order } = await sdk.store.cart.complete(cart.id)

            // Success! Redirect or show success message
            if (onSuccess) {
              onSuccess()
            } else {
              // Default: redirect to order confirmation
              window.location.href = `/order/confirmed/${order.id}`
            }
          } catch (error) {
            console.error('Error completing payment:', error)
            alert('Payment verification failed. Please contact support.')
          } finally {
            setLoading(false)
          }
        },
        prefill: {
          name: cart.billing_address?.first_name
            ? `${cart.billing_address.first_name} ${cart.billing_address.last_name || ''}`
            : '',
          email: cart.email || '',
          contact: cart.billing_address?.phone || '',
        },
        notes: {
          cart_id: cart.id,
        },
        theme: {
          color: "#3399cc" // TODO: Customize with your brand color
        },
        modal: {
          ondismiss: function() {
            setLoading(false)
            console.log('Checkout form closed by user')
          }
        }
      }

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.open()
    } catch (error) {
      console.error('Error opening Razorpay checkout:', error)
      alert('Failed to open payment checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="razorpay-payment-container">
      <div className="payment-info">
        <h3>Payment via Razorpay</h3>
        <p>You will be redirected to Razorpay's secure payment gateway</p>
        <p className="amount">
          Amount: {paymentSession.data.currency} {(paymentSession.data.amount / 100).toFixed(2)}
        </p>
      </div>

      <button
        onClick={handlePayment}
        disabled={loading || !scriptLoaded}
        className="razorpay-pay-button"
      >
        {loading ? 'Processing...' : scriptLoaded ? 'Pay Now' : 'Loading...'}
      </button>

      <div className="payment-methods">
        <small>Accepted: Cards, UPI, Net Banking, Wallets</small>
      </div>

      <style jsx>{`
        .razorpay-payment-container {
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-top: 20px;
        }

        .payment-info h3 {
          margin-top: 0;
          color: #333;
        }

        .payment-info p {
          color: #666;
          margin: 8px 0;
        }

        .payment-info .amount {
          font-size: 1.2em;
          font-weight: bold;
          color: #000;
        }

        .razorpay-pay-button {
          width: 100%;
          padding: 12px 24px;
          background-color: #3399cc;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 16px;
        }

        .razorpay-pay-button:hover:not(:disabled) {
          background-color: #2980b9;
        }

        .razorpay-pay-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .payment-methods {
          margin-top: 12px;
          text-align: center;
        }

        .payment-methods small {
          color: #888;
        }
      `}</style>
    </div>
  )
}

// Alternative: Simpler version without styles
export function RazorpayPaymentUISimple({
  paymentSession,
  cart,
  onSuccess
}: RazorpayPaymentUIProps) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const openRazorpay = async () => {
    setLoading(true)

    const options = {
      key: paymentSession.data.key_id,
      amount: paymentSession.data.amount,
      currency: paymentSession.data.currency,
      order_id: paymentSession.data.id,
      name: "Your Store",
      handler: async (response: any) => {
        await sdk.store.payment.updateSession(
          cart.payment_collection.id,
          paymentSession.id,
          { data: response }
        )
        const { order } = await sdk.store.cart.complete(cart.id)
        onSuccess?.() || (window.location.href = `/order/${order.id}`)
      },
      modal: { ondismiss: () => setLoading(false) }
    }

    new window.Razorpay(options).open()
  }

  return (
    <button onClick={openRazorpay} disabled={loading}>
      {loading ? 'Processing...' : 'Pay with Razorpay'}
    </button>
  )
}
