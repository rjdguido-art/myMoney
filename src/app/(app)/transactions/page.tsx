import { prisma } from "@/lib/prisma";
import {
  serializeTransaction,
  transactionInclude,
} from "@/lib/transactions";
import { requireOnboardedUser } from "@/lib/onboarding";
import { TransactionsClient } from "./transactions-client";

export default async function TransactionsPage() {
  const user = await requireOnboardedUser();
  const userId = user.id;

  const [transactions, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      include: transactionInclude,
      orderBy: { postedAt: "desc" },
      take: 25,
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
    <TransactionsClient
      initialTransactions={transactions.map(serializeTransaction)}
      accounts={accounts}
      categories={categories}
    />
  );
}
