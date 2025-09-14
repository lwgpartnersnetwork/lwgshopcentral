// client/src/pages/become-vendor.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/lib/auth";

export default function BecomeVendor() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) {
      toast({ title: "Store name is required", variant: "destructive" });
      return;
    }
    if (!user?.id && !email.trim()) {
      toast({
        title: "Email is required",
        description: "Provide an email if you’re not signed in.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/vendors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          description: description || undefined,
          userId: user?.id ?? undefined, // optional
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit application");
      }

      toast({
        title: "Application submitted!",
        description: "We’ll review your vendor application shortly.",
      });

      // reset
      setStoreName("");
      setPhone("");
      setAddress("");
      setDescription("");
      if (!user?.id) setEmail("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "Failed to submit vendor application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Become a Vendor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Register your store and start selling on MarketPlace Pro.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              placeholder="Store Name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />

            {/* Email is optional when logged in; required if guest */}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              placeholder="Business Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <Textarea
              placeholder="Brief description about your business…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Submitting…" : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
