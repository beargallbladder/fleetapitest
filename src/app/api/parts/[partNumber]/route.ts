import { NextResponse } from "next/server";
import { normalizeZip } from "@/lib/zip";

export const runtime = "edge";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ partNumber: string }> }
) {
  const { partNumber } = await ctx.params;
  const pn = decodeURIComponent(String(partNumber || "").trim());
  if (!pn) return jsonError("Missing partNumber", 400);

  const url = new URL(req.url);
  const zipCode = normalizeZip(url.searchParams.get("zipCode"));

  const apiBase = process.env.JERICHO_API_BASE || "https://jericho-api-48gl.onrender.com";
  const apiKey = process.env.JERICHO_API_KEY;
  if (!apiKey) return jsonError("Server missing JERICHO_API_KEY", 500);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  // 1) Try upstream part details (if supported).
  const upstreamDetailsUrl = new URL(`/v1/parts/${encodeURIComponent(pn)}`, apiBase);

  try {
    const detailsRes = await fetch(upstreamDetailsUrl.toString(), {
      headers: { "x-api-key": apiKey },
      signal: controller.signal,
      cache: "no-store",
    });

    if (detailsRes.ok) {
      const details = await detailsRes.json().catch(() => ({}));
      return NextResponse.json(details, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // 2) Fallback: use upstream search + exact match (works even if details endpoint isn't available).
    const upstreamSearchUrl = new URL("/v1/parts/search", apiBase);
    upstreamSearchUrl.searchParams.set("keyword", pn);
    upstreamSearchUrl.searchParams.set("zipCode", zipCode);
    upstreamSearchUrl.searchParams.set("page", "1");
    upstreamSearchUrl.searchParams.set("pageSize", "25");

    const searchRes = await fetch(upstreamSearchUrl.toString(), {
      headers: { "x-api-key": apiKey },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!searchRes.ok) {
      const body = await searchRes.text().catch(() => "");
      return jsonError(
        `Upstream parts API error (${searchRes.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
        502
      );
    }

    const data = (await searchRes.json().catch(() => ({}))) as {
      parts?: Array<{ partNumber?: string }>;
    };
    const parts = Array.isArray(data.parts) ? data.parts : [];
    const match =
      parts.find((p) => String(p.partNumber || "").toUpperCase() === pn.toUpperCase()) || null;

    if (!match) return jsonError("Part not found", 404);

    return NextResponse.json(match, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
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

