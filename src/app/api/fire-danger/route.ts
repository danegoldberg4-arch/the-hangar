import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchFireDanger, getLatestFireDanger } from "@/lib/integrations/weather";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fresh = await fetchFireDanger();
  const rating = fresh || (await getLatestFireDanger());

  if (!rating) {
    return NextResponse.json({ error: "No fire danger data available" }, { status: 404 });
  }

  return NextResponse.json({
    ...rating,
    fetchedAt: new Date().toISOString(),
  });
}
