import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Invitasjonslenker skal ikke havne i søkeresultater, og innloggingsflytene har ingenting å vise.
      disallow: ["/join/", "/auth/", "/reset-code", "/forgot-code"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
