import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/navbar";
import { CartSidebar } from "@/components/cart-sidebar";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ProductDetails from "@/pages/product-details";
import VendorDashboard from "@/pages/vendor-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";

// NOTE: We make /admin-dashboard PUBLIC for testing.
// Later, we can put AuthGuard back after you confirm it works.

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/products/:id" component={ProductDetails} />
      <Route path="/vendor-dashboard" component={VendorDashboard} />
      {/* TEMP: public admin page so you can see it now */}
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main>
            <Router />
          </main>
          <CartSidebar />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
