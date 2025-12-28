import { NextResponse } from "next/server";
import { runEmailNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runEmailNotifications();
  return NextResponse.json(result);
}
