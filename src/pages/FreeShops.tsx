import ShopListingPage from "@/components/ShopListingPage";
import { useLanguage } from "@/contexts/LanguageContext";

const FreeShops = () => {
  const { t } = useLanguage();
  return <ShopListingPage title={t("FreeView")} helpKey="HELPMAPMANY" />;
};
export default FreeShops;
