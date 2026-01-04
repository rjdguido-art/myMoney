import { NextResponse } from "next/server";
import { firebaseAdminAuth } from "@/lib/firebase-admin";

const SESSION_DAYS = 5;

export async function POST(request: Request) {
  const { idToken } = (await request.json().catch(() => ({}))) as {
    idToken?: string;
  };

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
  }

  try {
    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const sessionCookie = await firebaseAdminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set("firebaseSession", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session." },
      { status: 401 },
    );
  }
}
