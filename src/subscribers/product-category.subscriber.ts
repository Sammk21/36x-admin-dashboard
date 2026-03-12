// src/subscribers/strapi-sync/product-category.subscriber.ts

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

export default async function productCategorySubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<any>) {
  const logger = container.resolve("logger");

  try {
    // ── Deleted ───────────────────────────────────────────────────────────────
    if (name === "product-category.deleted") {
      await deleteByMedusaId("categories", data.id);
      logger.info(`[strapi-sync] Category deleted: ${data.id}`);
      return;
    }

    // ── Products added / removed ──────────────────────────────────────────────
    if (
      name === "product-category.products_added" ||
      name === "product-category.products_removed"
    ) {
      const productIds: string[] = data.product_ids ?? [];
      await Promise.all(
        productIds.map(async (productId) => {
          const result = await syncProductById(productId, container);
          logger.info(
            `[strapi-sync] Product re-synced after category change: "${result.title}"`,
          );
        }),
      );
      return;
    }

    // ── Created / Updated ─────────────────────────────────────────────────────
    // Medusa sends the full object in the event payload — use it directly.
    // Fall back to a fresh DB fetch only if key fields are missing.
    let category = data;

    if (!category.name || !category.handle) {
      const productService = container.resolve(Modules.PRODUCT);
      category = await productService.retrieveProductCategory(data.id, {
        select: [
          "id",
          "name",
          "description",
          "handle",
          "is_active",
          "is_internal",
          "rank",
          "parent_category_id",
        ],
        relations: ["parent_category", "category_children", "products"],
      });
    }


    const media = await uploadImageToStrapi(category.thumbnail ?? null);

    // upsertByMedusaId handles POST vs PUT internally — caller stays ID-agnostic
    const { created } = await upsertByMedusaId(
      "categories",
      category.id,
      {
        name: category.name,
        handle: category.handle,
        description: category.description,
        is_active: category.is_active,
        ...(media ? { thumbnail: media.id } : {}),
        is_internal: category.is_internal,
        rank: category.rank,
        parent_category_id: category.parent_category_id,
      },
    );
  } catch (err) {
    logger.error(`[strapi-sync] Category sync error (${name}): ${err}`);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "product-category.products_added",
    "product-category.products_removed",
  ],
};
