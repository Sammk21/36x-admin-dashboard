import { AbstractPaymentProvider, MedusaError, BigNumber } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import {
  PaymentSessionStatus,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/types"
import Razorpay from "razorpay"
import crypto from "crypto"

type RazorpayOptions = {
  key_id: string
  key_secret: string
  webhook_secret?: string
}

type InjectedDependencies = {
  logger: Logger
}

interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
  attempts: number
  notes: Record<string, unknown>
  created_at: number
}

interface RazorpayPayment {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  order_id: string
  invoice_id: string | null
  international: boolean
  method: string
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

class RazorpayProviderService extends AbstractPaymentProvider<RazorpayOptions> {
  static identifier = "razorpay"

  protected logger_: Logger
  protected options_: RazorpayOptions
  protected razorpayClient_: Razorpay

  constructor(
    container: InjectedDependencies,
    options: RazorpayOptions
  ) {
    super(container, options)

    this.logger_ = container.logger
    this.options_ = options

    // Initialize Razorpay client
    this.razorpayClient_ = new Razorpay({
      key_id: options.key_id,
      key_secret: options.key_secret,
    })
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.key_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay key_id is required in the provider's options."
      )
    }

    if (!options.key_secret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay key_secret is required in the provider's options."
      )
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const {
      amount,
      currency_code,
      context,
    } = input

