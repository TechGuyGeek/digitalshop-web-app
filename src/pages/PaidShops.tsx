import ShopListingPage from "@/components/ShopListingPage";
import { useLanguage } from "@/contexts/LanguageContext";

const PaidShops = () => {
  const { t } = useLanguage();
  return <ShopListingPage title={t("PaidView")} variant="paid" />;
};
export default PaidShops;
