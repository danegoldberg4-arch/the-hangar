import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { fetchFireDanger, getLatestFireDanger } from "@/lib/integrations/weather";
import { unavailableMeta } from "@/lib/integrations/freshness";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const fresh = await fetchFireDanger();
  const rating = fresh ?? (await getLatestFireDanger());

  if (!rating) {
    return NextResponse.json(
      { error: "No fire danger observation is available", ...unavailableMeta(), refreshSucceeded: false },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ...rating,
    refreshSucceeded: fresh !== null,
    fetchedAt: new Date().toISOString(),
  });
}
