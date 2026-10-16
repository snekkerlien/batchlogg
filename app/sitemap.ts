import type { MetadataRoute } from "next";

const siteUrl = "https://batchlogg.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/recipes`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/abv-tools`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/download-app`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
