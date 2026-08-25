import { postV1, V1ApiError } from "@/lib/v1Api";

export interface CheckoutItemInput { productId: string | number; groupId: string | number; quantity: number; }
export interface CheckoutRequest { companyId: string; mode: "onsite" | "takeaway" | "delivery"; tableNumber: string; items: CheckoutItemInput[]; }
export interface CheckoutResult { success: boolean; checkoutId: string; submittedUnits?: number; message?: string; }

/** Stable signature retained for local validation/tests; it is never sent to the server. */
export function checkoutSignature(req: CheckoutRequest): string {
  return `${req.companyId}#${req.mode}#${req.tableNumber}#${[...req.items].map((item) => `${item.productId}:${item.groupId}:${item.quantity}`).sort().join("|")}`;
}

let checkoutInFlight: Promise<CheckoutResult> | null = null;

/** Client-side duplicate protection for rapid repeated checkout calls. */
export async function placeOrderBatch(req: CheckoutRequest): Promise<CheckoutResult> {
  if (checkoutInFlight) return checkoutInFlight;
  const payload = {
    company_id: Number(req.companyId),
    mode: req.mode === "onsite" ? "on_site" : req.mode,
    table_number: req.tableNumber || "0",
    items: req.items.map((item) => ({ product_id: Number(item.productId), group_id: Number(item.groupId), quantity: Number(item.quantity) || 1 })),
  };
  const request = postV1<{ random_code?: string; submitted_units?: number }>("/customer-orders.php", payload)
    .then((result) => ({ success: true, checkoutId: String(result.random_code || ""), submittedUnits: Number(result.submitted_units) || undefined }))
    .catch((error: unknown) => ({ success: false, checkoutId: "", message: error instanceof V1ApiError ? error.message : "Checkout failed" }));
  checkoutInFlight = request;
  try { return await request; } finally { checkoutInFlight = null; }
}
