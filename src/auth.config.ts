import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 365 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "family";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    authorized({ request, auth }) {
      const path = request.nextUrl.pathname;
      const publicPaths = ["/login", "/signup", "/handbook"];
      const isPublic = publicPaths.some((p) => path === p || path.startsWith(p + "/"));
      if (isPublic) return true;
      if (path.startsWith("/api/")) return true;
      return !!auth;
    },
  },
};
