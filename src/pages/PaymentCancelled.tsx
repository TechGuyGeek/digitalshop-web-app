import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const PaymentCancelled = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="w-20 h-20 text-destructive" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Payment Cancelled</h1>
        <div className="space-y-3 text-muted-foreground">
          <p>Your payment was not completed.</p>
          <p>No money has been taken. You can return to your basket and try again.</p>
        </div>
        <div className="space-y-3">
          <Button onClick={() => navigate("/basket")} className="w-full">
            Return to Basket
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;