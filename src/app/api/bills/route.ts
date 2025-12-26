import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { billInclude, billInputSchema, serializeBill } from "@/lib/bills";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [bills, accounts, categories] = await Promise.all([
    prisma.bill.findMany({
      where: { userId: session.user.id },
      include: billInclude,
      orderBy: { dueDate: "asc" },
      take: 200,
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, currency: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    bills: bills.map(serializeBill),
    accounts,
    categories,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const bill = await prisma.bill.create({
    data: {
      userId: session.user.id,
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

  return NextResponse.json({ bill: serializeBill(bill) }, { status: 201 });
}
