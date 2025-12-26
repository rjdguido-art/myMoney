import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { billInclude, billInputSchema, serializeBill } from "@/lib/bills";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.bill.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = billInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const bill = await prisma.bill.update({
    where: { id: params.id },
    data: {
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      dueDate: data.dueDate,
      frequency: data.frequency,
      status: data.status,
      autopay: data.autopay ?? false,
      reminderDays: data.reminderDays ?? 3,
      accountId: data.accountId ?? null,
      categoryId: data.categoryId ?? null,
    },
    include: billInclude,
  });

  return NextResponse.json({ bill: serializeBill(bill) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.bill.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.bill.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
