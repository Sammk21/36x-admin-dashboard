// src/subscribers/strapi-sync/product.subscriber.ts

import {
  type SubscriberConfig,
  type SubscriberArgs,
} from "@medusajs/framework";

import { deleteByMedusaId, syncProductById } from "./lib/strapi.utils";

export default async function productSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<any>) {
  const logger = container.resolve("logger");

  try {
    // ── Deleted ───────────────────────────────────────────────────────────────
    if (name === "product.deleted") {
      await deleteByMedusaId("products", data.id);
      logger.info(`[strapi-sync] Product deleted: ${data.id}`);
      return;
    }

    // ── Created / Updated / Category changed ──────────────────────────────────
    if (
      name === "product.created" ||
      name === "product.updated" ||
      name === "product.category_changed"
    ) {
      const result = await syncProductById(data.id, container);
      logger.info(
        `[strapi-sync] Product ${result.created ? "created" : "updated"}: "${result.title}" ` +
          `(${result.categoryCount} categories, collection: ${result.collectionStrapiMedusaId ?? "none"})`,
      );
      return;
    }

    // ── Collection membership changed ─────────────────────────────────────────
    // data shape: { id: string (collection medusa_id), product_ids: string[] }
    if (
      name === "product-collection.products_added" ||
      name === "product-collection.products_removed"
    ) {
      const productIds: string[] = data.product_ids ?? [];
      await Promise.all(
        productIds.map(async (productId) => {
          const result = await syncProductById(productId, container);
          logger.info(
            `[strapi-sync] Product re-synced after collection change: "${result.title}" ` +
              `→ collection: ${result.collectionStrapiMedusaId ?? "none"}`,
          );
        }),
      );
      return;
    }
  } catch (err) {
    logger.error(`[strapi-sync] Product sync error (${name}): ${err}`);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product.category_changed",
    "product-collection.products_added",
    "product-collection.products_removed",
  ],
};
