import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Bare sidene som kan vises uten innlogging. Alt annet sender besøkende til /login.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
