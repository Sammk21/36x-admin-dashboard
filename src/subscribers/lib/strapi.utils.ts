// src/subscribers/strapi-sync/lib/strapi.utils.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers for all Strapi sync subscribers.
//
// Design principle: medusa_id is the sole source of truth.
// Callers never deal with Strapi numeric IDs — all lookups, upserts, and
// deletes are keyed exclusively on medusa_id. Strapi numeric IDs are an
// internal implementation detail resolved and discarded within this file.
//
// Uses Node 18 built-in fetch / FormData / Blob — zero extra packages.
// ─────────────────────────────────────────────────────────────────────────────

import { Modules } from "@medusajs/framework/utils";

export const STRAPI_BASE_URL =
  process.env.STRAPI_BASE_URL ?? "http://localhost:1337";
export const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StrapiMedia {
  id: number;
  url: string;
}

export interface SyncProductResult {
  title: string;
  created: boolean;
  categoryCount: number;
  collectionStrapiMedusaId: string | null;
}

// ─── Internal: resolve Strapi numeric ID from medusa_id ──────────────────────
//
// This is the ONLY place in the codebase that deals with Strapi document ID.
// Everything above this function works exclusively with medusa_id strings.

async function resolveDocumentId(
  contentType: string,
  medusaId: string,
): Promise<number | null> {
  const url =
    `${STRAPI_BASE_URL}/api/${contentType}` +
    `?filters[medusa_id][$eq]=${encodeURIComponent(medusaId)}&fields[0]=documentId`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
  });

  if (!res.ok) return null;

  const json = (await res.json()) as { data: Array<{ documentId: number }> };
  return json.data?.[0]?.documentId ?? null;
}

// ─── Image upload ─────────────────────────────────────────────────────────────

/**
 * Downloads an image from a remote URL and uploads it to Strapi's Media Library.
 * Returns the Strapi media object or null — caller never sees a numeric ID,
 * just embeds media.id in the payload which Strapi resolves internally.
 */
export async function uploadImageToStrapi(
  imageUrl: string | null | undefined,
): Promise<StrapiMedia | null> {
  if (!imageUrl) return null;

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    console.warn(`[strapi-sync] Could not download image: ${imageUrl}`);
    return null;
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  const filename = imageUrl.split("/").pop()?.split("?")[0] ?? "image.jpg";

  const blob = new Blob([arrayBuffer], { type: contentType });
  const form = new FormData();
  form.append("files", blob, filename);

  const uploadResponse = await fetch(`${STRAPI_BASE_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    body: form,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`[strapi-sync] Strapi upload failed: ${text}`);
  }

  const uploaded = (await uploadResponse.json()) as StrapiMedia[];
  return uploaded[0] ?? null;
}

// ─── Upsert by medusa_id (public API) ────────────────────────────────────────

/**
 * Creates or updates a Strapi entry identified by medusa_id.
 *
 * Callers pass only medusa_id + the payload — no Strapi numeric IDs needed.
 * Internally resolves whether to POST or PUT based on whether the entry
 * already exists (looked up via medusa_id filter).
 *
 * Returns whether the entry was created (true) or updated (false).
 */
export async function upsertByMedusaId(
  contentType: string,
  medusaId: string,
  payload: Record<string, unknown>,
): Promise<{ created: boolean }> {
  // medusa_id is always included in the payload so Strapi stores it
  const fullPayload = { ...payload, medusa_id: medusaId };


  console.log(`[strapi-sync] Upserting ${contentType} (medusa_id: ${medusaId}) with payload:`, fullPayload);

  // Resolve Strapi numeric ID internally — callers never see this
  const documentId = await resolveDocumentId(contentType, medusaId);

  const url = documentId
    ? `${STRAPI_BASE_URL}/api/${contentType}/${documentId}`
    : `${STRAPI_BASE_URL}/api/${contentType}`;

  const method = documentId ? "PUT" : "POST";

  console.log(`[strapi-sync] ${method} request to Strapi for ${contentType} (medusa_id: ${medusaId}) at URL: ${url}`);

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data: fullPayload }),
  });

  console.log(response,"response")

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `[strapi-sync] Failed to ${method} ${contentType} (medusa_id: ${medusaId}): ${text}`,
    );
  }

  return { created: !documentId };
}

// ─── Delete by medusa_id (public API) ────────────────────────────────────────

/**
 * Deletes a Strapi entry identified by medusa_id.
 * No-ops gracefully if the entry doesn't exist.
 */
export async function deleteByMedusaId(
  contentType: string,
  medusaId: string,
): Promise<void> {
  const documentId = await resolveDocumentId(contentType, medusaId);
  if (!documentId) return; // already gone or never existed

  const response = await fetch(
    `${STRAPI_BASE_URL}/api/${contentType}/${documentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `[strapi-sync] Failed to DELETE ${contentType} (medusa_id: ${medusaId}): ${text}`,
    );
  }
}

// ─── Resolve relation IDs by medusa_id (internal helper) ─────────────────────
//
// Strapi relations are set with numeric IDs internally, but we always
// resolve them from medusa_id so callers stay ID-agnostic.

async function resolveRelationIds(
  contentType: string,
  medusaIds: string[],
): Promise<number[]> {
  if (!medusaIds.length) return [];
  const results = await Promise.all(
    medusaIds.map((mid) => resolveDocumentId(contentType, mid)),
  );

  console.log(results, "resolve relation ids")
  return results.filter((id): id is number => id !== null);
}

// ─── Product sync ─────────────────────────────────────────────────────────────

/**
 * Fetches a product from Medusa (with categories + collection), resolves
 * all Strapi relations by medusa_id, then upserts via upsertByMedusaId.
 *
 * Shared by all three subscribers. The caller only needs the product's
 * medusa_id — all Strapi numeric ID resolution happens internally.
 */
export async function syncProductById(
  productId: string,
  container: any,
): Promise<SyncProductResult> {
  const productService = container.resolve(Modules.PRODUCT);

  const product = await productService.retrieveProduct(productId, {
    relations: ["categories", "collection"],
  });

  // Upload thumbnail
  const media = await uploadImageToStrapi(product.thumbnail);

  // Resolve category relations — keyed by medusa_id, numeric IDs internal only
  const categoryMedusaIds = (product.categories ?? []).map(
    (cat: { id: string }) => cat.id,
  );
  const categorydocumentIds = await resolveRelationIds(
    "categories",
    categoryMedusaIds,
  );

  // Resolve collection relation — keyed by medusa_id
  const col = (product as unknown as { collection?: { id: string } })
    .collection;
  const collectiondocumentIds = col?.id
    ? await resolveRelationIds("product-collections", [col.id])
    : [];

 const payload: Record<string, unknown> = {
   title: product.title,
   description: product.description ?? null,
   ...(media ? { thumbnail: media.id } : {}),
   categories: { set: categorydocumentIds },
   product_collection: { set: collectiondocumentIds },
 };

  console.dir(
    `[strapi-sync] Syncing product (Medusa ID: ${product.id}) with payload: ${JSON.stringify(payload, null, 2)}`,
    { depth: null },
  );

  const { created } = await upsertByMedusaId("products", product.id, payload);

  return {
    title: product.title,
    created,
    categoryCount: categorydocumentIds.length,
    collectionStrapiMedusaId: col?.id ?? null,
  };
}
