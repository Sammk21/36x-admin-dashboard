import {
  type SubscriberConfig,
  type SubscriberArgs,
} from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

// ─── Config ────────────────────────────────────────────────────────────────

const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL ?? "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN ?? "";

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Downloads an image from a remote URL and uploads it to Strapi's Media Library.
 *
 * Uses Node 18's built-in `fetch` + `FormData` + `Blob` — zero extra packages,
 * zero ESM/CJS conflicts. Medusa v2 requires Node >=18, so these globals are
 * always available.
 *
 * @returns Strapi media object { id, url } or null if no image supplied.
 */
async function uploadImageToStrapi(
  imageUrl: string | null | undefined,
): Promise<{ id: number; url: string } | null> {
  if (!imageUrl) return null;

  // 1. Download the image as an ArrayBuffer using native fetch
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    console.warn(`[strapi-sync] Could not download image: ${imageUrl}`);
    return null;
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  const filename = imageUrl.split("/").pop()?.split("?")[0] ?? "image.jpg";

  // 2. Build a multipart/form-data payload using Node 18 built-in FormData + Blob
  const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
  const form = new FormData();
  form.append("files", blob, filename);

  // 3. POST to Strapi upload endpoint
  //    Do NOT set Content-Type manually — fetch sets the boundary automatically
  const uploadResponse = await fetch(`${STRAPI_BASE_URL}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: form,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`[strapi-sync] Strapi upload failed: ${text}`);
  }

  const uploaded = (await uploadResponse.json()) as Array<{
    id: number;
    url: string;
  }>;

  return uploaded[0] ?? null;
}

/**
 * Creates or updates a Strapi content-type entry.
 * Pass `strapiId` to PUT (update), omit to POST (create).
 */
async function upsertStrapiEntry(
  contentType: string,
  payload: Record<string, unknown>,
  strapiId?: number | null,
): Promise<void> {
  const url = strapiId
    ? `${STRAPI_BASE_URL}/api/${contentType}/${strapiId}`
    : `${STRAPI_BASE_URL}/api/${contentType}`;

  const method = strapiId ? "PUT" : "POST";

  console.log("[strapi-sync] ----------------------------");
  console.log("[strapi-sync] Method:", method);
  console.log("[strapi-sync] URL:", url);
  console.log("[strapi-sync] Payload:", payload);
  console.log("[strapi-sync] Strapi ID:", strapiId ?? "NEW ENTRY");

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({ data: payload }),
    });

    const responseText = await response.text();

    console.log("[strapi-sync] Status:", response.status);
    console.log("[strapi-sync] Response:", responseText);

    if (!response.ok) {
      throw new Error(
        `[strapi-sync] Failed to ${method} ${contentType}: ${responseText}`,
      );
    }

    console.log("[strapi-sync] Success ✅");
  } catch (error) {
    console.error("[strapi-sync] Error:", error);
    throw error;
  }
}

// ─── Product Collection Subscriber ─────────────────────────────────────────

export default async function productCollectionSyncSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");
  const productModuleService = container.resolve(Modules.PRODUCT);

  try {
    // ── Handle deletion ────────────────────────────────────────────────
    if (name === "product-collection.deleted") {
      logger.info(
        `[strapi-sync] Collection deleted: ${data.id} – add Strapi deletion logic here if needed`,
      );
      return;
    }

    // ── Fetch full collection ──────────────────────────────────────────
    const collection = await productModuleService.retrieveProductCollection(
      data.id,

      { select: ["id", "title", "handle", "thumbnail"], relations: [] },
    );

    // ── Upload thumbnail (downloads first, then sends to Strapi) ───────
    const media = await uploadImageToStrapi(
      (collection as unknown as { thumbnail?: string }).thumbnail,
    );

    // ── Build Strapi payload ───────────────────────────────────────────
    // TODO: Replace / extend with your own Strapi content-type fields.
    const strapiPayload: Record<string, unknown> = {
      medusa_id: collection.id,
      name: collection.title,
      handle: collection.handle,
      ...(media ? { thumbnail: media.id } : {}),
    };

    await upsertStrapiEntry("product-collections", strapiPayload);

    logger.info(
      `[strapi-sync] Collection synced to Strapi: ${collection.handle}`,
    );
  } catch (error) {
    logger.error(`[strapi-sync] Collection sync error: ${error}`);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
  ],
};
