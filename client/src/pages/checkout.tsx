import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCartStore } from "@/lib/cart";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/lib/currency";
import { site } from "@/config/site";

import {
  ShoppingBag,
  Truck,
  Shield,
  CreditCard,
  PhoneCall,
  Banknote,
  ChevronRight,
  Copy,
} from "lucide-react";

/** ---------- Types ---------- */
type Product = {
  id: string;
  name: string;
  price: number | string;
  imageUrl?: string;
  vendorId?: string | null;
};

type CheckoutForm = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
};

type PaymentMethod =
  | "orange_money"
  | "afrimoney"
  | "bank_transfer"
  | "cash_on_delivery"
  | "usd_card";

/** ---------- Utils ---------- */
const digits = (s: string) => s.replace(/\D/g, "");
const randomOrderRef = () =>
  `LWG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0")}`;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { format, currency } = useCurrency();
  const { items, clearCart } = useCartStore();

  // Load latest products so we have current prices
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: items.length > 0,
  });

  // Hydrate cart lines with product info
  const lines = useMemo(() => {
    return items
      .map((ci) => {
        const p = products.find((x) => x.id === ci.productId);
        if (!p) return null;
        const unit = Number(p.price ?? 0);
        return {
          id: ci.id,
          productId: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          quantity: ci.quantity,
          unitPrice: unit,
          lineTotal: unit * ci.quantity,
          vendorId: p.vendorId ?? null,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      productId: string;
      name: string;
      imageUrl?: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      vendorId: string | null;
    }>;
  }, [items, products]);

  // Totals
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = lines.length ? 0 : 0; // set a flat fee if you want
  const grandTotal = subtotal + shipping;

  // Form state (seed from localStorage for convenience)
  const [form, setForm] = useState<CheckoutForm>(() => {
    try {
      const saved = localStorage.getItem("lwg_checkout_contact");
      return (
        (saved && JSON.parse(saved)) || {
          fullName: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          notes: "",
        }
      );
    } catch {
      return {
        fullName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        notes: "",
      };
    }
  });

  const [method, setMethod] = useState<PaymentMethod>("orange_money");
  const [placing, setPlacing] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const valid =
    form.fullName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.address.trim() &&
    lines.length > 0;

  const saveContact = (next: Partial<CheckoutForm>) => {
    const updated = { ...form, ...next };
    setForm(updated);
    try {
      localStorage.setItem("lwg_checkout_contact", JSON.stringify(updated));
    } catch {}
  };

  /** ---------- Payment instructions (edit to your real accounts) ---------- */
  const payInfo = {
    orange_money: {
      title: "Orange Money (NLe)",
      acctName: "LWG Partners Network",
      number: site.supportPhone,
      note: "Send payment to the number above, include your Order Ref in the transfer note.",
    },
    afrimoney: {
      title: "AfriMoney (NLe)",
      acctName: "LWG Partners Network",
      number: site.supportPhone,
      note: "Send payment to the number above, include your Order Ref in the transfer note.",
    },
    bank_transfer: {
      title: "Bank Transfer (NLe)",
      bank: "Your Bank Name",
      acctName: "LWG Partners Network",
      acctNo: "000-000000-0",
      note: "Use your Order Ref as narration. Orders ship after funds are received.",
    },
    cash_on_delivery: {
      title: "Cash on Delivery",
      note: "Have the exact amount ready. Our rider will call before delivery.",
    },
    usd_card: {
      title: "USD Card (International)",
      note: "Coming soon. For now, choose a local method or contact support.",
    },
  } as const;

  /** ---------- Order submit (best-effort POST, always produce receipt) ---------- */
  const createOrder = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/orders", payload);
      // Even if server returns no body, we continue the flow
      try {
        return await res.json();
      } catch {
        return {};
      }
    },
  });

  const handlePlaceOrder = async () => {
    if (!valid) {
      toast({
        title: "Missing details",
        description: "Please complete your contact and address.",
        variant: "destructive",
      });
      return;
    }

    const ref = randomOrderRef();
    setPlacing(true);

    const payload = {
      ref,
      currency, // "NLe" or "USD" from your switcher
      totals: { subtotal, shipping, grandTotal },
      paymentMethod: method,
      contact: form,
      items: lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        vendorId: l.vendorId,
      })),
      notes: form.notes,
    };

    try {
      await createOrder.mutateAsync(payload);
      setOrderRef(ref);
      toast({ title: "Order placed", description: `Reference: ${ref}` });
      clearCart(); // clear now; remove this if you want to clear later
    } catch (e: any) {
      // Still allow user to send receipt
      setOrderRef(ref);
      toast({
        title: "Order saved locally",
        description:
          "We couldn't reach the server, but a receipt is ready to send via Email/WhatsApp.",
      });
    } finally {
      setPlacing(false);
    }
  };

  /** ---------- Receipt builders ---------- */
  const receiptLines = lines
    .map(
      (l) =>
        `• ${l.name}  x${l.quantity}  @ ${format(l.unitPrice)} = ${format(
          l.lineTotal,
        )}`,
    )
    .join("\n");

  const receiptText =
    `Order Ref: ${orderRef ?? "(pending)"}\n` +
    `Date: ${new Date().toLocaleString()}\n` +
    `Customer: ${form.fullName}\nPhone: ${form.phone}\nEmail: ${form.email}\nAddress: ${form.address}, ${form.city}\n\n` +
    `Items:\n${receiptLines}\n\n` +
    `Subtotal: ${format(subtotal)}\n` +
    `Shipping: ${format(shipping)}\n` +
    `Total: ${format(grandTotal)}\n` +
    `Currency: ${currency}\n` +
    `Payment Method: ${payInfo[method].title}\n\n` +
    `Notes: ${form.notes || "-"}`;

  const emailHref = `mailto:${site.supportEmail}?cc=${encodeURIComponent(
    form.email,
  )}&subject=${encodeURIComponent(
    `Order ${orderRef ?? "(pending)"} — ${site.shortName}`,
  )}&body=${encodeURIComponent(receiptText)}`;

  const waHref = site.supportPhone
    ? `https://wa.me/${digits(site.supportPhone)}?text=${encodeURIComponent(
        `*${site.name}* — Order ${orderRef ?? "(pending)"}\n\n${receiptText}`,
      )}`
    : undefined;

  if (!items.length) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">
          Add some items and return to checkout.
        </p>
        <Button asChild>
          <Link href="/categories">
            Continue shopping <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground">
          Secure checkout — pay in <strong>NLe</strong> or USD (optional).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer & payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Delivery</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Full Name</label>
                <Input
                  value={form.fullName}
                  onChange={(e) => saveContact({ fullName: e.target.value })}
                  placeholder="e.g., Jane K. Sesay"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => saveContact({ email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => saveContact({ phone: e.target.value })}
                  placeholder="+232 7x xxx xxx"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Address</label>
                <Input
                  value={form.address}
                  onChange={(e) => saveContact({ address: e.target.value })}
                  placeholder="Street & house number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">City / District</label>
                <Input
                  value={form.city}
                  onChange={(e) => saveContact({ city: e.target.value })}
                  placeholder="e.g., Freetown"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Order Notes (optional)</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => saveContact({ notes: e.target.value })}
                  placeholder="Any delivery instructions…"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment methods */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  "orange_money",
                  "afrimoney",
                  "bank_transfer",
                  "cash_on_delivery",
                  "usd_card",
                ] as PaymentMethod[]
              ).map((m) => {
                const active = method === m;
                const info = payInfo[m];
                return (
                  <div key={m} className="rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                        active ? "bg-muted/60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m === "orange_money" || m === "afrimoney" ? (
                          <PhoneCall className="h-4 w-4" />
                        ) : m === "bank_transfer" ? (
                          <Banknote className="h-4 w-4" />
                        ) : m === "cash_on_delivery" ? (
                          <Truck className="h-4 w-4" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        <span className="font-medium">{info.title}</span>
                      </div>
                      {active && <Badge variant="secondary">Selected</Badge>}
                    </button>

                    {/* Details */}
                    {active && (
                      <div className="px-4 pb-4 pt-2 text-sm space-y-2">
                        {"number" in info && info.number && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Pay to:</span>
                            <span className="font-medium">
                              {info.acctName} — {info.number}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(info.number!)
                                  .then(() => toast({ title: "Number copied" }))
                                  .catch(() =>
                                    toast({
                                      title: "Copy failed",
                                      description: "You can copy manually.",
                                    }),
                                  )
                              }
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {"bank" in info && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <span className="text-muted-foreground">Bank:</span>{" "}
                              <span className="font-medium">{info.bank}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Account:</span>{" "}
                              <span className="font-medium">{info.acctName}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">No.:</span>{" "}
                              <span className="font-medium">{info.acctNo}</span>
                            </div>
                          </div>
                        )}
                        <p className="text-muted-foreground">{info.note}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-auto pr-1">
                {lines.map((l) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <img
                      src={l.imageUrl}
                      alt={l.name}
                      className="w-12 h-12 rounded object-cover border"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.quantity} × {format(l.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{format(l.lineTotal)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{format(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{format(shipping)}</span>
                </div>
                <div className="flex justify-between text-base pt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">{format(grandTotal)}</span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                className="w-full"
                disabled={!valid || placing}
                data-testid="button-place-order"
              >
                {placing ? "Placing…" : "Place Order"}
              </Button>

              {orderRef && (
                <div className="space-y-2">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Order placed — Reference: {orderRef}</p>
                    <p className="text-muted-foreground">
                      Send the receipt to confirm payment and speed up processing.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button asChild variant="outline">
                      <a href={emailHref}>Email receipt (admin + you)</a>
                    </Button>
                    {waHref ? (
                      <Button asChild variant="outline">
                        <a href={waHref} target="_blank" rel="noopener noreferrer">
                          WhatsApp admin
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" />
                    Your info is used only for order processing.
                  </div>

                  <Button variant="ghost" className="w-full" onClick={() => setLocation("/")}>
                    Back to Home
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Truck className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Fast delivery</p>
                <p className="text-xs text-muted-foreground">
                  Most orders ship within 24–48 hours.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
