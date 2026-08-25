import { API_ORIGIN, AuthApiError, authenticatedFetch, getMenuImageUrl } from "@/lib/authClient";

export const API_ROOT = `${API_ORIGIN}/menu1/api/v1`;

export interface V1ErrorShape {
  code?: string;
  message?: string;
  request_id?: string;
}

export class V1ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, error: V1ErrorShape = {}) {
    super(error.message || "The request could not be completed.");
    this.name = "V1ApiError";
    this.status = status;
    this.code = error.code || "request_failed";
    this.requestId = error.request_id;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as {
    success?: boolean;
    data?: T;
    error?: V1ErrorShape;
  } | null;
  if (!response.ok || body?.success !== true) throw new V1ApiError(response.status, body?.error);
  return body.data as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  return readResponse<T>(await authenticatedFetch(`${API_ROOT}${path}`, { ...init, headers }));
}

export function getV1<T>(path: string): Promise<T> { return request<T>(path, { method: "GET" }); }

export function postV1<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchV1<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createV1OrderQr(orderId: string): Promise<{ token: string; order_id: string }> {
  return postV1<{ token: string; order_id: string }>("/order-payment-qr.php", { order_id: orderId });
}

export function buildMenuImageUrl(imagePath: string | null | undefined): string {
  return getMenuImageUrl(imagePath);
}

export function buildOrderQrPayload(token: string): string {
  const base = String(import.meta.env.VITE_APP_BASE || "/").replace(/^\/*/, "/").replace(/\/*$/, "/");
  return `${window.location.origin}${base}order-pay-scan?t=${encodeURIComponent(token)}`;
}

export function isSessionError(error: unknown): boolean {
  return error instanceof AuthApiError && error.status === 401 || (typeof error === "object" && error !== null && "status" in error && Number((error as { status?: unknown }).status) === 401);
}
