import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="w-20 h-20 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Payment Successful</h1>
        <div className="space-y-3 text-muted-foreground">
          <p>Thank you — your payment has been received.</p>
          <p>Your order has now been marked as paid and the shop will be notified.</p>
          <p>You can safely close this page or return to Shop-A-Verse.</p>
        </div>
        <Button onClick={() => navigate("/")} className="w-full">
          Return to Shop-A-Verse
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;