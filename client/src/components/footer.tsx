import { Link } from "wouter";
import { Mail, Phone, ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();
  const wa = site.supportPhone?.replace(/\D/g, "");

  return (
    <footer className="mt-16 border-t bg-background">
      {/* Top section */}
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        {/* Brand + tagline */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src={site.logoBlue}
              alt={`${site.shortName} logo`}
              loading="lazy"
              decoding="async"
              className="h-10 w-auto"
              onError={(e) => {
                // Fallback to yellow if the blue logo 404s (e.g., hashed filename mismatch)
                const img = e.currentTarget;
                if (img.src !== window.location.origin + site.logoYellow) {
                  img.src = site.logoYellow;
                } else {
                  // if even the fallback fails, hide the broken image
                  img.style.display = "none";
                }
              }}
            />
            <span className="text-lg font-bold">{site.name}</span>
          </Link>
          <p className="text-sm text-muted-foreground">{site.tagline}</p>
        </div>

        {/* Explore links */}
        <nav className="space-y-2">
          <h3 className="font-semibold">Explore</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/categories">Categories</Link>
            </li>
            <li>
              <Link href="/become-vendor">Become Vendor</Link>
            </li>
            <li>
              <Link href="/support">Support</Link>
            </li>
          </ul>
        </nav>

        {/* Contact */}
        <div className="space-y-2">
          <h3 className="font-semibold">Contact</h3>
          <div className="text-sm space-y-2">
            <a
              href={`mailto:${site.supportEmail}`}
              className="inline-flex items-center gap-2 underline break-all"
            >
              <Mail className="h-4 w-4" />
              {site.supportEmail}
            </a>

            {site.supportPhone && (
              <div className="flex flex-col">
                <a
                  href={`tel:${site.supportPhone}`}
                  className="inline-flex items-center gap-2 underline"
                >
                  <Phone className="h-4 w-4" />
                  {site.supportPhone}
                </a>
                {wa && (
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline mt-1"
                    aria-label="Chat with us on WhatsApp"
                  >
                    WhatsApp chat
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Vendor CTA */}
        <div className="space-y-3">
          <h3 className="font-semibold">Vendor?</h3>
          <p className="text-sm text-muted-foreground">
            Join thousands of vendors selling on {site.shortName}.
          </p>
          <Link
            href="/become-vendor"
            className="inline-flex items-center gap-2 text-sm font-medium underline"
          >
            Start selling <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="container mx-auto px-4 py-6 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-3">
          <p>
            © {year} {site.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/support" className="underline">
              Privacy & Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
