import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BasketProvider } from "@/contexts/BasketContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { SiteNavExtrasProvider } from "@/contexts/SiteNavExtras";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import Legal from "./pages/Legal.tsx";
import SiteNav from "./components/SiteNav";
import GlobalUpgradeNavAction from "./components/GlobalUpgradeNavAction";
import GlobalSignOutNavAction from "./components/GlobalSignOutNavAction";
import Profile from "./pages/Profile.tsx";
import PaymentMethods from "./pages/PaymentMethods.tsx";
import OAuthCallback from "./pages/OAuthCallback.tsx";
import ViewShops from "./pages/ViewShops.tsx";
import FreeShops from "./pages/FreeShops.tsx";
import PaidShops from "./pages/PaidShops.tsx";
import GlobalShops from "./pages/GlobalShops.tsx";
import ShopProfile from "./pages/ShopProfile.tsx";
import ShopInterior from "./pages/ShopInterior.tsx";
import CategoryItems from "./pages/CategoryItems.tsx";
import Basket from "./pages/Basket.tsx";
import Orders from "./pages/Orders.tsx";
import OrderDetail from "./pages/OrderDetail.tsx";
import OrderDetailWeek from "./pages/OrderDetailWeek.tsx";
import OrderDetailMonth from "./pages/OrderDetailMonth.tsx";
import BuildShop from "./pages/BuildShop.tsx";
import CompanyProfile from "./pages/CompanyProfile.tsx";
import QRScanner from "./pages/QRScanner.tsx";
import GroupProducts from "./pages/GroupProducts.tsx";
import EditMenuGroupsPage from "./pages/EditMenuGroups.tsx";
import EditProduct from "./pages/EditProduct.tsx";
import AddProduct from "./pages/AddProduct.tsx";
import CompanyOrders from "./pages/CompanyOrders.tsx";
import CompanyOrderDetail from "./pages/CompanyOrderDetail.tsx";
import CustomerProfileReadonly from "./pages/CustomerProfileReadonly.tsx";
import CompanyProfileReadonly from "./pages/CompanyProfileReadonly.tsx";
import ThankYou from "./pages/ThankYou.tsx";
import PaymentComplete from "./pages/PaymentComplete.tsx";
import PaymentRetry from "./pages/PaymentRetry.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import PaymentCancelled from "./pages/PaymentCancelled.tsx";
import ShopsAVerse from "./pages/ShopsAVerse.tsx";
import AdminShops from "./pages/AdminShops.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AppShell = () => {
  const { theme } = useTheme();
  const isLight = false;
  const desktopBg =
    theme === "midnight"
      ? "md:bg-[url('/bg-midnight.png')]"
      : theme === "safari"
      ? "md:bg-[url('/bg-safari.png')]"
      : theme === "camo"
      ? "md:bg-[url('/bg-camo.png')]"
      : "md:bg-[url('/images/bg-desktop.png')]";
  const outerClass = `w-full min-h-screen bg-black ${desktopBg} md:bg-cover md:bg-center md:bg-fixed flex justify-center`;
  return (
    <div className={outerClass}>
      <div className={`w-full max-w-[430px] min-h-screen relative ${isLight ? "shadow-[0_0_60px_-15px_hsl(220_40%_25%/0.15)] bg-background" : "shadow-2xl"}`}>
          <BrowserRouter>
            <BasketProvider>
              <SiteNavExtrasProvider>
                <SiteNav />
                <GlobalUpgradeNavAction />
                <GlobalSignOutNavAction />
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/oauth-callback" element={<OAuthCallback />} />
                <Route path="/view-shops" element={<ViewShops />} />
                <Route path="/free-shops" element={<FreeShops />} />
                <Route path="/paid-shops" element={<PaidShops />} />
                <Route path="/global-shops" element={<GlobalShops />} />
                <Route path="/shop-profile" element={<ShopProfile />} />
                <Route path="/shop-interior" element={<ShopInterior />} />
                <Route path="/category-items" element={<CategoryItems />} />
                <Route path="/basket" element={<Basket />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/order-detail" element={<OrderDetail />} />
                <Route path="/order-detail-week" element={<OrderDetailWeek />} />
                <Route path="/order-detail-month" element={<OrderDetailMonth />} />
                <Route path="/build-shop" element={<BuildShop />} />
                <Route path="/company-profile" element={<CompanyProfile />} />
                <Route path="/qr-scanner" element={<QRScanner />} />
                <Route path="/group-products" element={<GroupProducts />} />
                <Route path="/edit-menu-groups" element={<EditMenuGroupsPage />} />
                <Route path="/edit-product" element={<EditProduct />} />
                <Route path="/add-product" element={<AddProduct />} />
                <Route path="/company-orders" element={<CompanyOrders />} />
                <Route path="/company-order-detail" element={<CompanyOrderDetail />} />
                <Route path="/customer-profile-readonly" element={<CustomerProfileReadonly />} />
                <Route path="/company-profile-readonly" element={<CompanyProfileReadonly />} />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/payment-complete" element={<PaymentComplete />} />
                <Route path="/payment-retry" element={<PaymentRetry />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                <Route path="/shopsaverse" element={<ShopsAVerse />} />
                <Route path="/admin-shops" element={<AdminShops />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </SiteNavExtrasProvider>
            </BasketProvider>
          </BrowserRouter>
        </div>
      </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
