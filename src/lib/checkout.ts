import { authenticatedFetch } from "@/lib/authClient";
const BATCH_ENDPOINT = "https://web.gpsshops.com/menu1/api/v1/orders.php";
const STORAGE_KEY = "checkout_session";

export interface CheckoutItemInput {
  productId: string | number;
  groupId: string | number;
  quantity: number;
}

export interface CheckoutRequest {
  companyId: string;
  mode: "onsite" | "takeaway" | "delivery";
  tableNumber: string;
  items: CheckoutItemInput[];
}

export interface CheckoutResult {
  success: boolean;
  idempotent: boolean;
  checkoutId: string;
  submittedUnits?: number;
  message?: string;
}

/** Stable signature of the logical basket + fulfilment details. */
export function checkoutSignature(req: CheckoutRequest): string {
  const items = [...req.items]
    .map((i) => `${i.productId}:${i.groupId}:${i.quantity}`)
    .sort()
    .join("|");
  return `${req.companyId}#${req.mode}#${req.tableNumber}#${items}`;
}

function randomId(length = 64): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  (globalThis.crypto || ({} as Crypto)).getRandomValues?.(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    const v = bytes[i] || Math.floor(Math.random() * 256);
    out += chars.charAt(v % chars.length);
  }
  return out;
}

/**
 * Returns a stable checkoutId for the given logical basket.
 * Same signature -> same id (safe retry). Changed basket -> new id.
 */
export function getCheckoutId(signature: string): string {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { signature?: string; checkoutId?: string };
      if (parsed.signature === signature && parsed.checkoutId) return parsed.checkoutId;
    }
  } catch { /* ignore */ }
  const checkoutId = randomId(64);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, checkoutId }));
  } catch { /* ignore */ }
  return checkoutId;
}

/** Clear after confirmed success so the next basket starts a new logical checkout. */
export function clearCheckoutId(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * Submits the whole basket as one atomic/idempotent batch.
 * Never falls back to the legacy per-line endpoint.
 */
export async function placeOrderBatch(req: CheckoutRequest): Promise<CheckoutResult> {
  const signature = checkoutSignature({
    companyId: req.companyId,
    mode: req.mode,
    tableNumber: req.tableNumber,
    items: req.items,
  });
  const checkoutId = getCheckoutId(signature);

  const payload = {
    checkoutId,
    company_id: Number(req.companyId),
    mode: req.mode,
    tableNumber: req.tableNumber || "0",
    items: req.items.map((i) => ({
      product_id: Number(i.productId),
      group_id: Number(i.groupId ?? "0"),
      quantity: Number(i.quantity) || 1,
    })),
  };

  // Safe logging only — never credentials.
  console.log("[checkout] batch submit", {
    checkoutId,
    companyId: payload.company_id,
    mode: payload.mode,
    lines: payload.items.length,
  });

  try {
    const res = await authenticatedFetch(BATCH_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idempotency_key: checkoutId, table_number: payload.tableNumber }) });
    const text = await res.text();
    let data: Record<string, unknown> | null = null;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!res.ok || !data) {
      console.warn("[checkout] batch failed, status:", res.status);
      return { success: false, idempotent: false, checkoutId, message: "Checkout failed" };
    }

    const envelope = data as any;
    const result = envelope.data || envelope;
    const success = envelope.success === true;
    const idempotent = result.idempotent === true;
    const message = String(result.message || envelope.error?.message || "");

    console.log("[checkout] batch result", {
      checkoutId,
      success,
      idempotent,
      submittedUnits: data.submittedUnits,
    });

    return {
      success,
      idempotent,
      checkoutId: String(result.order_id || checkoutId),
      submittedUnits: Number(result.submitted_units) || undefined,
      message: message || undefined,
    };
  } catch (err) {
    console.error("[checkout] network error");
    return { success: false, idempotent: false, checkoutId, message: "Network error" };
  }
}
