import type { MetadataRoute } from "next";

// Search engines may index the public site, never the admin or private host pages.
export default function robots(): MetadataRoute.Robots {
  const site = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/host", "/setup", "/submit-event/thanks"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
