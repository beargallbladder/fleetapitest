import { NextResponse } from "next/server";

export const runtime = "edge";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const apiBase = process.env.JERICHO_API_BASE || "https://jericho-api-48gl.onrender.com";
  const upstreamUrl = new URL("/v1/health", apiBase);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(upstreamUrl.toString(), {
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, {
      status: res.status,
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

