import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchPowerData, getPowerHistory } from "@/lib/integrations/selectlive";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get("hours") || "0");

  if (hours > 0) {
    const history = await getPowerHistory(hours);
    return NextResponse.json({ history, fetchedAt: new Date().toISOString() });
  }

  const power = await fetchPowerData();

  if (!power) {
    return NextResponse.json({
      error: "No power data available. Set SELECT_LIVE_EMAIL, SELECT_LIVE_PWD, and SELECT_LIVE_SYSTEM in .env",
      configured: !!process.env.SELECT_LIVE_EMAIL,
    }, { status: 404 });
  }

  return NextResponse.json({
    ...power,
    fetchedAt: new Date().toISOString(),
  });
}
