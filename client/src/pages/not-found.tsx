// client/src/pages/not-found.tsx
import * as React from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  const [path] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-404-title">
            404 — Page Not Found
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground text-center">
            We couldn’t find the page you were looking for.
            {path ? (
              <>
                {" "}
                Missing route:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                  {path}
                </code>
              </>
            ) : null}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild data-testid="button-go-home">
              <Link href="/">Go to Home</Link>
            </Button>
            <Button asChild variant="outline" data-testid="button-browse-categories">
              <Link href="/categories">Browse Categories</Link>
            </Button>
            <Button asChild variant="ghost" data-testid="button-contact-support">
              <Link href="/support">Contact Support</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.history.back()}
              className="hidden sm:inline-flex"
              data-testid="button-go-back"
              title="Go back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            If you’re a developer, make sure this page is added to the router in{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">client/src/App.tsx</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
