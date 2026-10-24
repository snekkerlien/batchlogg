import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import https from "node:https";
import type { LookupAddress, LookupOptions } from "node:dns";
import { normalizeOptionalUrl } from "@/lib/brewery/access";

const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 5_000;

const blockedAddresses = new BlockList();
for (const subnet of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(subnet[0], subnet[1], "ipv4");
}
for (const subnet of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedAddresses.addSubnet(subnet[0], subnet[1], "ipv6");
}
const globalIpv6Addresses = new BlockList();
globalIpv6Addresses.addSubnet("2000::", 3, "ipv6");

type PinnedAddress = LookupAddress;

async function resolvePublicAddress(hostname: string): Promise<PinnedAddress> {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address, family }) => {
      const actualFamily = isIP(address);
      return (
        actualFamily !== family ||
        blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6") ||
        (family === 6 && !globalIpv6Addresses.check(address, "ipv6"))
      );
    })
  ) {
    throw new Error("Product page host is not publicly reachable.");
  }
  return addresses[0];
}

function getHtml(url: URL, pinnedAddress: PinnedAddress): Promise<{
  status: number;
  location: string | null;
  contentType: string;
  html: string;
}> {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({
      lookup(
        hostname: string,
        _options: LookupOptions,
        callback: (
          error: NodeJS.ErrnoException | null,
          address: string | LookupAddress[],
          family?: number
        ) => void
      ) {
        if (hostname !== url.hostname) {
          callback(Object.assign(new Error("Unexpected product page host."), { code: "EINVAL" }), "", 0);
          return;
        }
        callback(null, pinnedAddress.address, pinnedAddress.family);
      },
    });
    const request = https.get(
      url,
      {
        agent,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "BatchloggPriceSuggestion/1.0",
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location ?? null;
        const contentType = response.headers["content-type"] ?? "";
        if (status >= 300 && status < 400) {
          response.resume();
          response.once("end", () => {
            agent.destroy();
            resolve({ status, location, contentType, html: "" });
          });
          return;
        }
        if (
          !contentType.toLowerCase().includes("text/html") &&
          !contentType.toLowerCase().includes("application/xhtml+xml")
        ) {
          response.resume();
          response.once("end", () => {
            agent.destroy();
            resolve({ status, location, contentType, html: "" });
          });
          return;
        }
        const declaredLength = Number(response.headers["content-length"] ?? 0);
        if (declaredLength > MAX_RESPONSE_BYTES) {
          request.destroy(new Error("Product page is too large to inspect."));
          return;
        }
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += buffer.length;
          if (totalBytes > MAX_RESPONSE_BYTES) {
            request.destroy(new Error("Product page is too large to inspect."));
            return;
          }
          chunks.push(buffer);
        });
        response.once("end", () => {
          agent.destroy();
          resolve({
            status,
            location,
            contentType,
            html: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    request.once("timeout", () => request.destroy(new Error("Product page request timed out.")));
    request.once("error", (error) => {
      agent.destroy();
      reject(error);
    });
  });
}

function findOffer(value: unknown): { amount: number; currency: string } | null {
  const pending: unknown[] = [value];
  while (pending.length) {
    const current = pending.pop();
    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }
    if (typeof current !== "object" || current === null) continue;
    const record = current as Record<string, unknown>;
    const amount =
      typeof record.price === "number" || typeof record.price === "string"
        ? String(record.price).trim()
        : "";
    const currency =
      typeof record.priceCurrency === "string"
        ? record.priceCurrency.trim().toUpperCase()
        : "";
    if (/^\d{1,10}(?:\.\d{1,2})?$/.test(amount) && /^[A-Z]{3}$/.test(currency)) {
      const parsedAmount = Number(amount);
      if (Number.isFinite(parsedAmount) && parsedAmount < 10_000_000_000) {
        return { amount: parsedAmount, currency };
      }
    }
    for (const key of ["@graph", "offers", "priceSpecification"]) {
      if (record[key] !== undefined) pending.push(record[key]);
    }
  }
  return null;
}

function findMetadataPrice(html: string) {
  const metadata = new Map<string, string>();
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = new Map<string, string>();
    for (const attribute of tag[0].matchAll(
      /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
    )) {
      attributes.set(
        attribute[1].toLowerCase(),
        attribute[2] ?? attribute[3] ?? attribute[4] ?? ""
      );
    }
    const key = (
      attributes.get("property") ??
      attributes.get("name") ??
      attributes.get("itemprop") ??
      ""
    ).toLowerCase();
    const content = attributes.get("content");
    if (key && content) metadata.set(key, content.trim());
  }
  const amount =
    metadata.get("product:price:amount") ??
    metadata.get("og:price:amount") ??
    metadata.get("price");
  const currency =
    metadata.get("product:price:currency") ??
    metadata.get("og:price:currency") ??
    metadata.get("pricecurrency");
  if (!amount || !currency || !/^\d{1,10}(?:\.\d{1,2})?$/.test(amount)) return null;
  const parsedAmount = Number(amount);
  const normalizedCurrency = currency.toUpperCase();
  return Number.isFinite(parsedAmount) &&
    parsedAmount < 10_000_000_000 &&
    /^[A-Z]{3}$/.test(normalizedCurrency)
    ? { amount: parsedAmount, currency: normalizedCurrency }
    : null;
}

function findStructuredPrice(html: string) {
  for (const script of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const result = findOffer(JSON.parse(script[1]));
      if (result) return result;
    } catch {
      // Ignore malformed JSON-LD and continue checking other product metadata.
    }
  }
  return null;
}

export async function detectProductPrice(value: unknown) {
  const normalizedUrl = normalizeOptionalUrl(value);
  if (!normalizedUrl) throw new Error("Enter a valid product page URL.");
  let url = new URL(normalizedUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      isIP(url.hostname) ||
      /(?:^|\.)(?:localhost|local|internal)$/i.test(url.hostname)
    ) {
      throw new Error("Only public HTTPS product links can be checked.");
    }
    const pinnedAddress = await resolvePublicAddress(url.hostname);
    const page = await getHtml(url, pinnedAddress);
    if (page.status >= 300 && page.status < 400 && page.location) {
      if (redirect === MAX_REDIRECTS) {
        throw new Error("Product page redirected too many times.");
      }
      url = new URL(page.location, url);
      continue;
    }
    if (page.status < 200 || page.status >= 300) {
      throw new Error("The product page could not be read.");
    }
    const price = findStructuredPrice(page.html) ?? findMetadataPrice(page.html);
    if (!price) {
      throw new Error("No supported public price metadata was found on that page.");
    }
    return price;
  }
  throw new Error("Product page redirected too many times.");
}
