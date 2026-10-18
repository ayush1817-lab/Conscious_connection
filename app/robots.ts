import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/links";

// Search engines may index the public site, never the admin or private host pages.
export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/host", "/setup"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
