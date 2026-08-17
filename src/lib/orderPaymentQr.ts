import { authenticatedFetch } from "@/lib/authClient";
const API="https://web.gpsshops.com/menu1/api/v1/order-payment-qr.php";
export async function createOrderPaymentQr(orderId:string){const r=await authenticatedFetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_id:orderId})});const b=await r.json();if(!r.ok||!b.success)throw new Error(b?.error?.message||"QR unavailable");return b.data as {token:string;expires_in:number;order_id:string};}
export async function resolveOrderPaymentQr(token:string){const r=await authenticatedFetch(`${API}?t=${encodeURIComponent(token)}`);const b=await r.json();if(!r.ok||!b.success)throw new Error(b?.error?.message||"QR unavailable");return b.data as {order_id:string;company_id:number;expires_at:string};}
