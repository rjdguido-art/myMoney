import { prisma } from "@/lib/prisma";
import { billInclude, serializeBill } from "@/lib/bills";
import { requireOnboardedUser } from "@/lib/onboarding";
import { BillsClient } from "./bills-client";

export default async function BillsPage() {
  const user = await requireOnboardedUser();
  const userId = user.id;

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
