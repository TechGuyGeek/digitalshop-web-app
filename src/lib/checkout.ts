import { postV1, V1ApiError } from "@/lib/v1Api";

export interface CheckoutItemInput { productId: string | number; groupId: string | number; quantity: number; }
export interface CheckoutRequest { companyId: string; mode: "onsite" | "takeaway" | "delivery"; tableNumber: string; items: CheckoutItemInput[]; }
export interface CheckoutResult { success: boolean; checkoutId: string; submittedUnits?: number; message?: string; }

/** Stable signature retained for local validation/tests; it is never sent to the server. */
export function checkoutSignature(req: CheckoutRequest): string {
  return `${req.companyId}#${req.mode}#${req.tableNumber}#${[...req.items].map((item) => `${item.productId}:${item.groupId}:${item.quantity}`).sort().join("|")}`;
}

let checkoutInFlight: Promise<CheckoutResult> | null = null;
const CHECKOUT_KEY_PREFIX = "gpsshops.checkout.v1.";

function checkoutKeyStorageName(req: CheckoutRequest): string {
  return CHECKOUT_KEY_PREFIX + checkoutSignature(req);
}

function newIdempotencyKey(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return `web_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Keep one canonical idempotency key for a pending basket. A retry after an
 * interrupted response therefore resolves the same checkout rather than
 * creating a second one; a confirmed response clears it for a future basket.
 */
function idempotencyKey(req: CheckoutRequest): string {
  const storageName = checkoutKeyStorageName(req);
  const existing = sessionStorage.getItem(storageName);
  if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;
  const key = newIdempotencyKey();
  sessionStorage.setItem(storageName, key);
  return key;
}

/** Client-side duplicate protection for rapid repeated checkout calls. */
export async function placeOrderBatch(req: CheckoutRequest): Promise<CheckoutResult> {
  if (checkoutInFlight) return checkoutInFlight;
  const storageName = checkoutKeyStorageName(req);
  const payload = {
    company_id: Number(req.companyId),
    mode: req.mode,
    table_number: req.tableNumber || "0",
    idempotency_key: idempotencyKey(req),
    items: req.items.map((item) => ({ product_id: Number(item.productId), group_id: Number(item.groupId), quantity: Number(item.quantity) || 1 })),
  };
  const request = postV1<{ order_id?: string; submitted_units?: number }>("/orders.php", payload)
    .then((result) => {
      sessionStorage.removeItem(storageName);
      return { success: true, checkoutId: String(result.order_id || ""), submittedUnits: Number(result.submitted_units) || undefined };
    })
    .catch((error: unknown) => ({ success: false, checkoutId: "", message: error instanceof V1ApiError ? error.message : "Checkout failed" }));
  checkoutInFlight = request;
  try { return await request; } finally { checkoutInFlight = null; }
}
