# India Seed Script for Medusa v2

This document provides instructions for using the India-ready seed script for your Medusa v2 e-commerce store.

## Overview

The `seed-india.ts` script creates a complete India-ready e-commerce setup with:

- **Region**: India (INR currency)
- **Warehouses**: 3 locations (Mumbai, Delhi, Bangalore)
- **Shipping Options**: Standard (₹79), Express (₹149), Free Shipping (₹999+)
- **Categories**: 9 hierarchical categories
- **Products**: 12 products with variants
- **Inventory**: Distributed across all 3 warehouses

## File Location

```
src/scripts/seed-india.ts
```

## Prerequisites

1. Medusa v2 installed and configured
2. Database connection established
3. Node.js >= 20

## How to Run

### Option 1: Direct Execution (Recommended)

```bash
medusa exec ./src/scripts/seed-india.ts
```

### Option 2: Using npm script

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "seed:india": "medusa exec ./src/scripts/seed-india.ts"
  }
}
```

Then run:

```bash
yarn seed:india
# or
npm run seed:india
```

## What Gets Seeded

### 1. Store Configuration
- Default sales channel
- INR as primary currency
- India region setup

### 2. Warehouses (Stock Locations)
- **Mumbai Warehouse** (Maharashtra)
- **Delhi Warehouse** (Delhi)
- **Bangalore Warehouse** (Karnataka)

### 3. Shipping Options
| Option | Price | Delivery Time | Code |
|--------|-------|---------------|------|
| Standard Shipping | ₹79 | 3-5 days | `standard` |
| Express Shipping | ₹149 | 1-2 days | `express` |
| Free Shipping | ₹0 | Orders above ₹999 | `free` |

### 4. Product Categories
1. **Clothing** (with subcategories)
   - Men
   - Women
   - Kids
2. **Electronics**
3. **Home & Kitchen**
4. **Beauty**
5. **Sports**
6. **Toys**

### 5. Products (12 Total)

#### Clothing Category
1. **Men's Premium Cotton T-Shirt** - ₹499
   - Variants: S, M, L, XL × Blue, Green, Red
   - SKU: IND-MTSH-*

2. **Women's Designer Kurta** - ₹1,299
   - Variants: S, M, L, XL × Yellow, Pink
   - SKU: IND-WKUR-*

3. **Kids Comfortable Cotton Shorts** - ₹399
   - Variants: S, M, L, XL × Purple, Orange
   - SKU: IND-KSHORT-*

#### Electronics Category
4. **Premium Wireless Earbuds** - ₹2,999
   - Variants: Black, White
   - SKU: IND-EARBUD-*

5. **Fitness Smart Watch** - ₹4,999
   - Variants: Grey, Black
   - SKU: IND-WATCH-*

6. **Water-Resistant Laptop Backpack** - ₹1,299
   - Variants: Black, Grey
   - SKU: IND-BACKPACK-*

#### Home & Kitchen Category
7. **Premium Stainless Steel Cookware Set** - ₹3,499
   - 5-piece set
   - SKU: IND-COOK-5PC

#### Beauty Category
8. **Vitamin C Brightening Facial Serum** - ₹899
   - 30ml bottle
   - SKU: IND-SERUM-30ML

#### Sports Category
9. **Anti-Slip Yoga Mat with Carrying Bag** - ₹799
   - Variants: Green, Blue
   - SKU: IND-YOGA-*

10. **Professional Kashmir Willow Cricket Bat** - ₹2,499
    - Full size
    - SKU: IND-CRICKET-FULL

#### Toys Category
11. **Educational Building Blocks Set** - ₹999
    - 200 pieces
    - SKU: IND-BLOCKS-200

12. **High-Speed Remote Control Racing Car** - ₹1,499
    - Variants: Red, Blue
    - SKU: IND-RC-*

### 6. Inventory Distribution
- **500 units** per product variant per warehouse
- Total: 1,500 units per variant across all 3 locations

### 7. Tax Structure
- Tax provider: `tp_system`
- Ready for GST implementation:
  - Clothing: 5% (configurable)
  - Accessories: 12% (configurable)
  - Electronics: 18% (configurable)

## SKU Pattern

All products follow the pattern: `IND-{CATEGORY}-{VARIANT}`

Examples:
- `IND-MTSH-M-BLUE` (Men's T-Shirt, Medium, Blue)
- `IND-EARBUD-BLACK` (Earbuds, Black)
- `IND-YOGA-GREEN` (Yoga Mat, Green)

## Customization

### Adding More Products

Edit `seed-india.ts` and add products to the `products` array in the `createProductsWorkflow` call:

```typescript
{
  title: "Your Product Name",
  category_ids: [categoryResult.find((cat) => cat.name === "Category")!.id],
  description: "Product description",
  handle: "product-handle",
  status: ProductStatus.PUBLISHED,
  // ... more fields
}
```

### Modifying Shipping Prices

Find the `createShippingOptionsWorkflow` section and update the `amount` values:

```typescript
prices: [
  {
    currency_code: "inr",
    amount: 79, // Change this value (in paise)
  },
]
```

### Changing Inventory Quantities

Locate this section:

```typescript
const inventoryLevel = {
  location_id: warehouse.id,
  stocked_quantity: 500, // Modify this number
  inventory_item_id: inventoryItem.id,
}
```

### Adding More Warehouses

Add warehouse creation code after the Bangalore warehouse section:

```typescript
const { result: newWarehouseResult } = await createStockLocationsWorkflow(
  container
).run({
  input: {
    locations: [
      {
        name: "Your Warehouse Name",
        address: {
          city: "City Name",
          country_code: "IN",
          province: "State Name",
          address_1: "Area",
        },
      },
    ],
  },
})
```

## Troubleshooting

### Error: "Database connection failed"
- Ensure your database is running
- Check your `.env` file for correct database credentials

### Error: "Module not found"
- Run `yarn install` or `npm install` to install dependencies
- Make sure you're using Medusa v2

### Products not showing in admin
- Check if products are published: `status: ProductStatus.PUBLISHED`
- Verify products are linked to sales channels
- Clear cache and refresh admin panel

### Inventory not updating
- Ensure warehouses are linked to fulfillment sets
- Check that inventory items are created for all variants

## Clearing Previous Data

Before running the seed script, you may want to clear existing data:

```bash
# Reset database (caution: this deletes all data)
medusa db:reset

# Run migrations
medusa db:migrate

# Then run seed
medusa exec ./src/scripts/seed-india.ts
```

## Next Steps

After seeding:

1. **Configure Tax Rates**: Set up GST rates in Medusa admin
2. **Add Product Images**: Replace placeholder images with real product photos
3. **Configure Payment**: Set up payment providers (Razorpay, etc.)
4. **Test Checkout**: Place test orders to verify shipping and pricing
5. **Customize Categories**: Add category images and descriptions

## API Testing

Test your seeded data:

```bash
# List all products
curl http://localhost:9000/store/products

# List India region
curl http://localhost:9000/store/regions

# List shipping options
curl http://localhost:9000/store/shipping-options
```

## Support

For issues or questions:
- Medusa Documentation: https://docs.medusajs.com/v2
- Medusa Discord: https://discord.gg/medusajs

## Notes

- All prices are in INR (Indian Rupees)
- Images are placeholders - replace with actual product images
- Tax rates need to be configured manually in admin panel
- Free shipping rule (₹999+) may need additional configuration
- Product descriptions are generic - customize them for your store

## License

MIT License - Feel free to modify and use for your projects.
