import { NextResponse, type NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Exec Demo", charset="UTF-8"',
    },
  });
}

export function middleware(req: NextRequest) {
  // Keep credentials out of source control. Configure these in Vercel:
  // - BASIC_AUTH_USERNAME
  // - BASIC_AUTH_PASSWORD
  const expectedUser = process.env.BASIC_AUTH_USERNAME;
  const expectedPass = process.env.BASIC_AUTH_PASSWORD;

  // If env vars aren't set, fail closed (do not accidentally expose).
  if (!expectedUser || !expectedPass) return unauthorized();

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(authHeader.slice("Basic ".length));
  } catch {
    return unauthorized();
  }

  const sepIdx = decoded.indexOf(":");
  const user = sepIdx >= 0 ? decoded.slice(0, sepIdx) : decoded;
  const pass = sepIdx >= 0 ? decoded.slice(sepIdx + 1) : "";

  if (user !== expectedUser || pass !== expectedPass) return unauthorized();

  return NextResponse.next();
}

export const config = {
  // Protect all app and API routes; skip Next.js internals/static assets for performance.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

