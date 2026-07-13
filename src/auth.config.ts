import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "family";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = typeof token.role === "string" ? token.role : "family";
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
