import shopsAVerseImg from "@/assets/shopsaverse.png";

const ShopsAVerse = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      <img
        src={shopsAVerseImg}
        alt="Shops-A-Verse - Every shop. One verse. Infinite possibilities."
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default ShopsAVerse;