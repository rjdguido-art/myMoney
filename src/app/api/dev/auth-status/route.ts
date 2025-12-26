import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  return NextResponse.json({
    authenticated: Boolean(userId),
    ...(userId ? { userId } : {}),
  });
}
