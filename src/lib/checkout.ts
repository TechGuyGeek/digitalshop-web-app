const SERVER_DOMAIN = "https://web.gpsshops.com/";
const BATCH_ENDPOINT = "menu1/PHPwrite/LiveOrders/PlaceOrderBatchSecure.php";
const STORAGE_KEY = "checkout_session";

export interface CheckoutItemInput {
  productId: string | number;
  groupId: string | number;
  quantity: number;
}

export interface CheckoutRequest {
  companyId: string;
  customerId: string;
  userEmail: string;
  userPassword: string;
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
export function checkoutSignature(req: Omit<CheckoutRequest, "userPassword" | "userEmail">): string {
  const items = [...req.items]
    .map((i) => `${i.productId}:${i.groupId}:${i.quantity}`)
    .sort()
    .join("|");
  return `${req.companyId}#${req.customerId}#${req.mode}#${req.tableNumber}#${items}`;
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
    customerId: req.customerId,
    mode: req.mode,
    tableNumber: req.tableNumber,
    items: req.items,
  });
  const checkoutId = getCheckoutId(signature);

  const payload = {
    checkoutId,
    companyId: req.companyId,
    customerId: req.customerId,
    userEmail: req.userEmail,
    userPassword: req.userPassword,
    mode: req.mode,
    tableNumber: req.tableNumber || "0",
    items: req.items.map((i) => ({
      productId: String(i.productId),
      groupId: String(i.groupId ?? "0"),
      quantity: Number(i.quantity) || 1,
    })),
  };

  // Safe logging only — never credentials.
  console.log("[checkout] batch submit", {
    checkoutId,
    companyId: payload.companyId,
    mode: payload.mode,
    lines: payload.items.length,
  });

  try {
    const res = await fetch(SERVER_DOMAIN + BATCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: Record<string, unknown> | null = null;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!res.ok || !data) {
      console.warn("[checkout] batch failed, status:", res.status);
      return { success: false, idempotent: false, checkoutId, message: "Checkout failed" };
    }

    const success = data.success === true || data.Success === true;
    const idempotent = data.idempotent === true || data.Idempotent === true;
    const message = String((data.ServerMessage as string) || (data.message as string) || "");

    console.log("[checkout] batch result", {
      checkoutId,
      success,
      idempotent,
      submittedUnits: data.submittedUnits,
    });

    return {
      success,
      idempotent,
      checkoutId: String(data.checkoutId || checkoutId),
      submittedUnits: Number(data.submittedUnits) || undefined,
      message: message || undefined,
    };
  } catch (err) {
    console.error("[checkout] network error");
    return { success: false, idempotent: false, checkoutId, message: "Network error" };
  }
}