    try {
      // Convert amount from cents/paise to the smallest currency unit
      const amountInSmallestUnit = Math.round(Number(amount))

      // Create order in Razorpay
      const order = await this.razorpayClient_.orders.create({
        amount: amountInSmallestUnit,
        currency: currency_code.toUpperCase(),
        receipt: `receipt_${Date.now()}`,
        notes: {},
      }) as RazorpayOrder

      this.logger_.info(`Razorpay order created: ${order.id}`)

      return {
        id: order.id,
        status: "pending" as PaymentSessionStatus,
        data: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          receipt: order.receipt,
          created_at: order.created_at,
          key_id: this.options_.key_id, // Pass key_id to frontend for Razorpay Checkout
        },
      }
    } catch (error) {
      this.logger_.error(`Error initiating Razorpay payment: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to initiate Razorpay payment: ${error.message}`
      )
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const {
      amount,
      currency_code,
      data,
    } = input

    try {
      // Razorpay doesn't support updating orders after creation
      // We need to create a new order if amount changes
      if (data?.amount !== Math.round(Number(amount))) {
        return this.initiatePayment(input)
      }

      // Return existing order data
      return {
        status: "pending" as PaymentSessionStatus,
        data: data,
      }
    } catch (error) {
      this.logger_.error(`Error updating Razorpay payment: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to update Razorpay payment: ${error.message}`
      )
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    // Razorpay orders cannot be deleted, they expire automatically after 15 minutes
    // We just return the data as is
    return {
      data: input.data,
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    try {
      const { data, context } = input
      const orderId = data?.id as string
      const paymentId = (context as any)?.razorpay_payment_id as string
      const signature = (context as any)?.razorpay_signature as string

      // Verify payment signature
      const isValidSignature = this.verifyPaymentSignature(
        orderId,
        paymentId,
        signature
      )

      if (!isValidSignature) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Invalid payment signature"
        )
      }

      // Fetch payment details from Razorpay
      const payment = await this.razorpayClient_.payments.fetch(paymentId) as RazorpayPayment

      if (payment.status === "authorized" || payment.status === "captured") {
        return {
          status: "authorized" as PaymentSessionStatus,
          data: {
            ...data,
            payment_id: payment.id,
            payment_status: payment.status,
            payment_method: payment.method,
            captured: payment.captured,
          },
        }
      }

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Payment not authorized. Status: ${payment.status}`
      )
    } catch (error) {
      this.logger_.error(`Error authorizing Razorpay payment: ${error.message}`)
      throw error
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    try {
      const { data } = input
      const paymentId = data?.payment_id as string
      const amount = data?.amount as number
      const currency = data?.currency as string

      if (!paymentId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Payment ID not found in session data"
        )
      }

      // Capture the payment
      const capturedPayment = await this.razorpayClient_.payments.capture(
        paymentId,
        amount,
        currency
      ) as RazorpayPayment

      this.logger_.info(`Razorpay payment captured: ${capturedPayment.id}`)

      return {
        data: {
          ...data,
          payment_id: capturedPayment.id,
          payment_status: capturedPayment.status,
          captured: capturedPayment.captured,
          captured_at: Date.now(),
        },
      }
    } catch (error) {
      this.logger_.error(`Error capturing Razorpay payment: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to capture Razorpay payment: ${error.message}`
      )
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    try {
      const { data, amount: refundAmount } = input
      const paymentId = data?.payment_id as string

      if (!paymentId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Payment ID not found in session data"
        )
      }

      // Create refund
      const refund = await this.razorpayClient_.payments.refund(paymentId, {
        amount: Math.round(Number(refundAmount)),
        speed: "optimum",
      })

      this.logger_.info(`Razorpay refund created: ${refund.id}`)

      return {
        data: {
          ...data,
          refund_id: refund.id,
          refund_status: refund.status,
          refunded_amount: refund.amount,
          refunded_at: Date.now(),
        },
      }
    } catch (error) {
      this.logger_.error(`Error refunding Razorpay payment: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to refund Razorpay payment: ${error.message}`
      )
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    // Razorpay doesn't have a specific cancel operation
    // Unpaid orders automatically expire after 15 minutes
    return {
      data: {
        ...input.data,
        cancelled_at: Date.now(),
      },
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    try {
      const { data } = input
      const paymentId = data?.payment_id as string

      if (!paymentId) {
        // If no payment ID, try to fetch order
        const orderId = data?.id as string
        const order = await this.razorpayClient_.orders.fetch(orderId) as RazorpayOrder
        return {
          data: {
            ...data,
            order_status: order.status,
          },
        }
      }

      const payment = await this.razorpayClient_.payments.fetch(paymentId) as RazorpayPayment

      return {
        data: {
          ...data,
          payment_id: payment.id,
          payment_status: payment.status,
          payment_method: payment.method,
          captured: payment.captured,
        },
      }
    } catch (error) {
      this.logger_.error(`Error retrieving Razorpay payment: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to retrieve Razorpay payment: ${error.message}`
      )
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    try {
      const { data } = input
      const paymentId = data?.payment_id as string

      if (!paymentId) {
        return {
          status: "pending" as PaymentSessionStatus,
          data: {},
        }
      }

      const payment = await this.razorpayClient_.payments.fetch(paymentId) as RazorpayPayment

      let status: PaymentSessionStatus
      switch (payment.status) {
        case "captured":
          status = "authorized"
          break
        case "authorized":
          status = "authorized"
          break
        case "failed":
          status = "error"
          break
        case "refunded":
          status = "canceled"
          break
        default:
          status = "pending"
      }

      return {
        status,
        data: {},
      }
    } catch (error) {
      this.logger_.error(`Error getting Razorpay payment status: ${error.message}`)
      return {
        status: "error" as PaymentSessionStatus,
        data: {},
      }
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload

    try {
      // Verify webhook signature if secret is configured
      if (this.options_.webhook_secret) {
        const signature = headers["x-razorpay-signature"] as string
        const isValid = this.verifyWebhookSignature(
          rawData as string,
          signature
        )

        if (!isValid) {
          return {
            action: "not_supported",
          }
        }
      }

      const event = (data as any).event as string
      const paymentEntity = (data as any).payload?.payment?.entity as RazorpayPayment

      switch (event) {
        case "payment.authorized":
          return {
            action: "authorized",
            data: {
              session_id: paymentEntity.order_id,
              amount: new BigNumber(paymentEntity.amount),
            },
          }

        case "payment.captured":
          return {
            action: "captured",
            data: {
              session_id: paymentEntity.order_id,
              amount: new BigNumber(paymentEntity.amount),
            },
          }

        case "payment.failed":
          return {
            action: "failed",
            data: {
              session_id: paymentEntity.order_id,
              amount: new BigNumber(paymentEntity.amount),
            },
          }

        default:
          return {
            action: "not_supported",
          }
      }
    } catch (error) {
      this.logger_.error(`Error processing Razorpay webhook: ${error.message}`)
      return {
        action: "failed",
      }
    }
  }

  /**
   * Verify payment signature to ensure payment authenticity
   */
  private verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    const body = orderId + "|" + paymentId
    const expectedSignature = crypto
      .createHmac("sha256", this.options_.key_secret)
      .update(body)
      .digest("hex")

    return expectedSignature === signature
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(
    body: string,
    signature: string
  ): boolean {
    if (!this.options_.webhook_secret) {
      return true
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.options_.webhook_secret)
      .update(body)
      .digest("hex")

    return expectedSignature === signature
  }
}

export default RazorpayProviderService
