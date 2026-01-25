import { NextResponse } from "next/server";

export const runtime = "edge";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const apiBase = process.env.JERICHO_API_BASE || "https://jericho-api-48gl.onrender.com";
  const apiKey = process.env.JERICHO_API_KEY;
  if (!apiKey) return jsonError("Server missing JERICHO_API_KEY", 500);

  const upstreamUrl = new URL("/v1/catalog", apiBase);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(upstreamUrl.toString(), {
      headers: { "x-api-key": apiKey },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return jsonError(
        `Upstream parts API error (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
        502
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, {
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

