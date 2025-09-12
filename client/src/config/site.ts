// client/src/config/site.ts

export type SiteConfig = {
  name: string;
  shortName: string;
  tagline: string;
  supportEmail: string;
  /** Optional phone / WhatsApp contact shown on Support page */
  supportPhone?: string;
  logoBlue: string;
  logoYellow: string;
  favicon16: string;
  favicon32: string;
};

export const site: SiteConfig = {
  name: "LWG MarketPlace",
  shortName: "LWG",
  tagline:
    "Trusted vendors. Real value. Shop from thousands of verified vendors worldwide.",

  // ✅ Official support contacts
  supportEmail: "info@lwgpartnersnetwork.com",
  supportPhone: "+23272146015",

  // public/ assets (served from the site root)
  logoBlue: "/lwg-logo-blue.png",
  logoYellow: "/lwg-logo-yellow.png",
  favicon16: "/favicon-16x16.png",
  favicon32: "/favicon-32x32.png",
};

export default site;
