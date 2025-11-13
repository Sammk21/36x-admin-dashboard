# Checkout Step 4: Choose Payment Provider

In this guide, you'll learn how to implement the last step of the checkout flow, where the customer chooses the payment provider and performs any necessary actions. This is typically the fourth step of the checkout flow, but you can change the steps of the checkout flow as you see fit.

## Payment Step Flow in Storefront Checkout

The payment step requires implementing the following flow:

![Storefront payment checkout flow diagram illustrating the complete payment process: retrieving available payment providers, customer selection of payment method, payment collection creation, session initialization, and showing the necessary UI to complete the payment](https://res.cloudinary.com/dza7lstvk/image/upload/v1718029777/Medusa%20Resources/storefront-payment_dxry7l.jpg)

1. Retrieve the payment providers using the [List Payment Providers API route](https://docs.medusajs.com/api/store#payment-providers_getpaymentproviders).
2. Customer chooses the payment provider to use.
3. If the cart doesn't have an associated payment collection, create a payment collection for it using the [Create Payment Collection API route](https://docs.medusajs.com/api/store#payment-collections_postpaymentcollections).
4. Initialize the payment sessions of the cart's payment collection using the [Initialize Payment Sessions API route](https://docs.medusajs.com/api/store#payment-collections_postpaymentcollectionsidpaymentsessions).
   - If you're using the JS SDK, it combines the third and fourth steps in a single `initiatePaymentSession` function.
5. Optionally perform additional actions for payment based on the chosen payment provider. For example, if the customer chooses Stripe, you show them the UI to enter their card details.
   - You can refer to the [Stripe guide](https://docs.medusajs.com/storefront-development/checkout/payment/stripe) for an example of how to implement this.

***

## How to Implement the Payment Step Flow

For example, to implement the payment step flow:

- This example uses the `useCart` hook defined in the [Cart React Context guide](https://docs.medusajs.com/storefront-development/cart/context).
- Learn how to install and configure the JS SDK in the [JS SDK documentation](https://docs.medusajs.com/js-sdk).

### React

```tsx highlights={highlights}
"use client" // include with Next.js 13+

import { useCallback, useEffect, useState } from "react"
import { useCart } from "@/providers/cart"
import { HttpTypes } from "@medusajs/types"
import { sdk } from "@/lib/sdk"

export default function CheckoutPaymentStep() {
  const { cart, setCart } = useCart()
  const [paymentProviders, setPaymentProviders] = useState<
    HttpTypes.StorePaymentProvider[]
  >([])
  const [
    selectedPaymentProvider, 
    setSelectedPaymentProvider,
  ] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!cart) {
      return
    }

    sdk.store.payment.listPaymentProviders({
      region_id: cart.region_id || "",
    })
    .then(({ payment_providers }) => {
      setPaymentProviders(payment_providers)
      setSelectedPaymentProvider(
        cart.payment_collection?.payment_sessions?.[0]?.id
      )
    })
  }, [cart])

  const handleSelectProvider = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault()
    if (!cart || !selectedPaymentProvider) {
      return
    }

    setLoading(true)

    await sdk.store.payment.initiatePaymentSession(cart, {
      provider_id: selectedPaymentProvider,
    })

    // re-fetch cart
    const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id)

    setCart(updatedCart)
    setLoading(false)
  }

  const getPaymentUi = useCallback(() => {
    const activePaymentSession = cart?.payment_collection?.payment_sessions?.[0]
    if (!activePaymentSession) {
      return
    }

    switch(true) {
      case activePaymentSession.provider_id.startsWith("pp_stripe_"):
        return (
          <span>
            You chose stripe!
            {/* TODO add stripe UI */}
          </span>
        )
      case activePaymentSession.provider_id
        .startsWith("pp_system_default"):
        return (
          <span>
            You chose manual payment! No additional actions required.
          </span>
        )
      default:
        return (
          <span>
            You chose {activePaymentSession.provider_id} which is 
            in development.
          </span>
        )
    }
  } , [cart])

  return (
    <div>
      <form>
        <select 
          value={selectedPaymentProvider}
          onChange={(e) => setSelectedPaymentProvider(e.target.value)}
        >
          {paymentProviders.map((provider) => (
            <option
              key={provider.id}
              value={provider.id}
            >
              {provider.id}
            </option>
          ))}
        </select>
        <button
          disabled={loading} 
          onClick={async (e) => {
            await handleSelectProvider(e)
          }}
        >
          Submit
        </button>
      </form>
      {getPaymentUi()}
    </div>
  )
}
```

### JS SDK

```ts highlights={fetchHighlights}
// assuming the cart is previously fetched
const cart = {
  id: "cart_123",
  region_id: "reg_123",
  // cart object...
}

const retrievePaymentProviders = async () => {
  const { payment_providers } = await sdk.store.payment.listPaymentProviders({
    region_id: cart.region_id || "",
  })

  return payment_providers
}

const selectPaymentProvider = async (
  selectedPaymentProviderId: string
) => {
  await sdk.store.payment.initiatePaymentSession(cart, {
    provider_id: selectedPaymentProviderId,
  })

  // re-fetch cart
  const { 
    cart: updatedCart,
  } = await sdk.store.cart.retrieve(cart.id)

  return updatedCart
}

const getPaymentUi = () => {
  const activePaymentSession = cart?.payment_collection?.
    payment_sessions?.[0]
  if (!activePaymentSession) {
    return
  }

  switch(true) {
    case activePaymentSession.provider_id.startsWith("pp_stripe_"):
      // TODO handle Stripe UI
      return "You chose stripe!"
    case activePaymentSession.provider_id
      .startsWith("pp_system_default"):
      return "You chose manual payment! No additional actions required."
    default:
      return `You chose ${
        activePaymentSession.provider_id
      } which is in development.`
  }
}

const handlePayment = () => {
  retrievePaymentProviders()

  // ... customer chooses payment provider
  // const providerId = ...

  selectPaymentProvider(providerId)

  getPaymentUi()
}
```

In the example above, you:

- Retrieve the payment providers from the Medusa application using the [List Payment Providers API route](https://docs.medusajs.com/api/store#payment-providers_getpaymentproviders). You use those to show the customer the available options.
- When the customer chooses a payment provider, you use the `initiatePaymentSession` function to create a payment collection and initialize the payment session for the chosen provider.
  - If you're not using the JS SDK, you need to create a payment collection using the [Create Payment Collection API route](https://docs.medusajs.com/api/store#payment-collections_postpaymentcollections) if the cart doesn't have one. Then, you need to initialize the payment session using the [Initialize Payment Session API route](https://docs.medusajs.com/api/store#payment-collections_postpaymentcollectionsidpaymentsessions).
- Once the cart has a payment session, you optionally render the UI to perform additional actions. For example, if the customer chose Stripe, you can show them the card form to enter their credit card.

In the `Fetch API` example, the `handlePayment` function implements this flow by calling the different functions in the correct order.

***

## Troubleshooting

### Unknown Error for Zero Cart Total

If your cart has a total of `0`, you might encounter an `unknown error` when trying to create a payment session.

Some payment providers, such as Stripe, require a non-zero amount to create a payment session. So, if your cart has a total of `0`, the error will be thrown on the payment provider's side.

In those cases, you can either:

- Make sure the payment session is only initialized when the cart has a total greater than `0`.
- Use payment providers like the Manual System Payment Provider, which doesn't create a payment session with a third-party provider.
  - The Manual System Payment Provider is available by default in Medusa and can be used to handle payments without a third-party provider. It allows you to mark the order as paid without requiring any additional actions from the customer.
  - Make sure to configure the Manual System Payment Provider in your store's region. Learn more in the [Manage Region](https://docs.medusajs.com/user-guide/settings/regions#edit-region-details) user guide.

***

## Stripe Example

If you're integrating Stripe in your Medusa application and storefront, refer to the [Stripe guide](https://docs.medusajs.com/storefront-development/checkout/payment/stripe) for an example of how to handle the payment process using Stripe.