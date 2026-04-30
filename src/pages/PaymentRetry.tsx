import { useNavigate } from "react-router-dom";
import paymentImg from "@/assets/thank-you-pro.png";

const PaymentRetry = () => {
  const navigate = useNavigate();
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-pointer"
      onClick={() => navigate("/")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate("/");
      }}
    >
      <img
        src={paymentImg}
        alt="Payment retry"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default PaymentRetry;