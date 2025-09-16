import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  ShoppingCart,
  ArrowLeft,
  Truck,
  Shield,
  RotateCcw,
} from "lucide-react";

/* ---------- Types ---------- */
type Product = {
  id: string;
  name?: string;
  title?: string;
  imageUrl?: string | null;
  price: number | string;
  stock?: number | string;
  description?: string;
  createdAt?: string;
  isActive?: boolean;
};

/* ---------- Helpers ---------- */
const toNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
};

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCartStore();
  const { toast } = useToast();

  const { data: product, isLoading, isError } = useQuery<Product | null>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product as any); // cart store accepts the product shape already
    toast({
      title: "Added to cart",
      description: `${product.name ?? product.title ?? "Item"} added to your cart`,
    });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Not found / error
  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Product Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The product you’re looking for doesn’t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normalized fields
  const displayName = product.name ?? product.title ?? "Product";
  const price = toNumber(product.price, 0);
  const stock = toNumber(product.stock, 0);
  const img = product.imageUrl || "";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary" data-testid="link-home">
          Home
        </Link>
        <span>/</span>
        <span data-testid="text-product-name">{displayName}</span>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-lg border">
            {img ? (
              <img
                src={img}
                alt={displayName}
                className="h-full w-full object-cover"
                data-testid="img-product"
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="mb-4 text-3xl font-bold" data-testid="text-product-title">
              {displayName}
            </h1>

            <div className="mb-4 flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  (124 reviews)
                </span>
              </div>
            </div>

            <div className="mb-6 flex items-center space-x-4">
              <span className="text-4xl font-bold text-primary" data-testid="text-price">
                ${price.toFixed(2)}
              </span>
              <Badge
                variant={stock > 0 ? "secondary" : "destructive"}
                data-testid="badge-stock"
              >
                {stock > 0 ? `${stock} in stock` : "Out of stock"}
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">Description</h3>
            <p
              className="leading-relaxed text-muted-foreground"
              data-testid="text-description"
            >
              {product.description || "No description provided."}
            </p>
          </div>

          {/* Add to Cart */}
          <div className="space-y-4">
            <Button
              onClick={handleAddToCart}
              disabled={stock === 0}
              size="lg"
              className="w-full"
              data-testid="button-add-to-cart"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {stock > 0 ? "Add to Cart" : "Out of Stock"}
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-4 border-t pt-6 md:grid-cols-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Free Shipping</p>
                <p className="text-xs text-muted-foreground">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">Secure Payment</p>
                <p className="text-xs text-muted-foreground">100% protected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <RotateCcw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Easy Returns</p>
                <p className="text-xs text-muted-foreground">30-day policy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
