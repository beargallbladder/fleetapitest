import { NextResponse } from "next/server";

export const runtime = "edge";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
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

    const data = await res.json();
    return NextResponse.json(data, {
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

