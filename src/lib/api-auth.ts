import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthorizedUser = {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  role: string;
};

type AccessGranted = {
  ok: true;
  user: AuthorizedUser;
};

type AccessDenied = {
  ok: false;
  response: NextResponse<{ error: string }>;
};

export type AccessResult = AccessGranted | AccessDenied;

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function requireUser(): Promise<AccessResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: noStoreHeaders }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: noStoreHeaders }
      ),
    };
  }

  return { ok: true, user };
}

export async function requireAdmin(): Promise<AccessResult> {
  const access = await requireUser();
  if (!access.ok) return access;

  const response = enforceAdmin(access.user);
  if (response) {
    return {
      ok: false,
      response,
    };
  }

  return access;
}

export function enforceAdmin(
  user: AuthorizedUser
): NextResponse<{ error: string }> | null {
  if (user.role === "admin") return null;

  return NextResponse.json(
    { error: "Forbidden" },
    { status: 403, headers: noStoreHeaders }
  );
}
