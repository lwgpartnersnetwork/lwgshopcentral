import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { useCurrency } from "@/lib/currency";

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, clearCart } =
    useCartStore();
  const [, setLocation] = useLocation();
  const { format } = useCurrency(); // ✅ currency formatter (NLe-first)

  // Pull product details so we can show names/prices/images
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
    enabled: items.length > 0,
  });

  // Join cart lines with the product records (and drop any missing)
  const cartItemsWithProducts = items
    .map((item) => {
      const product = products.find((p: any) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter(Boolean) as Array<{
    id: string;
    productId: string;
    quantity: number;
    product: any;
  }>;

  // Compute total (numbers only, even if API sends strings)
  const totalPrice = cartItemsWithProducts.reduce((sum, item) => {
    const unit = Number(item.product?.price ?? 0);
    return sum + unit * item.quantity;
  }, 0);

  const dec = (id: string, qty: number) =>
    updateQuantity(id, Math.max(1, qty - 1));
  const inc = (id: string, qty: number) => updateQuantity(id, qty + 1);

  const handleCheckout = () => {
    closeCart();
    setLocation("/checkout");
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent side="right" className="w-full max-w-md overflow-x-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span>Shopping Cart</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {cartItemsWithProducts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto py-6 space-y-4">
                {cartItemsWithProducts.map((item) => {
                  const unit = Number(item.product?.price ?? 0);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 pb-4 border-b border-border"
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-medium text-sm truncate"
                          data-testid={`text-cart-item-name-${item.id}`}
                        >
                          {item.product.name}
                        </h3>
                        <p
                          className="text-sm text-muted-foreground"
                          data-testid={`text-cart-item-price-${item.id}`}
                        >
                          {format(unit)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dec(item.id, item.quantity)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 rounded-full p-0"
                          data-testid={`button-decrease-quantity-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span
                          className="text-sm w-8 text-center"
                          data-testid={`text-quantity-${item.id}`}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => inc(item.id, item.quantity)}
                          className="w-8 h-8 rounded-full p-0"
                          data-testid={`button-increase-quantity-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 rounded-full p-0 text-destructive hover:text-destructive"
                          data-testid={`button-remove-item-${item.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Footer */}
              <div className="border-t border-border pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span
                    className="text-2xl font-bold text-primary"
                    data-testid="text-cart-total"
                  >
                    {format(totalPrice)}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full"
                  size="lg"
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                </Button>
                <Button
                  onClick={clearCart}
                  variant="outline"
                  className="w-full"
                  data-testid="button-clear-cart"
                >
                  Clear Cart
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CartSidebar;
