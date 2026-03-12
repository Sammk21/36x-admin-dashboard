// src/subscribers/strapi-sync/product-collection.subscriber.ts

import {
  type SubscriberConfig,
  type SubscriberArgs,
} from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

import {
  uploadImageToStrapi,
  upsertByMedusaId,
  deleteByMedusaId,
  syncProductById,
} from "./lib/strapi.utils";

export default async function productCollectionSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<any>) {
  const logger = container.resolve("logger");

  try {
    // ── Deleted ───────────────────────────────────────────────────────────────
    if (name === "product-collection.deleted") {
      await deleteByMedusaId("product-collections", data.id);
      logger.info(`[strapi-sync] Collection deleted: ${data.id}`);
      return;
    }

    // ── Products added / removed ──────────────────────────────────────────────
    if (
      name === "product-collection.products_added" ||
      name === "product-collection.products_removed"
    ) {
      const productIds: string[] = data.product_ids ?? [];
      await Promise.all(
        productIds.map(async (productId) => {
          const result = await syncProductById(productId, container);
          logger.info(
            `[strapi-sync] Product re-synced after collection change: "${result.title}"`,
          );
        }),
      );
      return;
    }

    // ── Created / Updated ─────────────────────────────────────────────────────
    // Medusa sends the full object in the event payload — use it directly.
    // Fall back to a fresh DB fetch only if key fields are missing.
    let collection = data;

    if (!collection.title || !collection.handle) {
      const productService = container.resolve(Modules.PRODUCT);
      collection = await productService.retrieveProductCollection(data.id, {
        select: [
          "id",
          "title",
          "handle",
          "created_at",
          "updated_at",
          "deleted_at",
          "metadata",
        ],
        relations: ["products"],
      });
    }

    console.log(`[strapi-sync] Syncing collection (Medusa ID: ${collection.id}) with data:`, collection);

    const media = await uploadImageToStrapi(collection.thumbnail ?? null);

    // upsertByMedusaId handles POST vs PUT internally — caller stays ID-agnostic
    const { created } = await upsertByMedusaId(
      "product-collections",
      collection.id,
      {
        name: collection.title,
        handle: collection.handle,
        ...(media ? { thumbnail: media.id } : {}),
      },
    );

    logger.info(
      `[strapi-sync] Collection ${created ? "created" : "updated"}: ${collection.handle}`,
    );
  } catch (err) {
    logger.error(`[strapi-sync] Collection sync error (${name}): ${err}`);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
    "product-collection.products_added",
    "product-collection.products_removed",
  ],
};
