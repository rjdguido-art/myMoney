import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runRecurringRules } from "@/lib/recurringRunner";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRecurringRules({});
  return NextResponse.json(result);
}
