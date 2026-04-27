import thankYouImg from "@/assets/thank-you-pro.png";

const ThankYou = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <img
        src={thankYouImg}
        alt="Thank you - You've unlocked Pro Mode"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default ThankYou;
