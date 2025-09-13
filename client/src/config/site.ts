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

  // Support contacts
  supportEmail: "info@lwgpartnersnetwork.com",
  supportPhone: "+23272146015",

  // Public assets in /client/public (must match filenames exactly)
  // Use the timestamped names you provided
  logoBlue: "/lwg-logo-blue.png_17576414729992.png",
  logoYellow: "/lwg-logo-yellow.png_1757641586275.png",

  // Use the same favicon file for both sizes for now
  favicon16: "/lwg-favicon.png_1757641803765.png",
  favicon32: "/lwg-favicon.png_1757641803765.png",
};

export default site;
