// client/src/pages/BecomeVendor.tsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || ""; // same-origin fallback

export default function BecomeVendor() {
  const { user } = useAuthStore();

  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // If auth state changes, keep email in sync (but keep it editable only when not signed in)
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  function requireEmail(): boolean {
    // email is required only if the user isn't signed in
    return !user?.id;
  }

  function validate(): string | null {
    if (!storeName.trim()) return "Store name is required.";
    if (requireEmail() && !email.trim()) return "Email is required if you’re not signed in.";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
    if (phone && phone.length > 40) return "Phone number looks too long.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    const err = validate();
    if (err) {
      setNotice({ type: "err", text: err });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendors/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          email: requireEmail() ? email.trim() : undefined,
          phone: phone || undefined,
          address: address || undefined,
          description: description || undefined,
          userId: user?.id ?? undefined,
        }),
      });

      // Try to read a helpful error payload if not ok
      const payload = await (async () => {
        try {
          return await res.json();
        } catch {
          return null;
        }
      })();

      if (!res.ok) {
        throw new Error(payload?.message || `Failed to submit application (HTTP ${res.status})`);
      }

      setNotice({
        type: "ok",
        text: "Application submitted! We’ll review it shortly.",
      });

      // Reset fields (respect logged-in email)
      setStoreName("");
      setPhone("");
      setAddress("");
      setDescription("");
      if (!user?.id) setEmail("");

    } catch (e: any) {
      setNotice({ type: "err", text: e?.message ?? "Submission failed" });
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
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {notice && (
              <div
                role="status"
                aria-live="polite"
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
              maxLength={120}
            />

            <Input
              type="email"
              placeholder="Email (required if not signed in)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={requireEmail()}
              disabled={!!user?.id} // use account email when signed in
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
              maxLength={200}
            />

            <Textarea
              placeholder="Brief description about your business… (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={1200}
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
