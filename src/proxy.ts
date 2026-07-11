import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export function proxy(...args: Parameters<typeof auth>) {
  return auth(...args);
}

export const config = {
  matcher: [
    "/((?!api/auth|login|signup|handbook|_next/static|_next/image|favicon.ico|manifest.json|serwist|icon-|apple-touch-icon|favicon-|~offline).*)",
  ],
};
