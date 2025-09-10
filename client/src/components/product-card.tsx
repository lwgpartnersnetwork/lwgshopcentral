import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/lib/cart';
import { Star, ShoppingCart } from 'lucide-react';
import { Link } from 'wouter';
import type { Product } from '@shared/schema';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all">
        <div className="aspect-square overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            data-testid={`img-product-${product.id}`}
          />
        </div>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-2 text-card-foreground line-clamp-2" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2" data-testid={`text-product-description-${product.id}`}>
            {product.description}
          </p>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary" data-testid={`text-price-${product.id}`}>
              ${parseFloat(product.price).toFixed(2)}
            </span>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-muted-foreground">4.8 (124)</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <Badge variant={product.stock > 0 ? "secondary" : "destructive"} data-testid={`badge-stock-${product.id}`}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </Badge>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="w-full"
            data-testid={`button-add-to-cart-${product.id}`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
