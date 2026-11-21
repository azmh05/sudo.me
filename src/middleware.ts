import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/setup"];

// First gate: every page except login/setup needs a valid signed session.
// Pages then double-check against the database (see lib/auth.ts).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    if (pathname.startsWith("/api/")) return new NextResponse("Not signed in", { status: 401 });
    // Show the login page in place (no redirect), so it works the same on
    // localhost and on your Tailscale https://….ts.net address.
    // The internal hop is always plain http — Tailscale handles the https part outside.
    const url = req.nextUrl.clone();
    url.protocol = "http:";
    url.pathname = "/login";
    url.search = "";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
