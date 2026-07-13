import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeRegistrationRateLimits } from "@/lib/auth-rate-limit";
import bcrypt from "bcryptjs";

type RegistrationFailure = {
  ok: false;
  status: number;
  error: string;
};

type RegistrationSuccess = {
  ok: true;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type RegistrationResult = RegistrationFailure | RegistrationSuccess;

function failure(status: number, error: string): RegistrationFailure {
  return { ok: false, status, error };
}

function secretsMatch(supplied: unknown, expected: string): boolean {
  if (typeof supplied !== "string") return false;

  const suppliedDigest = createHash("sha256").update(supplied).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  if (name.length > 80 || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid name and email address" },
      { status: 400 }
    );
  }

  const passwordBytes = new TextEncoder().encode(password).length;
  if (password.length < 12 || passwordBytes > 72) {
    return NextResponse.json(
      { error: "Password must be at least 12 characters and at most 72 bytes" },
      { status: 400 }
    );
  }

  try {
    const rateLimit = await consumeRegistrationRateLimits(request, email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later." },
        {
          status: 429,
          headers: {
            "Cache-Control": "private, no-store",
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }
  } catch (error) {
    console.error("[register] rate limit check failed", error);
    return NextResponse.json(
      { error: "Registration is not available" },
      { status: 503 }
    );
  }

  let result: RegistrationResult;
  try {
    result = await prisma.$transaction(async (tx) => {
      // Serializes the user-count check so only one concurrent signup can be
      // granted the initial admin role.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('the-hangar-registration'))`;

      const userCount = await tx.user.count();
      const isFirstUser = userCount === 0;
      const requiredCode = isFirstUser
        ? process.env.ADMIN_BOOTSTRAP_TOKEN
        : process.env.INVITE_CODE;

      if (!requiredCode) {
        return failure(503, "Registration is not available");
      }

      if (!secretsMatch(input.inviteCode, requiredCode)) {
        return failure(403, "Invalid registration code");
      }

      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        return failure(409, "An account with this email already exists");
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: isFirstUser ? "admin" : "family",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return { ok: true, user };
    });
  } catch (error) {
    console.error("[register] account creation failed", error);
    return NextResponse.json(
      { error: "Unable to create account" },
      { status: 500 }
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(result.user, { status: 201 });
}
