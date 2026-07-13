import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { fetchFireDanger, getLatestFireDanger } from "@/lib/integrations/weather";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

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
