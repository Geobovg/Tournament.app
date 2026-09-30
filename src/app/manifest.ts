import type { MetadataRoute } from "next";
import { getT } from "@/i18n/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getT();
  return {
    name: "Send it!",
    short_name: "Send it!",
    description: t.common.manifestDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
