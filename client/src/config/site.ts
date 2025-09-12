// client/src/config/site.ts
import logoLight from "@/assets/lwg-logo-yellow.png";
import logoDark from "@/assets/lwg-logo-blue.png";

export const site = {
  name: "LWG MarketPlace",
  shortName: "LWG",
  tagline: "Partners Network — trusted vendors, real value.",
  supportEmail: "lwgpartnersnetwork@gmail.com",
  logo: {
    light: logoLight, // used on light backgrounds
    dark: logoDark, // used on dark backgrounds
  },
} as const;
