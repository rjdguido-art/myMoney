import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { billInclude, serializeBill } from "@/lib/bills";
import { BillsClient } from "./bills-client";

export default async function BillsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [bills, accounts, categories] = await Promise.all([
    prisma.bill.findMany({
      where: { userId },
      include: billInclude,
      orderBy: { dueDate: "asc" },
      take: 200,
    }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, currency: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <BillsClient
      initialBills={bills.map(serializeBill)}
      accounts={accounts}
      categories={categories}
    />
  );
}
