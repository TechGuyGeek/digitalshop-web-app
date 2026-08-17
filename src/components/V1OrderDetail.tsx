import { useEffect,useState } from "react";
import { useNavigate,useSearchParams } from "react-router-dom";
import { ArrowLeft,Loader2,Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMyOrder, getOwnedOrder, type V1Order } from "@/lib/orderApi";
import OrderPayButton from "@/components/OrderPayButton";

export default function V1OrderDetail({range="today",owner=false}:{range?:"today"|"week"|"month",owner?:boolean}) {
 const nav=useNavigate(); const [params]=useSearchParams(); const {t}=useLanguage(); const [order,setOrder]=useState<V1Order|null>(null); const [loading,setLoading]=useState(true); const id=params.get("id")||params.get("orderid")||params.get("randomcode")||"";
 useEffect(()=>{ if(!id){setLoading(false);return;} (owner?getOwnedOrder(id):getMyOrder(id)).then(setOrder).catch(console.error).finally(()=>setLoading(false)); },[id,owner]);
 const title=order?.company_name||params.get("companyname")||t(range==="month"?"Ordersofthemonth":range==="week"?"Ordersoftheweekand":"UserOrderDetails");
 return <div className="h-dvh bg-muted flex flex-col"><div className="bg-primary px-4 py-4 flex items-center gap-3"><Button variant="ghost" size="icon" className="text-primary-foreground" onClick={()=>nav("/orders")}><ArrowLeft size={20}/></Button><h1 className="text-lg font-bold text-primary-foreground truncate">{title}</h1></div>{loading?<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin"/></div>:!order?<div className="p-8 text-center">{t("NoOrdersToshow")}</div>:<><div className="bg-card px-4 py-3 flex justify-between text-sm font-semibold"><span>{t("Totalitems")} {order.items.reduce((n,i)=>n+i.quantity,0)}</span><span>{t("TOTALPRICE")} {order.total}</span></div><div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">{order.items.map((item,i)=><div key={`${item.product_id}-${i}`} className="rounded-xl border bg-card overflow-hidden shadow-sm">{item.image_path?<img src={item.image_path.startsWith("http")?item.image_path:`${import.meta.env.VITE_API_ORIGIN||""}/menu1/${item.image_path}`} alt={item.name} className="w-full h-40 object-cover"/>:<div className="px-4 py-3 flex justify-between"><span className="font-bold flex gap-2"><Store size={18}/>{item.name}</span><span>{item.price}</span></div>}<div className="px-4 py-3"><p className="font-semibold">{item.name} × {item.quantity}</p>{item.description&&<p className="text-sm text-muted-foreground">{item.description}</p>}</div></div>)}</div><OrderPayButton companyId={String(order.company_id)} orderId={order.id} totalAmount={Number(order.total)} hasPaid={order.paid}/></>}</div>;
}
