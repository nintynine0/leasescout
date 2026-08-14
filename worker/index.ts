/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type Deal = {
  id: string; location: string; year: number; brand: string; model: string; trim: string;
  msrp: number; monthlyPayment: number; termMonths: number; dueUpfront: number;
  milesPerYear: number | null; expires: string | null; sourceUrl: string; imageUrl: string | null; incentive: string | null; rebateMonthly: number | null;
};

const PND_URL = "https://pnd.leasehackr.com/";
const PND_REGIONS = ["California", "Northeast", "Mid-Atlantic", "South", "West", "Northwest", "Midwest"];
const STATES = ["Alabama", "Arizona", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Illinois", "Indiana", "Kansas", "Kentucky", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Missouri", "Nevada", "New Jersey", "New York", "North Carolina", "Ohio", "Oregon", "Pennsylvania", "Tennessee", "Texas", "Virginia", "Washington"];

function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"').replace(/&[a-z]+;/gi, " ")
    .replace(/\r/g, "").replace(/\n[ \t]*\n+/g, "\n");
}
function dollar(input: string | undefined) { return Number((input || "").replace(/[$,]/g, "")) || 0; }
function decodeEntities(value: string) {
  return value.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'").replace(/&nbsp;/gi, " ");
}
function field(card: string, className: string) {
  return decodeEntities(card.match(new RegExp(`<[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"))?.[1].replace(/<[^>]+>/g, "").trim() || "");
}
function parseDeals(html: string): Deal[] {
  const result: Deal[] = [];
  for (const card of html.split(/<div class="deal_card\b[^>]*>/i).slice(1)) {
    const year = Number(field(card, "model_yr_val")); const brand = field(card, "make_val");
    const model = field(card, "model_val"); const trim = field(card, "trim_val");
    const msrp = dollar(field(card, "msrp_val")); const monthlyPayment = dollar(field(card, "monthly_val"));
    const termMonths = Number(field(card, "term_val")); const dueUpfront = dollar(field(card, "das_val"));
    if (!year || !brand || !model || !msrp || !monthlyPayment || !termMonths || !dueUpfront) continue;
    const href = card.match(/<a href="([^"]+)" class="calc_val"/i)?.[1]?.replace(/&amp;/g, "&") || PND_URL;
    const imageUrl = card.match(/<img[^>]+class="[^"]*\bimg_url_val\b[^"]*"[^>]+src="([^"]+)"/i)?.[1] || null;
    const incentiveName = field(card, "con_name_val"); const incentiveMonthly = dollar(field(card, "con_monthly_val"));
    const genericIncentive = /^conditional incentive$/i.test(incentiveName);
    const incentive = incentiveName && !genericIncentive ? `${incentiveMonthly ? `$${incentiveMonthly}/mo · ` : "Rebate · "}${incentiveName}` : null;
    const deal: Deal = { id: `${year}-${brand}-${model}-${monthlyPayment}-${termMonths}`.replace(/\W+/g, "-").toLowerCase(), location: field(card, "state_val") || "Location varies", year, brand, model, trim, msrp, monthlyPayment, termMonths, dueUpfront, milesPerYear: Number(field(card, "mileage_val").replace(/,/g, "")) || null, expires: field(card, "exp_date_val") || null, sourceUrl: href, imageUrl, incentive, rebateMonthly: incentiveMonthly || null };
    if (!result.some(d => d.id === deal.id)) result.push(deal);
  }
  return result;
}

async function liveDeals() {
  const responses = await Promise.all(PND_REGIONS.map(async region => {
    const response = await fetch(`${PND_URL}r/${encodeURIComponent(region)}`, { headers: { "User-Agent": "Lease-Scout/1.0 (public-offer-analysis)", "Accept": "text/html" }, cf: { cacheTtl: 300, cacheEverything: true } });
    if (!response.ok) throw new Error(`Leasehackr ${region} responded with ${response.status}.`);
    return parseDeals(await response.text());
  }));
  const deals = responses.flat().filter((deal, index, array) => array.findIndex(item => item.id === deal.id) === index);
  if (!deals.length) throw new Error("The current Leasehackr page could not be read. Please try again shortly.");
  return deals;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/deals") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      try {
        const deals = await liveDeals();
        return Response.json({ deals, fetchedAt: new Date().toISOString(), source: PND_URL }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Unable to load live offers." }, { status: 502, headers: { "Cache-Control": "no-store" } });
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
