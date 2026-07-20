import { NextResponse, type NextRequest } from "next/server";
import { hasValidBearerToken } from "@/lib/bearer-auth";
import { syncDevicesToDb } from "@/lib/integrations/tapo";

export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!hasValidBearerToken(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const synced = await syncDevicesToDb();
    return NextResponse.json({
      ok: true,
      synced,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron:plugs] error:", error);
    return NextResponse.json({ ok: false, error: "sync failed" }, { status: 502 });
  }
}
