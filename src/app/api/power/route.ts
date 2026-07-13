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
      error: "No power data available",
      emailSet: !!process.env.SELECT_LIVE_EMAIL,
      pwdSet: !!process.env.SELECT_LIVE_PWD,
      pwdValue: process.env.SELECT_LIVE_PWD === "CHANGE_ME" ? "CHANGE_ME (not set)" : !!process.env.SELECT_LIVE_PWD ? "set" : "empty",
      systemSet: !!process.env.SELECT_LIVE_SYSTEM,
    }, { status: 404 });
  }

  return NextResponse.json({
    ...power,
    fetchedAt: new Date().toISOString(),
  });
}
