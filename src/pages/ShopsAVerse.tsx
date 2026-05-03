import shopsAVerseImg from "@/assets/shopsaverse.png";

const ShopsAVerse = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <img
        src={shopsAVerseImg}
        alt="Shops-A-Verse - Every shop. One verse. Infinite possibilities."
        className="w-full h-auto max-w-full object-contain"
      />
    </div>
  );
};

export default ShopsAVerse;