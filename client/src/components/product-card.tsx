import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { Star, ShoppingCart, ImageOff } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { format } = useCurrency();

  // Normalize/derive fields
  const price = Number(product?.price ?? 0);
  const stock = Number((product as any)?.stock ?? 0);
  const name =
    (product as any)?.name ??
    (product as any)?.title ??
    "Product";
  const hasImage = Boolean((product as any)?.imageUrl);

  const handleAddToCart = (e: React.MouseEvent) => {
    // Prevent the surrounding <Link> from navigating when clicking the button
    e.preventDefault();
    e.stopPropagation();
    // Ensure cart always receives a numeric price
    addItem({ ...(product as any), price });
  };

  return (
    <Link href={`/products/${(product as any).id}`}>
      <Card className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all">
        <div className="aspect-square overflow-hidden bg-muted">
          {hasImage ? (
            <img
              src={(product as any).imageUrl as string}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              data-testid={`img-product-${(product as any).id}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageOff className="h-6 w-6 mr-2" />
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>

        <CardContent className="p-6">
          <h3
            className="font-semibold text-lg mb-2 text-card-foreground line-clamp-2"
            data-testid={`text-product-name-${(product as any).id}`}
          >
            {name}
          </h3>

          {(product as any).description && (
            <p
              className="text-muted-foreground text-sm mb-3 line-clamp-2"
              data-testid={`text-product-description-${(product as any).id}`}
            >
              {(product as any).description}
            </p>
          )}

          <div className="flex items-center justify-between mb-4">
            <span
              className="text-2xl font-bold text-primary"
              data-testid={`text-price-${(product as any).id}`}
            >
              {format(price)}
            </span>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-muted-foreground">4.8 (124)</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <Badge
              variant={stock > 0 ? "secondary" : "destructive"}
              data-testid={`badge-stock-${(product as any).id}`}
            >
              {stock > 0 ? `${stock} in stock` : "Out of stock"}
            </Badge>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={stock <= 0}
            className="w-full"
            data-testid={`button-add-to-cart-${(product as any).id}`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Also export a default so pages can `import ProductCard from ...` */
export default ProductCard;
