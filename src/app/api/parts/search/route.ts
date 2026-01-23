import { NextResponse } from "next/server";

export const runtime = "edge";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

type JerichoDealer = {
  dealerId: string;
  dealerName: string;
  distanceMiles: number;
  available: number;
  webPrice: number;
  // other fields exist but we don't need them in the UI right now
};

type JerichoPart = {
  partNumber: string;
  description: string;
  longDescription?: string;
  categoryId?: string;
  subcategoryId?: string;
  listPrice: number;
  dealers: JerichoDealer[];
};

type JerichoSearchResponse = {
  totalResults?: number;
  page?: number;
  pageSize?: number;
  parts: JerichoPart[];
};

function toUiResponse(data: JerichoSearchResponse) {
  return {
    totalResults: typeof data.totalResults === "number" ? data.totalResults : data.parts.length,
    page: typeof data.page === "number" ? data.page : 1,
    pageSize: typeof data.pageSize === "number" ? data.pageSize : data.parts.length,
    parts: (data.parts || []).map((p) => ({
      partNumber: p.partNumber,
      // Our UI expects "name" + "brand"; Jericho doesn't provide brand, so default to Ford/OEM.
      name: p.description,
      brand: "Ford",
      description: p.longDescription || p.description,
      category: p.categoryId || "",
      subcategory: p.subcategoryId || "",
      imageUrl: "",
      listPrice: p.listPrice,
      dealers: (p.dealers || []).map((d) => ({
        dealerId: d.dealerId,
        name: d.dealerName,
        distance: d.distanceMiles,
        webPrice: d.webPrice,
        stock: d.available,
      })),
    })),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const keyword = (url.searchParams.get("keyword") || "").trim();
  const zipCode = (url.searchParams.get("zipCode") || "").trim();
  const page = url.searchParams.get("page") || "1";
  const pageSize = url.searchParams.get("pageSize") || "10";

  if (!keyword) return jsonError("Missing required param: keyword", 400);
  if (!zipCode) return jsonError("Missing required param: zipCode", 400);

  const apiBase = process.env.JERICHO_API_BASE || "https://jericho-api-48gl.onrender.com";
  const apiKey = process.env.JERICHO_API_KEY;
  if (!apiKey) return jsonError("Server missing JERICHO_API_KEY", 500);

  const upstreamUrl = new URL("/v1/parts/search", apiBase);
  upstreamUrl.searchParams.set("keyword", keyword);
  upstreamUrl.searchParams.set("zipCode", zipCode);
  upstreamUrl.searchParams.set("page", page);
  upstreamUrl.searchParams.set("pageSize", pageSize);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(upstreamUrl.toString(), {
      headers: { "x-api-key": apiKey },
      signal: controller.signal,
      // Keep fresh-ish for demos; adjust as needed.
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return jsonError(`Upstream parts API error (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`, 502);
    }

    const data = (await res.json()) as JerichoSearchResponse;
    return NextResponse.json(toUiResponse(data), {
      status: 200,
      headers: {
        // Prevent shared/proxy caching of potentially sensitive commercial data
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "Upstream parts API timeout"
        : "Upstream parts API request failed";
    return jsonError(msg, 502);
  } finally {
    clearTimeout(timeout);
  }
}

