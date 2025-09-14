import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";

export default function BecomeVendor() {
  const { user } = useAuthStore();

  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    if (!storeName.trim()) {
      setNotice({ type: "err", text: "Store name is required" });
      return;
    }
    if (!user?.id && !email.trim()) {
      setNotice({
        type: "err",
        text: "Email is required if you’re not signed in",
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
          userId: user?.id ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || "Failed to submit application");

      setNotice({
        type: "ok",
        text: "Application submitted! We’ll review it shortly.",
      });
      setStoreName("");
      setPhone("");
      setAddress("");
      setDescription("");
      if (!user?.id) setEmail("");
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message ?? "Submission failed" });
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
            {notice && (
              <div
                className={`rounded-md p-3 text-sm ${
                  notice.type === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {notice.text}
              </div>
            )}

            <Input
              placeholder="Store Name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />

            <Input
              type="email"
              placeholder="Email (required if not signed in)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              placeholder="Phone Number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              placeholder="Business Address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <Textarea
              placeholder="Brief description about your business… (optional)"
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
