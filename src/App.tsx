import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BasketProvider } from "@/contexts/BasketContext";
import Index from "./pages/Index.tsx";
import Profile from "./pages/Profile.tsx";
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
import BuildShop from "./pages/BuildShop.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="flex justify-center min-h-screen bg-black">
        <div className="w-full max-w-[430px] min-h-screen shadow-2xl relative">
          <BrowserRouter>
            <BasketProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/profile" element={<Profile />} />
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
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BasketProvider>
          </BrowserRouter>
        </div>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
