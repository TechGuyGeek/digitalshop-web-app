import ShopListingPage from "@/components/ShopListingPage";
import { useLanguage } from "@/contexts/LanguageContext";

const GlobalShops = () => {
  const { t } = useLanguage();
  return <ShopListingPage title={t("ViewGlobalShops")} variant="global" />;
};
export default GlobalShops;
