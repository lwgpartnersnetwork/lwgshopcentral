// client/src/components/navbar.tsx
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { useCartStore } from "@/lib/cart";
import { Search, ShoppingCart, Menu, Store } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import site from "@/config/site";
import { CurrencySwitcher } from "@/components/currency-switcher";

export function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalItems, openCart } = useCartStore();
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Categories", href: "/categories" },
    { name: "Become Vendor", href: "/become-vendor" },
    { name: "Support", href: "/support" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 min-w-0">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Left: brand + desktop nav */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              {/* ✅ Store icon badge (restored) */}
              <div
                className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
                aria-label="LWG home"
              >
                <Store className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                {site.name}
              </span>
            </Link>

            <nav className="hidden md:flex gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Middle: search (desktop only) */}
          <div className="hidden md:block flex-1 max-w-lg mx-2">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4"
              />
            </form>
          </div>

          {/* Right: currency + cart + auth + mobile menu */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block">
              <CurrencySwitcher />
            </div>

            {/* Cart */}
            <Button
              variant="ghost"
              size="sm"
              onClick={openCart}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {getTotalItems() > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {getTotalItems()}
                </Badge>
              )}
            </Button>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[12ch]">
                  Welcome, {user?.firstName}
                </span>

                {user?.role === "vendor" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/vendor-dashboard">Dashboard</Link>
                  </Button>
                )}

                {user?.role === "admin" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin-dashboard">Admin</Link>
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                {/* Drawer brand (kept the same icon) */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Store className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">{site.name}</span>
                </div>

                <div className="mt-4">
                  <CurrencySwitcher />
                </div>

                <nav className="flex flex-col gap-4 mt-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      {item.name}
                    </Link>
                  ))}

                  <form onSubmit={handleSearch} className="relative mt-6">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4"
                    />
                  </form>

                  <div className="mt-4 flex gap-2">
                    {isAuthenticated ? (
                      <>
                        {user?.role === "vendor" && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1"
                          >
                            <Link href="/vendor-dashboard">
                              Vendor Dashboard
                            </Link>
                          </Button>
                        )}
                        {user?.role === "admin" && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1"
                          >
                            <Link href="/admin-dashboard">Admin</Link>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={logout}
                          className="flex-1"
                        >
                          Logout
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" asChild className="flex-1">
                        <Link href="/login">Sign In</Link>
                      </Button>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
