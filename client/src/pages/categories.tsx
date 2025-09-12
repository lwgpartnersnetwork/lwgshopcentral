import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Tag, ArrowLeft, Search } from "lucide-react";

/** Backend shapes (kept loose so it won't crash if fields differ) */
type Category = {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  createdAt?: string;
};

type Product = {
  id: string;
  name?: string;
  title?: string;
  imageUrl?: string;
  price: number | string;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
};

/** Small image helper */
function Img({ src, alt }: { src?: string; alt: string }) {
  if (!src) return <div className="w-full h-40 bg-muted rounded-lg" />;
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-40 object-cover rounded-lg border"
      loading="lazy"
    />
  );
}

export default function Categories() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  /** 1) Load all categories */
  const {
    data: categories = [],
    isLoading: loadingCats,
    isError: catsError,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  /** 2) If a category is chosen, load its products */
  const catId = selectedCategory?.id;
  const {
    data: products = [],
    isLoading: loadingProducts,
    isError: prodError,
  } = useQuery<Product[]>({
    queryKey: catId ? [`/api/products?categoryId=${catId}`] : ["products:skip"],
    enabled: !!catId,
  });

  /** 3) Filter categories by search */
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => {
      const label = c.name ?? c.title ?? "";
      return label.toLowerCase().includes(q);
    });
  }, [categories, search]);

  /** 4) UI */
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {selectedCategory ? "Products by Category" : "Browse Categories"}
          </h1>
          <p className="text-muted-foreground">
            {selectedCategory
              ? "Pick another category or open a product to view details."
              : "Choose a category to see products."}
          </p>
        </div>

        {/* Back button when viewing products */}
        {selectedCategory && (
          <Button
            variant="outline"
            onClick={() => setSelectedCategory(null)}
            data-testid="button-back-to-categories"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Categories
          </Button>
        )}
      </div>

      {/* Search (only on category list view) */}
      {!selectedCategory && (
        <div className="mb-6 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-category-search"
            />
          </div>
        </div>
      )}

      {/* Errors */}
      {catsError && !selectedCategory && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <p className="text-destructive">Failed to load categories.</p>
          </CardContent>
        </Card>
      )}
      {prodError && selectedCategory && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <p className="text-destructive">Failed to load products.</p>
          </CardContent>
        </Card>
      )}

      {/* Loading states */}
      {loadingCats && !selectedCategory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}
      {loadingProducts && selectedCategory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* 5) Category list */}
      {!selectedCategory && !loadingCats && (
        <>
          {!filteredCategories.length ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground">
                  No categories match “{search}”.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              data-testid="grid-categories"
            >
              {filteredCategories.map((c) => {
                const label = c.name ?? c.title ?? "Unnamed";
                return (
                  <Card
                    key={c.id}
                    className="cursor-pointer hover:shadow-md transition"
                    onClick={() => setSelectedCategory(c)}
                    data-testid={`card-category-${c.id}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground">
                        Tap to view products
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 6) Products for the selected category */}
      {selectedCategory && !loadingProducts && (
        <>
          {!products.length ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground">
                  No products found in “
                  {selectedCategory.name ??
                    selectedCategory.title ??
                    "Category"}
                  ”.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              data-testid="grid-products"
            >
              {products.map((p) => {
                const displayName = p.name ?? p.title ?? "(no name)";
                const price = Number(p.price ?? 0);
                return (
                  <Card key={p.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <Img src={p.imageUrl} alt={displayName} />
                    </CardContent>
                    <CardHeader className="space-y-2">
                      <CardTitle className="text-lg line-clamp-1">
                        {displayName}
                      </CardTitle>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={p.isActive ? "secondary" : "destructive"}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="font-semibold">
                          ${price.toFixed(2)}
                        </span>
                      </div>
                      <div className="pt-2">
                        <Button asChild className="w-full" size="sm">
                          <Link href={`/products/${p.id}`}>
                            <Package className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
