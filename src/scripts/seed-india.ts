import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  updateStoresStep,
  createShippingOptionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/workflows-sdk"

// Workflow to update store currencies
const updateStoreCurrencies = createWorkflow(
  "update-store-currencies-india",
  (input: {
    store_id: string
    supported_currencies: Array<{ currency_code: string; is_default?: boolean }>
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map((currency) => {
            return {
              currency_code: currency.currency_code,
              is_default: currency.is_default ?? false,
            }
          }),
        },
      }
    })

    const stores = updateStoresStep(normalizedInput)

    return new WorkflowResponse(stores)
  }
)

export default async function seedIndiaData({ container }: { container: any }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)

  const country = "in"

  logger.info("Seeding India store data...")
  const [store] = await storeModuleService.listStores()

  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!defaultSalesChannel.length) {
    // Create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    })
    defaultSalesChannel = salesChannelResult
  }

  // Update store to support INR
  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "inr",
          is_default: true,
        },
      ],
    },
  })

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  })

  logger.info("Created India Region")

  // Create India region
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "India",
          currency_code: "inr",
          countries: [country],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })
  const region = regionResult[0]
  logger.info("Finished seeding India region.")

  logger.info("Seeding India tax regions with GST structure...")
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: country,
        provider_id: "tp_system",
      },
    ],
  })
  logger.info("Finished seeding tax regions.")

  logger.info("Seeding stock locations for India warehouses...")

  // Create Mumbai Warehouse
  const { result: mumbaiWarehouseResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Mumbai Warehouse",
          address: {
            city: "Mumbai",
            country_code: "IN",
            province: "Maharashtra",
            address_1: "Andheri East",
          },
        },
      ],
    },
  })
  const mumbaiWarehouse = mumbaiWarehouseResult[0]

  // Create Delhi Warehouse
  const { result: delhiWarehouseResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Delhi Warehouse",
          address: {
            city: "New Delhi",
            country_code: "IN",
            province: "Delhi",
            address_1: "Connaught Place",
          },
        },
      ],
    },
  })
  const delhiWarehouse = delhiWarehouseResult[0]

  // Create Bangalore Warehouse
  const { result: bangaloreWarehouseResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Bangalore Warehouse",
          address: {
            city: "Bangalore",
            country_code: "IN",
            province: "Karnataka",
            address_1: "Whitefield",
          },
        },
      ],
    },
  })
  const bangaloreWarehouse = bangaloreWarehouseResult[0]

  // Set Mumbai as default location
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: mumbaiWarehouse.id,
      },
    },
  })

  // Link all warehouses to fulfillment provider
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: mumbaiWarehouse.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: delhiWarehouse.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: bangaloreWarehouse.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  })

  logger.info("Finished seeding India stock locations.")

  logger.info("Seeding fulfillment data for India...")
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null

  if (!shippingProfile) {
    const { result: shippingProfileResult } = await createShippingProfilesWorkflow(
      container
    ).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    })
    shippingProfile = shippingProfileResult[0]
  }

  // Create fulfillment set for Mumbai Warehouse
  const mumbaiFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Mumbai Warehouse Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "India",
        geo_zones: [
          {
            country_code: "in",
            type: "country",
          },
        ],
      },
    ],
  })

  // Link Mumbai fulfillment set
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: mumbaiWarehouse.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: mumbaiFulfillmentSet.id,
    },
  })

  // Create fulfillment set for Delhi Warehouse
  const delhiFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Delhi Warehouse Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "India",
        geo_zones: [
          {
            country_code: "in",
            type: "country",
          },
        ],
      },
    ],
  })

  // Link Delhi fulfillment set
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: delhiWarehouse.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: delhiFulfillmentSet.id,
    },
  })

  // Create fulfillment set for Bangalore Warehouse
  const bangaloreFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Bangalore Warehouse Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "India",
        geo_zones: [
          {
            country_code: "in",
            type: "country",
          },
        ],
      },
    ],
  })

  // Link Bangalore fulfillment set
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: bangaloreWarehouse.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: bangaloreFulfillmentSet.id,
    },
  })

  // Create shipping options for India
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: mumbaiFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 3-5 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "inr",
            amount: 79,
          },
          {
            region_id: region.id,
            amount: 79,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: mumbaiFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 1-2 days.",
          code: "express",
        },
        prices: [
          {
            currency_code: "inr",
            amount: 149,
          },
          {
            region_id: region.id,
            amount: 149,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Free Shipping (Above ₹999)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: mumbaiFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Free",
          description: "Free shipping on orders above ₹999.",
          code: "free",
        },
        prices: [
          {
            currency_code: "inr",
            amount: 0,
          },
          {
            region_id: region.id,
            amount: 0,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  })
  logger.info("Finished seeding India fulfillment data.")

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: mumbaiWarehouse.id,
      add: [defaultSalesChannel[0].id],
    },
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: delhiWarehouse.id,
      add: [defaultSalesChannel[0].id],
    },
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: bangaloreWarehouse.id,
      add: [defaultSalesChannel[0].id],
    },
  })

  logger.info("Finished linking stock locations to sales channels.")

  logger.info("Seeding publishable API key data...")
  const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
    container
  ).run({
    input: {
      api_keys: [
        {
          title: "India Webshop",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  })
  const publishableApiKey = publishableApiKeyResult[0]

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  })
  logger.info("Finished seeding publishable API key data.")

  logger.info("Seeding product categories...")
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Clothing",
          is_active: true,
          description: "Trendy clothing for everyone",
        },
        {
          name: "Men",
          parent_category_id: null, // Will be updated after we get the Clothing ID
          is_active: true,
          description: "Men's fashion",
        },
        {
          name: "Women",
          parent_category_id: null, // Will be updated
          is_active: true,
          description: "Women's fashion",
        },
        {
          name: "Kids",
          parent_category_id: null, // Will be updated
          is_active: true,
          description: "Kids fashion",
        },
        {
          name: "Electronics",
          is_active: true,
          description: "Latest electronic gadgets",
        },
        {
          name: "Home & Kitchen",
          is_active: true,
          description: "Home essentials and kitchen items",
        },
        {
          name: "Beauty",
          is_active: true,
          description: "Beauty and personal care products",
        },
        {
          name: "Sports",
          is_active: true,
          description: "Sports equipment and accessories",
        },
        {
          name: "Toys",
          is_active: true,
          description: "Fun toys for children",
        },
      ],
    },
  })

  logger.info("Finished seeding product categories.")

  logger.info("Seeding India products...")
  const { result: productsResult } = await createProductsWorkflow(container).run({
    input: {
      products: [
        // Product 1: Men's Cotton T-Shirt
        {
          title: "Men's Premium Cotton T-Shirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Clothing")!.id,
          ],
          description:
            "Comfortable and breathable premium cotton t-shirt. Perfect for Indian summers. Made with 100% cotton fabric.",
          handle: "mens-premium-cotton-tshirt",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/1a73e8/ffffff?text=Men%27s+T-Shirt+Blue",
            },
            {
              url: "https://via.placeholder.com/800x800/34a853/ffffff?text=Men%27s+T-Shirt+Green",
            },
            {
              url: "https://via.placeholder.com/800x800/ea4335/ffffff?text=Men%27s+T-Shirt+Red",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Blue", "Green", "Red"],
            },
          ],
          variants: [
            {
              title: "S / Blue",
              sku: "IND-MTSH-S-BLUE",
              options: {
                Size: "S",
                Color: "Blue",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "M / Blue",
              sku: "IND-MTSH-M-BLUE",
              options: {
                Size: "M",
                Color: "Blue",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "L / Blue",
              sku: "IND-MTSH-L-BLUE",
              options: {
                Size: "L",
                Color: "Blue",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "XL / Blue",
              sku: "IND-MTSH-XL-BLUE",
              options: {
                Size: "XL",
                Color: "Blue",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "S / Green",
              sku: "IND-MTSH-S-GREEN",
              options: {
                Size: "S",
                Color: "Green",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "M / Green",
              sku: "IND-MTSH-M-GREEN",
              options: {
                Size: "M",
                Color: "Green",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "L / Green",
              sku: "IND-MTSH-L-GREEN",
              options: {
                Size: "L",
                Color: "Green",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "XL / Green",
              sku: "IND-MTSH-XL-GREEN",
              options: {
                Size: "XL",
                Color: "Green",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "S / Red",
              sku: "IND-MTSH-S-RED",
              options: {
                Size: "S",
                Color: "Red",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "M / Red",
              sku: "IND-MTSH-M-RED",
              options: {
                Size: "M",
                Color: "Red",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "L / Red",
              sku: "IND-MTSH-L-RED",
              options: {
                Size: "L",
                Color: "Red",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "XL / Red",
              sku: "IND-MTSH-XL-RED",
              options: {
                Size: "XL",
                Color: "Red",
              },
              prices: [
                {
                  amount: 499,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 2: Women's Kurta
        {
          title: "Women's Designer Kurta",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Clothing")!.id,
          ],
          description:
            "Elegant and stylish designer kurta perfect for casual and festive occasions. Made with premium fabric with beautiful prints.",
          handle: "womens-designer-kurta",
          weight: 300,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/fbbc04/ffffff?text=Women%27s+Kurta+Yellow",
            },
            {
              url: "https://via.placeholder.com/800x800/e91e63/ffffff?text=Women%27s+Kurta+Pink",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Yellow", "Pink"],
            },
          ],
          variants: [
            {
              title: "S / Yellow",
              sku: "IND-WKUR-S-YELLOW",
              options: {
                Size: "S",
                Color: "Yellow",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "M / Yellow",
              sku: "IND-WKUR-M-YELLOW",
              options: {
                Size: "M",
                Color: "Yellow",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "L / Yellow",
              sku: "IND-WKUR-L-YELLOW",
              options: {
                Size: "L",
                Color: "Yellow",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "XL / Yellow",
              sku: "IND-WKUR-XL-YELLOW",
              options: {
                Size: "XL",
                Color: "Yellow",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "S / Pink",
              sku: "IND-WKUR-S-PINK",
              options: {
                Size: "S",
                Color: "Pink",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "M / Pink",
              sku: "IND-WKUR-M-PINK",
              options: {
                Size: "M",
                Color: "Pink",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "L / Pink",
              sku: "IND-WKUR-L-PINK",
              options: {
                Size: "L",
                Color: "Pink",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "XL / Pink",
              sku: "IND-WKUR-XL-PINK",
              options: {
                Size: "XL",
                Color: "Pink",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 3: Kids Cotton Shorts
        {
          title: "Kids Comfortable Cotton Shorts",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Clothing")!.id,
          ],
          description:
            "Soft and comfortable cotton shorts for kids. Perfect for playtime and casual wear. Available in vibrant colors.",
          handle: "kids-cotton-shorts",
          weight: 150,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/9c27b0/ffffff?text=Kids+Shorts+Purple",
            },
            {
              url: "https://via.placeholder.com/800x800/ff5722/ffffff?text=Kids+Shorts+Orange",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Purple", "Orange"],
            },
          ],
          variants: [
            {
              title: "S / Purple",
              sku: "IND-KSHORT-S-PURPLE",
              options: {
                Size: "S",
                Color: "Purple",
              },
              prices: [
                {
                  amount: 399,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "M / Purple",
              sku: "IND-KSHORT-M-PURPLE",
              options: {
                Size: "M",
                Color: "Purple",
              },
              prices: [
                {
                  amount: 399,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "L / Purple",
              sku: "IND-KSHORT-L-PURPLE",
              options: {
                Size: "L",
                Color: "Purple",
              },
              prices: [
                {
                  amount: 399,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "XL / Purple",
              sku: "IND-KSHORT-XL-PURPLE",
              options: {
                Size: "XL",
                Color: "Purple",
              },
              prices: [
                {
                  amount: 399,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "S / Orange",
              sku: "IND-KSHORT-S-ORANGE",
              options: {
                Size: "S",
                Color: "Orange",
              },
              prices: [
                {
                  amount: 399,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "M / Orange",
              sku: "IND-KSHORT-M-ORANGE",
              options: {
                Size: "M",
                Color: "Orange",
              },
              prices: [
                {
                  amount: 399,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "L / Orange",
              sku: "IND-KSHORT-L-ORANGE",
              options: {
                Size: "L",
                Color: "Orange",
              },
              prices: [
                {
                  amount: 399,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "XL / Orange",
              sku: "IND-KSHORT-XL-ORANGE",
              options: {
                Size: "XL",
                Color: "Orange",
              },
              prices: [
                {
                  amount: 399,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 4: Wireless Earbuds
        {
          title: "Premium Wireless Earbuds",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Electronics")!.id,
          ],
          description:
            "High-quality wireless earbuds with noise cancellation. 24-hour battery life. Perfect for music lovers. IPX4 water resistant.",
          handle: "premium-wireless-earbuds",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/000000/ffffff?text=Earbuds+Black",
            },
            {
              url: "https://via.placeholder.com/800x800/ffffff/000000?text=Earbuds+White",
            },
          ],
          options: [
            {
              title: "Color",
              values: ["Black", "White"],
            },
          ],
          variants: [
            {
              title: "Black",
              sku: "IND-EARBUD-BLACK",
              options: {
                Color: "Black",
              },
              prices: [
                {
                  amount: 2999,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "White",
              sku: "IND-EARBUD-WHITE",
              options: {
                Color: "White",
              },
              prices: [
                {
                  amount: 2999,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 5: Smart Watch
        {
          title: "Fitness Smart Watch",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Electronics")!.id,
          ],
          description:
            "Advanced fitness tracking smartwatch. Heart rate monitor, sleep tracker, 100+ sports modes. 7-day battery life.",
          handle: "fitness-smart-watch",
          weight: 150,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/607d8b/ffffff?text=Smart+Watch+Grey",
            },
            {
              url: "https://via.placeholder.com/800x800/000000/ffffff?text=Smart+Watch+Black",
            },
          ],
          options: [
            {
              title: "Color",
              values: ["Grey", "Black"],
            },
          ],
          variants: [
            {
              title: "Grey",
              sku: "IND-WATCH-GREY",
              options: {
                Color: "Grey",
              },
              prices: [
                {
                  amount: 4999,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "Black",
              sku: "IND-WATCH-BLACK",
              options: {
                Color: "Black",
              },
              prices: [
                {
                  amount: 4999,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 6: Stainless Steel Cookware Set
        {
          title: "Premium Stainless Steel Cookware Set (5 Pieces)",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Home & Kitchen")!.id,
          ],
          description:
            "High-quality stainless steel cookware set. Includes kadhai, tawa, pressure cooker, and 2 pans. Induction compatible.",
          handle: "stainless-steel-cookware-set",
          weight: 3000,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/9e9e9e/ffffff?text=Cookware+Set",
            },
          ],
          options: [
            {
              title: "Set",
              values: ["5 Pieces"],
            },
          ],
          variants: [
            {
              title: "5 Pieces",
              sku: "IND-COOK-5PC",
              options: {
                Set: "5 Pieces",
              },
              prices: [
                {
                  amount: 3499,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 7: Facial Serum
        {
          title: "Vitamin C Brightening Facial Serum",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Beauty")!.id,
          ],
          description:
            "Powerful vitamin C serum for skin brightening. Reduces dark spots and pigmentation. Suitable for all skin types. 30ml bottle.",
          handle: "vitamin-c-facial-serum",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/ff9800/ffffff?text=Vitamin+C+Serum",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["30ml"],
            },
          ],
          variants: [
            {
              title: "30ml",
              sku: "IND-SERUM-30ML",
              options: {
                Size: "30ml",
              },
              prices: [
                {
                  amount: 899,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 8: Yoga Mat
        {
          title: "Anti-Slip Yoga Mat with Carrying Bag",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Sports")!.id,
          ],
          description:
            "Premium quality yoga mat with anti-slip surface. 6mm thickness for extra cushioning. Comes with free carrying bag. Eco-friendly material.",
          handle: "anti-slip-yoga-mat",
          weight: 1200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/4caf50/ffffff?text=Yoga+Mat+Green",
            },
            {
              url: "https://via.placeholder.com/800x800/2196f3/ffffff?text=Yoga+Mat+Blue",
            },
          ],
          options: [
            {
              title: "Color",
              values: ["Green", "Blue"],
            },
          ],
          variants: [
            {
              title: "Green",
              sku: "IND-YOGA-GREEN",
              options: {
                Color: "Green",
              },
              prices: [
                {
                  amount: 799,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "Blue",
              sku: "IND-YOGA-BLUE",
              options: {
                Color: "Blue",
              },
              prices: [
                {
                  amount: 799,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 9: Cricket Bat
        {
          title: "Professional Kashmir Willow Cricket Bat",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Sports")!.id,
          ],
          description:
            "High-quality Kashmir willow cricket bat. Perfect for professional and semi-professional players. Full size adult bat with excellent balance.",
          handle: "kashmir-willow-cricket-bat",
          weight: 1100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/8d6e63/ffffff?text=Cricket+Bat",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["Full Size"],
            },
          ],
          variants: [
            {
              title: "Full Size",
              sku: "IND-CRICKET-FULL",
              options: {
                Size: "Full Size",
              },
              prices: [
                {
                  amount: 2499,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 10: Building Blocks Toy Set
        {
          title: "Educational Building Blocks Set (200 Pieces)",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Toys")!.id,
          ],
          description:
            "Creative building blocks set for kids. 200 colorful pieces to build anything. Develops creativity and motor skills. Non-toxic plastic. Age 3+.",
          handle: "educational-building-blocks",
          weight: 800,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/f44336/ffffff?text=Building+Blocks",
            },
          ],
          options: [
            {
              title: "Set",
              values: ["200 Pieces"],
            },
          ],
          variants: [
            {
              title: "200 Pieces",
              sku: "IND-BLOCKS-200",
              options: {
                Set: "200 Pieces",
              },
              prices: [
                {
                  amount: 999,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 11: Remote Control Car
        {
          title: "High-Speed Remote Control Racing Car",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Toys")!.id,
          ],
          description:
            "Fast and durable RC car with 2.4GHz remote control. Can reach speeds up to 20km/h. Rechargeable battery included. Perfect gift for kids.",
          handle: "remote-control-racing-car",
          weight: 600,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/f44336/ffffff?text=RC+Car+Red",
            },
            {
              url: "https://via.placeholder.com/800x800/2196f3/ffffff?text=RC+Car+Blue",
            },
          ],
          options: [
            {
              title: "Color",
              values: ["Red", "Blue"],
            },
          ],
          variants: [
            {
              title: "Red",
              sku: "IND-RC-RED",
              options: {
                Color: "Red",
              },
              prices: [
                {
                  amount: 1499,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "Blue",
              sku: "IND-RC-BLUE",
              options: {
                Color: "Blue",
              },
              prices: [
                {
                  amount: 1499,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },

        // Product 12: Premium Backpack
        {
          title: "Water-Resistant Laptop Backpack",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Electronics")!.id,
          ],
          description:
            "Spacious and durable laptop backpack with water-resistant material. Multiple compartments. Fits laptops up to 15.6 inches. USB charging port included.",
          handle: "water-resistant-laptop-backpack",
          weight: 700,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://via.placeholder.com/800x800/000000/ffffff?text=Backpack+Black",
            },
            {
              url: "https://via.placeholder.com/800x800/607d8b/ffffff?text=Backpack+Grey",
            },
          ],
          options: [
            {
              title: "Color",
              values: ["Black", "Grey"],
            },
          ],
          variants: [
            {
              title: "Black",
              sku: "IND-BACKPACK-BLACK",
              options: {
                Color: "Black",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
            {
              title: "Grey",
              sku: "IND-BACKPACK-GREY",
              options: {
                Color: "Grey",
              },
              prices: [
                {
                  amount: 1299,
                  currency_code: "inr",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  })
  logger.info("Finished seeding India products.")

  logger.info("Seeding inventory levels for all products...")
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })

  const inventoryLevels: Array<{
    location_id: string
    stocked_quantity: number
    inventory_item_id: string
  }> = []

  // Distribute inventory across all three warehouses
  const warehouses = [mumbaiWarehouse, delhiWarehouse, bangaloreWarehouse]

  for (const inventoryItem of inventoryItems) {
    for (const warehouse of warehouses) {
      const inventoryLevel = {
        location_id: warehouse.id,
        stocked_quantity: 500, // 500 items per warehouse
        inventory_item_id: inventoryItem.id,
      }
      inventoryLevels.push(inventoryLevel)
    }
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  })
  logger.info("Finished seeding inventory levels for India warehouses.")

  logger.info("✅ India seed data completed successfully!")
  logger.info("Summary:")
  logger.info("- Region: India (INR)")
  logger.info("- Warehouses: Mumbai, Delhi, Bangalore")
  logger.info("- Shipping Options: Standard (₹79), Express (₹149), Free (₹999+)")
  logger.info("- Categories: 9 categories created")
  logger.info("- Products: 12 products with variants")
  logger.info("- Inventory: Distributed across 3 warehouses")
}
