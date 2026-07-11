import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password, inviteCode } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const userCount = await prisma.user.count();
  let role = "family";
  if (userCount === 0) {
    role = "admin";
  } else {
    const validInviteCode = process.env.INVITE_CODE;
    if (validInviteCode && inviteCode !== validInviteCode) {
      return NextResponse.json(
        { error: "Invalid invite code. Ask the family admin for the code." },
        { status: 403 }
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }, { status: 201 });
}
