import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Shield, User, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildMenuImageUrl, fetchV1BlockedCustomers, unblockV1Customer } from "@/lib/v1Api";

interface BlockedCustomer {
  name?: string;
  image_path?: string;
  blocked_at?: string;
  order_id?: string;
}

const CustomerModeration = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<BlockedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchV1BlockedCustomers();
      setCustomers((result.customers || []) as BlockedCustomer[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load blocked customers");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const unblock = async (customer: BlockedCustomer) => {
    if (!customer.order_id) { toast.error("This customer has no authorized order reference for unblocking."); return; }
    setWorking(customer.order_id);
    try {
      await unblockV1Customer(customer.order_id);
      toast.success("Customer unblocked");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to unblock customer");
    } finally { setWorking(""); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-primary">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/company-orders")}><ArrowLeft size={20} /></Button>
        <Shield className="text-primary-foreground" size={20} />
        <h1 className="text-lg font-bold text-primary-foreground">Manage Customers</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-sm text-muted-foreground">Blocked customers can still browse this company, but the server prevents new checkout attempts. Blocks apply only to this company.</p>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div> : customers.length === 0 ? <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground"><UserRoundCheck size={42} /><p>No blocked customers.</p></div> : customers.map((customer) => <div key={`${customer.order_id}-${customer.blocked_at}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">{customer.image_path ? <img src={buildMenuImageUrl(customer.image_path)} alt="" className="h-full w-full object-cover" /> : <User size={24} className="text-muted-foreground" />}</div>
          <div className="min-w-0 flex-1"><p className="font-semibold text-foreground truncate">{customer.name || "Customer"}</p><p className="text-xs text-muted-foreground">Blocked {customer.blocked_at ? new Date(customer.blocked_at).toLocaleDateString() : ""}</p></div>
          <Button variant="outline" size="sm" disabled={!customer.order_id || working === customer.order_id} onClick={() => void unblock(customer)}>{working === customer.order_id ? <Loader2 size={15} className="animate-spin" /> : "Unblock"}</Button>
        </div>)}
      </div>
    </div>
  );
};

export default CustomerModeration;
