import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Laptop, 
  Shirt, 
  House, 
  Gamepad2, 
  Book, 
  Baby,
  ArrowRight 
} from 'lucide-react';
import { Link } from 'wouter';

const categories = [
  { id: '1', name: 'Electronics', icon: Laptop, color: 'bg-primary/10 text-primary' },
  { id: '2', name: 'Fashion', icon: Shirt, color: 'bg-accent/10 text-accent' },
  { id: '3', name: 'Home & Garden', icon: House, color: 'bg-primary/10 text-primary' },
  { id: '4', name: 'Sports', icon: Gamepad2, color: 'bg-accent/10 text-accent' },
  { id: '5', name: 'Books', icon: Book, color: 'bg-primary/10 text-primary' },
  { id: '6', name: 'Kids & Baby', icon: Baby, color: 'bg-accent/10 text-accent' },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: selectedCategory ? ['/api/products', { categoryId: selectedCategory }] : ['/api/products'],
  });

  const { data: categoriesData = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="text-hero-title">
            Discover Amazing Products
          </h1>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto" data-testid="text-hero-description">
            Shop from thousands of verified vendors worldwide. Quality guaranteed, fast shipping, best prices.
          </p>
          <Button 
            size="lg" 
            className="bg-background text-foreground hover:bg-background/90"
            data-testid="button-start-shopping"
          >
            Start Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12" data-testid="text-categories-title">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card 
                  key={category.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`card-category-${category.id}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${category.color}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-card-foreground">{category.name}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold" data-testid="text-products-title">
              {selectedCategory ? 'Filtered Products' : 'Featured Products'}
            </h2>
            <div className="flex space-x-4">
              {selectedCategory && (
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCategory(null)}
                  data-testid="button-clear-filter"
                >
                  Clear Filter
                </Button>
              )}
              <Button variant="ghost" data-testid="button-view-all">
                View All
              </Button>
            </div>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-square w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg" data-testid="text-no-products">
                No products found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6" data-testid="text-cta-title">
            Want to sell on our platform?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-cta-description">
            Join thousands of successful vendors and reach millions of customers worldwide.
          </p>
          <Button size="lg" asChild data-testid="button-become-vendor">
            <Link href="/vendor-register">
              Become a Vendor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
