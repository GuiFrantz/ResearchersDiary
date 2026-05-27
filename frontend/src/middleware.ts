import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const backend = process.env.BACKEND_URL ?? "http://backend:8000";
  const target = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    backend,
  );
  return NextResponse.rewrite(target);
}

export const config = {
  matcher: "/api/:path*",
};
