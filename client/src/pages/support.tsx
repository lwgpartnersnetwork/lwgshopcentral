import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { site } from "@/config/site";
import {
  HeartPulse,
  Mail,
  LifeBuoy,
  Home,
  Tag,
  Store,
  Phone,
} from "lucide-react";

type Health = { status: string } | undefined;

export default function Support() {
  // 1) System status (GET /api/health)
  const { data: health, isLoading } = useQuery<Health>({
    queryKey: ["/api/health"],
  });

  // 2) Simple mailto contact form (no backend)
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "General question",
    message: "",
    includeDiagnostics: true,
  });

  const openEmail = () => {
    const subject = `[${site.shortName}] ${form.topic}`;
    const diag = form.includeDiagnostics
      ? `

---
Diagnostics
URL: ${window.location.origin}
User-Agent: ${navigator.userAgent}
Time: ${new Date().toString()}
API Health: ${health?.status ?? "unknown"}`
      : "";

    const body = `Hello ${site.shortName} Support,

My name: ${form.name}
My email: ${form.email}

Topic: ${form.topic}

Message:
${form.message || "(write here)"}${diag}`;

    window.location.href = `mailto:${site.supportEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  const canSend =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.message.trim().length > 0;

  const statusOk = health?.status === "ok";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Support</h1>
        <p className="text-muted-foreground">
          We’re here to help. Contact {site.shortName} or browse quick links.
        </p>
      </div>

      {/* Status + Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Badge variant="secondary">Checking…</Badge>
            ) : statusOk ? (
              <Badge variant="secondary" data-testid="badge-status-ok">
                All systems operational
              </Badge>
            ) : (
              <Badge variant="destructive" data-testid="badge-status-degraded">
                Degraded / unknown
              </Badge>
            )}
            <p className="text-sm text-muted-foreground">
              API health endpoint: <code>/api/health</code>
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" /> Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/categories">
                  <Tag className="h-4 w-4 mr-2" /> Categories
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/become-vendor">
                  <Store className="h-4 w-4 mr-2" /> Become Vendor
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Your Name</label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Jane Doe"
                  data-testid="input-name"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Your Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="you@example.com"
                  data-testid="input-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Topic</label>
              <Input
                value={form.topic}
                onChange={(e) =>
                  setForm((f) => ({ ...f, topic: e.target.value }))
                }
                placeholder="General question"
                data-testid="input-topic"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Message</label>
              <Textarea
                rows={5}
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
                placeholder="Tell us what you need help with…"
                data-testid="input-message"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.includeDiagnostics}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    includeDiagnostics: e.target.checked,
                  }))
                }
              />
              Include diagnostics (URL, browser, time, API health)
            </label>

            {/* Button row (only the main button here) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <Button
                onClick={openEmail}
                disabled={!canSend}
                data-testid="button-send-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email {site.shortName} Support
              </Button>
            </div>

            {/* Contact detail block UNDER the button (mobile-friendly) */}
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${site.supportEmail}`}
                  className="underline break-all"
                >
                  {site.supportEmail}
                </a>
              </div>
              {site.supportPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${site.supportPhone}`} className="underline">
                    {site.supportPhone}
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <a
                    href={`https://wa.me/${site.supportPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lightweight FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer font-medium">
              I became a vendor. Why can’t I add products?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              New vendors start as <strong>Pending</strong>. An admin must
              approve you on <code>/admin-dashboard</code>. Once approved, the
              “Add New Product” button becomes active on{" "}
              <code>/vendor-dashboard</code>.
            </p>
          </details>

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer font-medium">
              The site is up but products don’t show.
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Make sure your API is reachable and tables exist. Check{" "}
              <code>/api/health</code>. If you’re a vendor, add a product from{" "}
              <code>/vendor-dashboard</code>.
            </p>
          </details>

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer font-medium">
              How do I contact support quickly?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the email button above. Including diagnostics helps us fix the
              issue faster.
            </p>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
