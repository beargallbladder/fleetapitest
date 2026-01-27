import { NextResponse } from "next/server";

export const runtime = "edge";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function needsApiKey(pathname: string) {
  // Health is publicly reachable; everything else is key-gated in practice.
  return !pathname.startsWith("/v1/health");
}

async function proxy(req: Request, upstreamPath: string) {
  const apiBase = process.env.JERICHO_API_BASE || "https://jericho-api-48gl.onrender.com";
  const apiKey = process.env.JERICHO_API_KEY;

  if (needsApiKey(upstreamPath) && !apiKey) {
    return jsonError("Server missing JERICHO_API_KEY", 500);
  }

  const inUrl = new URL(req.url);
  const upstreamUrl = new URL(upstreamPath, apiBase);
  upstreamUrl.search = inUrl.search; // preserve query params

  const headers = new Headers();
  const ct = req.headers.get("content-type");
  const accept = req.headers.get("accept");
  if (ct) headers.set("content-type", ct);
  if (accept) headers.set("accept", accept);
  if (apiKey && needsApiKey(upstreamPath)) headers.set("x-api-key", apiKey);

  const method = req.method.toUpperCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      cache: "no-store",
    };

    // Only forward body for methods that can carry one.
    if (method !== "GET" && method !== "HEAD") {
      const body = await req.arrayBuffer();
      init.body = body;
    }

    const res = await fetch(upstreamUrl.toString(), init);
    const resBody = await res.arrayBuffer();

    // Pass through content-type when possible.
    const outHeaders = new Headers();
    const outCt = res.headers.get("content-type");
    if (outCt) outHeaders.set("content-type", outCt);
    outHeaders.set("cache-control", "no-store");

    return new NextResponse(resBody, { status: res.status, headers: outHeaders });
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

export async function GET(req: Request, ctx: { params: { path: string[] } }) {
  const rest = Array.isArray(ctx.params?.path) ? ctx.params.path : [];
  const upstreamPath = `/v1/${rest.map(encodeURIComponent).join("/")}`;
  return proxy(req, upstreamPath);
}

export async function POST(req: Request, ctx: { params: { path: string[] } }) {
  const rest = Array.isArray(ctx.params?.path) ? ctx.params.path : [];
  const upstreamPath = `/v1/${rest.map(encodeURIComponent).join("/")}`;
  return proxy(req, upstreamPath);
}

export async function PUT(req: Request, ctx: { params: { path: string[] } }) {
  const rest = Array.isArray(ctx.params?.path) ? ctx.params.path : [];
  const upstreamPath = `/v1/${rest.map(encodeURIComponent).join("/")}`;
  return proxy(req, upstreamPath);
}

export async function PATCH(req: Request, ctx: { params: { path: string[] } }) {
  const rest = Array.isArray(ctx.params?.path) ? ctx.params.path : [];
  const upstreamPath = `/v1/${rest.map(encodeURIComponent).join("/")}`;
  return proxy(req, upstreamPath);
}

export async function DELETE(req: Request, ctx: { params: { path: string[] } }) {
  const rest = Array.isArray(ctx.params?.path) ? ctx.params.path : [];
  const upstreamPath = `/v1/${rest.map(encodeURIComponent).join("/")}`;
  return proxy(req, upstreamPath);
}

