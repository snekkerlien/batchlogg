import type { MetadataRoute } from "next";

const siteUrl = "https://batchlogg.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/members/*/recipes/"],
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/batch-history/",
        "/community/",
        "/dashboard/",
        "/inventory/",
        "/kar/",
        "/members",
        "/my-recipes",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
