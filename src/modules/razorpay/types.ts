export interface RazorpayOptions {
  key_id: string
  key_secret: string
  webhook_secret?: string
}

export interface RazorpayOrder {
  id: string
  entity: "order"
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  offer_id: string | null
  status: "created" | "attempted" | "paid"
  attempts: number
  notes: Record<string, unknown>
  created_at: number
}

export interface RazorpayPayment {
  id: string
  entity: "payment"
  amount: number
  currency: string
  status: "created" | "authorized" | "captured" | "refunded" | "failed"
  order_id: string
  invoice_id: string | null
  international: boolean
  method: "card" | "netbanking" | "wallet" | "emi" | "upi" | "cardless_emi" | "paylater"
  amount_refunded: number
  refund_status: string | null
  captured: boolean
  description: string
  card_id: string | null
  bank: string | null
  wallet: string | null
  vpa: string | null
  email: string
  contact: string
  customer_id: string | null
  token_id: string | null
  notes: Record<string, unknown>
  fee: number
  tax: number
  error_code: string | null
  error_description: string | null
  error_source: string | null
  error_step: string | null
  error_reason: string | null
  acquirer_data: Record<string, unknown>
  created_at: number
}

export interface RazorpayRefund {
  id: string
  entity: "refund"
  amount: number
  currency: string
  payment_id: string
  notes: Record<string, unknown>
  receipt: string | null
  acquirer_data: {
    arn: string | null
  }
  created_at: number
  batch_id: string | null
  status: "pending" | "processed" | "failed"
  speed_processed: "normal" | "instant" | "optimum"
  speed_requested: "normal" | "instant" | "optimum"
}

export interface RazorpayCustomer {
  id: string
  entity: "customer"
  name: string
  email: string
  contact: string
  gstin: string | null
  notes: Record<string, unknown>
  created_at: number
}

export interface RazorpayWebhookEvent {
  entity: "event"
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment?: {
      entity: RazorpayPayment
    }
    order?: {
      entity: RazorpayOrder
    }
    refund?: {
      entity: RazorpayRefund
    }
  }
  created_at: number
}

export interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  image?: string
  order_id: string
  handler?: (response: RazorpayCheckoutResponse) => void
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, unknown>
  theme?: {
    color?: string
  }
  modal?: {
    ondismiss?: () => void
  }
}

export interface RazorpayCheckoutResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}
