import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import {
  consumeLoginRateLimits,
  resetAuthRateLimits,
} from "@/lib/auth-rate-limit";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        let rateLimit;
        try {
          rateLimit = await consumeLoginRateLimits(request, credentials?.email);
        } catch (error) {
          console.error("[auth] login rate limit check failed", error);
          return null;
        }

        if (!rateLimit.allowed) return null;

        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        if (!email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!valid) return null;

        try {
          await resetAuthRateLimits(rateLimit.resetKeyHashes);
        } catch (error) {
          console.error("[auth] login rate limit reset failed", error);
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
