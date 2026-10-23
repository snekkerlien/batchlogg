export const ACQUISITION_SOURCES = [
  "direct",
  "search",
  "social",
  "referral",
  "campaign",
  "other",
] as const;

export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export function getAcquisitionSource(value: unknown): AcquisitionSource | null {
  return typeof value === "string" &&
    ACQUISITION_SOURCES.includes(value as AcquisitionSource)
    ? value as AcquisitionSource
    : null;
}

export function inferAcquisitionSource(
  referrer: string,
  search: string,
  currentHost: string
): AcquisitionSource {
  const params = new URLSearchParams(search);
  const utmSource = params.get("utm_source")?.toLowerCase().trim() ?? "";
  const utmMedium = params.get("utm_medium")?.toLowerCase().trim() ?? "";
  const hasCampaign = ["utm_source", "utm_medium", "utm_campaign"].some(
    (key) => Boolean(params.get(key)?.trim())
  );

  let hostname = "";
  if (utmSource) {
    hostname = utmSource;
  } else if (referrer) {
    try {
      hostname = new URL(referrer).hostname.toLowerCase();
    } catch {
      return "other";
    }
  }

  if (!hostname || hostname === currentHost.toLowerCase()) return "direct";
  const matchesDomain = (domain: string) =>
    hostname === domain || hostname.endsWith(`.${domain}`);
  if (
    ["google", "bing", "duckduckgo", "yahoo", "ecosia", "baidu"].some(matchesDomain) ||
    /(^|\.)google\./.test(hostname) ||
    /(^|\.)bing\./.test(hostname) ||
    /(^|\.)duckduckgo\./.test(hostname) ||
    /(^|\.)yahoo\./.test(hostname) ||
    /(^|\.)ecosia\./.test(hostname) ||
    /(^|\.)baidu\./.test(hostname)
  ) {
    return "search";
  }
  if (
    [
      "facebook.com",
      "instagram.com",
      "tiktok.com",
      "youtube.com",
      "reddit.com",
      "x.com",
      "twitter.com",
      "linkedin.com",
      "pinterest.com",
      "facebook",
      "instagram",
      "tiktok",
      "youtube",
      "reddit",
      "x",
      "twitter",
      "linkedin",
      "pinterest",
    ].some(matchesDomain)
  ) {
    return "social";
  }
  if (hasCampaign || ["email", "newsletter"].includes(utmMedium)) return "campaign";
  return referrer || utmSource ? "referral" : "direct";
}

export function inferAcquisitionSourceFromRequest(
  referrer: string,
  requestUrl: string
): AcquisitionSource {
  try {
    const request = new URL(requestUrl);
    const referringPage = referrer ? new URL(referrer) : null;
    return inferAcquisitionSource(
      referrer,
      referringPage?.search ?? request.search,
      request.hostname
    );
  } catch {
    return "other";
  }
}
