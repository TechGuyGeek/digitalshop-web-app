import { useEffect,useState } from "react";
import { useNavigate,useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { resolveOrderPaymentQr } from "@/lib/orderPaymentQr";
import { useAuth } from "@/contexts/AuthContext";
export default function OrderPayScan(){const nav=useNavigate();const[p]=useSearchParams();const{status}=useAuth();const[error,setError]=useState("");useEffect(()=>{const t=p.get("t");if(!t){setError("Invalid payment QR");return;}if(status==="loading")return;if(status==="anonymous"){sessionStorage.setItem("pending_order_pay_qr",t);nav("/",{replace:true});return;}resolveOrderPaymentQr(t).then(x=>nav(`/company-order-detail?id=${encodeURIComponent(x.order_id)}&owner=true`)).catch(e=>setError(e.message));},[p,nav,status]);return <div className="min-h-screen flex items-center justify-center p-6 text-center">{error?<p className="text-destructive">{error}</p>:<Loader2 className="animate-spin"/>}</div>}
