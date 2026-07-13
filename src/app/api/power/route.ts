import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { fetchPowerData, getPowerHistory } from "@/lib/integrations/selectlive";

export async function GET(request: Request) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get("hours") || "0");

  if (hours > 0) {
    const history = await getPowerHistory(hours);
    return NextResponse.json({ history, fetchedAt: new Date().toISOString() });
  }

  const power = await fetchPowerData();

  if (!power) {
    return NextResponse.json(
      { error: "No power data available" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...power,
    fetchedAt: new Date().toISOString(),
  });
}
