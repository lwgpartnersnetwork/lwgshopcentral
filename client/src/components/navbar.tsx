import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { useCartStore } from "@/lib/cart";
import { Search, ShoppingCart, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { site } from "@/config/site";

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
    { name: "Become Vendor", href: "/become-vendor" }, // <— works with your file name
    { name: "Support", href: "/support" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Desktop Nav */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label={site.name}
            >
              {/* swap logos automatically with dark mode */}
              <img
                src={site.logo.light}
                alt={`${site.shortName} logo`}
                className="h-8 w-auto dark:hidden"
              />
              <img
                src={site.logo.dark}
                alt={`${site.shortName} logo`}
                className="h-8 w-auto hidden dark:block"
              />
              <span className="text-xl font-extrabold tracking-tight">
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

          {/* Search (desktop) */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4"
                data-testid="input-search"
              />
            </form>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-sm text-muted-foreground">
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
              <Button size="sm" asChild>
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
                <div className="flex items-center gap-3">
                  <img src={site.logo.light} alt="" className="h-7 w-auto" />
                  <span className="font-bold">{site.name}</span>
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

                  {/* Mobile search */}
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
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
