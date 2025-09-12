// client/src/App.tsx
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
import Categories from "@/pages/categories";
import Support from "@/pages/support";
import BecomeVendor from "@/pages/become-vendor";
import NotFound from "@/pages/not-found";

// --- Debug helper so we can see which route rendered ---
import { useEffect } from "react";
function RouteProbe({ tag }: { tag: string }) {
  useEffect(() => {
    // Open the browser DevTools Console to see these messages
    console.log(`[route] ${tag} mounted`);
  }, [tag]);
  return null;
}
// ------------------------------------------------------

function Router() {
  return (
    <Switch>
      <Route path="/">
        <>
          <RouteProbe tag="home /" />
          <Home />
        </>
      </Route>

      <Route path="/login">
        <>
          <RouteProbe tag="login" />
          <Login />
        </>
      </Route>

      <Route path="/register">
        <>
          <RouteProbe tag="register" />
          <Register />
        </>
      </Route>

      <Route path="/products/:id">
        {(params) => (
          <>
            <RouteProbe tag={`product ${params.id}`} />
            <ProductDetails params={params as any} />
          </>
        )}
      </Route>

      <Route path="/vendor-dashboard">
        <>
          <RouteProbe tag="vendor-dashboard" />
          <VendorDashboard />
        </>
      </Route>

      {/* TEMP: public admin page so you can see it now */}
      <Route path="/admin-dashboard">
        <>
          <RouteProbe tag="admin-dashboard" />
          <AdminDashboard />
        </>
      </Route>

      <Route path="/support" component={Support} />

      {/* 🚀 Newly added routes */}
      <Route path="/categories">
        <>
          <RouteProbe tag="categories" />
          <Categories />
        </>
      </Route>

      <Route path="/become-vendor">
        <>
          <RouteProbe tag="become-vendor" />
          <BecomeVendor />
        </>
      </Route>

      <Route path="/support">
        <>
          <RouteProbe tag="support" />
          <Support />
        </>
      </Route>

      {/* Catch-all */}
      <Route>
        <>
          <RouteProbe tag="not-found" />
          <NotFound />
        </>
      </Route>
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
