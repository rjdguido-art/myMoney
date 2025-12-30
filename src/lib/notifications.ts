import { BillStatus, CategoryType, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const MS_DAY = 24 * 60 * 60 * 1000;

type UserIdentity = {
  id: string;
  email: string;
  name: string | null;
  currency: string;
  timezone: string;
  locale: string;
  onboarded: boolean;
  createdAt: Date;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(date: Date, locale: string, timeZone?: string) {
  try {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone,
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function startOfWeekUtc(date: Date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = (day + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diff);
  return utc;
}

function getLocaleCode(locale: string) {
  return locale === "es" ? "es-ES" : "en-US";
}

async function wasNotified(userId: string, type: NotificationType, key: string) {
  const existing = await prisma.notificationLog.findUnique({
    where: {
      userId_type_key: {
        userId,
        type,
        key,
      },
    },
  });
  return Boolean(existing);
}

async function markNotified(userId: string, type: NotificationType, key: string) {
  await prisma.notificationLog.create({
    data: {
      userId,
      type,
      key,
    },
  });
}

function buildEmailShell(title: string, body: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; background: #f5f0e6; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e3dacb;">
        <p style="text-transform: uppercase; letter-spacing: 0.18em; font-size: 12px; color: #0b2347; margin: 0 0 8px;">ArgoBucks</p>
        <h1 style="font-size: 20px; margin: 0 0 12px; color: #0b2347;">${title}</h1>
        <div style="font-size: 14px; color: #3d5978; line-height: 1.6;">${body}</div>
      </div>
    </div>
  `;
}

function formatName(user: UserIdentity) {
  if (!user.name) return "there";
  return user.name.split(" ")[0];
}

async function sendBillDueNotifications(now: Date) {
  const horizon = new Date(now.getTime() + 60 * MS_DAY);
  const bills = await prisma.bill.findMany({
    where: {
      dueDate: { gte: now, lte: horizon },
      status: { not: BillStatus.PAID },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          currency: true,
          timezone: true,
          locale: true,
          onboarded: true,
          createdAt: true,
        },
      },
    },
  });

  let sent = 0;
  for (const bill of bills) {
    const user = bill.user as UserIdentity;
    const localeCode = getLocaleCode(user.locale);
    const daysUntil = Math.ceil((bill.dueDate.getTime() - now.getTime()) / MS_DAY);
    if (daysUntil < 0 || daysUntil > bill.reminderDays) continue;

    const key = `${bill.id}:${bill.dueDate.toISOString().slice(0, 10)}`;
    if (await wasNotified(user.id, NotificationType.BILL_DUE, key)) continue;

    const dueLabel = formatDate(bill.dueDate, localeCode, user.timezone);
    const amountLabel = formatCurrency(Number(bill.amount), bill.currency, localeCode);
    const dayLabel = daysUntil === 0 ? "today" : `${daysUntil} day${daysUntil === 1 ? "" : "s"}`;

    const body = `
      <p>Hi ${formatName(user)}, your <strong>${bill.name}</strong> bill is due ${dayLabel}.</p>
      <p style="margin: 12px 0; padding: 12px; background: #fbf7f0; border-radius: 12px; border: 1px solid #e3dacb;">
        Due date: <strong>${dueLabel}</strong><br/>
        Amount: <strong>${amountLabel}</strong>
      </p>
      <p>Review it in your dashboard to stay ahead.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: `Bill due ${daysUntil === 0 ? "today" : `in ${daysUntil} days`}: ${bill.name}`,
      html: buildEmailShell("Upcoming bill reminder", body),
    });
    await markNotified(user.id, NotificationType.BILL_DUE, key);
    sent += 1;
  }

  return sent;
}

async function sendBudgetOverspendNotifications(now: Date) {
  const plans = await prisma.budgetPlan.findMany({
    where: {
      periodStart: { lte: now },
      periodEnd: { gte: now },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          currency: true,
          timezone: true,
          locale: true,
          onboarded: true,
          createdAt: true,
        },
      },
      items: {
        include: { category: { select: { id: true, name: true } } },
      },
    },
  });

  let sent = 0;
  for (const plan of plans) {
    const user = plan.user as UserIdentity;
    const localeCode = getLocaleCode(user.locale);

    const key = `plan:${plan.id}`;
    if (await wasNotified(user.id, NotificationType.BUDGET_OVERSPENT, key)) continue;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        postedAt: { gte: plan.periodStart, lte: plan.periodEnd },
      },
      include: {
        category: { select: { id: true, name: true, type: true } },
        splits: { include: { category: { select: { id: true, name: true, type: true } } } },
      },
    });

    const budgetCategoryIds = new Set(
      plan.items.map((item) => item.categoryId).filter(Boolean) as string[],
    );
    const spentByCategory = new Map<string, number>();

    const addLine = (
      amount: unknown,
      category?: { id?: string | null; type?: CategoryType | null },
    ) => {
      if (category?.type && category.type !== CategoryType.EXPENSE) return;
      const value = toNumber(amount);
      if (value <= 0) return;
      if (category?.id && budgetCategoryIds.has(category.id)) {
        spentByCategory.set(category.id, (spentByCategory.get(category.id) ?? 0) + value);
      }
    };

    for (const tx of transactions) {
      if (tx.splits.length) {
        tx.splits.forEach((split) => addLine(split.amount, split.category ?? undefined));
      } else {
        addLine(tx.amount, tx.category ?? undefined);
      }
    }

    const overspent = plan.items
      .map((item) => {
        if (!item.categoryId) return null;
        const spent = spentByCategory.get(item.categoryId) ?? 0;
        const limit = toNumber(item.amount);
        const delta = spent - limit;
        if (delta <= 0) return null;
        return {
          name: item.category?.name ?? "Uncategorized",
          spent,
          limit,
          delta,
        };
      })
      .filter(Boolean) as Array<{ name: string; spent: number; limit: number; delta: number }>;

    if (!overspent.length) continue;

    overspent.sort((a, b) => b.delta - a.delta);
    const top = overspent.slice(0, 3);
    const body = `
      <p>Hi ${formatName(user)}, you have overspent in ${overspent.length} category${overspent.length === 1 ? "" : "ies"}.</p>
      <ul style="margin: 12px 0; padding-left: 18px;">
        ${top
          .map(
            (item) =>
              `<li><strong>${item.name}</strong>: ${formatCurrency(item.spent, user.currency, localeCode)} spent (limit ${formatCurrency(item.limit, user.currency, localeCode)})</li>`,
          )
          .join("")}
      </ul>
      <p>Open your budget to make quick adjustments.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Budget alert: over plan",
      html: buildEmailShell("Budget overspend alert", body),
    });
    await markNotified(user.id, NotificationType.BUDGET_OVERSPENT, key);
    sent += 1;
  }

  return sent;
}

async function sendWeeklySummaries(now: Date) {
  if (now.getUTCDay() !== 1) return 0;
  const weekStart = startOfWeekUtc(now);
  const key = weekStart.toISOString().slice(0, 10);
  const users = await prisma.user.findMany({
    where: { onboarded: true },
    select: {
      id: true,
      email: true,
      name: true,
      currency: true,
      timezone: true,
      locale: true,
      onboarded: true,
      createdAt: true,
    },
  });

  let sent = 0;
  for (const user of users) {
    if (await wasNotified(user.id, NotificationType.WEEKLY_SUMMARY, key)) continue;

    const periodStart = new Date(now.getTime() - 7 * MS_DAY);
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        postedAt: { gte: periodStart, lte: now },
      },
      include: {
        category: { select: { id: true, name: true, type: true } },
        splits: { include: { category: { select: { id: true, name: true, type: true } } } },
      },
    });

    const localeCode = getLocaleCode(user.locale);
    let totalSpent = 0;
    const categoryTotals = new Map<string, number>();
    const addLine = (
      amount: unknown,
      category?: { name?: string | null; type?: CategoryType | null },
    ) => {
      if (category?.type && category.type !== CategoryType.EXPENSE) return;
      const value = toNumber(amount);
      if (value <= 0) return;
      totalSpent += value;
      const label = category?.name ?? "Uncategorized";
      categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + value);
    };

    for (const tx of transactions) {
      if (tx.splits.length) {
        tx.splits.forEach((split) => addLine(split.amount, split.category ?? undefined));
      } else {
        addLine(tx.amount, tx.category ?? undefined);
      }
    }

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const upcomingBills = await prisma.bill.findMany({
      where: {
        userId: user.id,
        dueDate: { gte: now, lte: new Date(now.getTime() + 7 * MS_DAY) },
        status: { not: BillStatus.PAID },
      },
      orderBy: { dueDate: "asc" },
      take: 3,
    });

    const body = `
      <p>Hi ${formatName(user)}, here is your weekly snapshot.</p>
      <p style="margin: 12px 0; padding: 12px; background: #fbf7f0; border-radius: 12px; border: 1px solid #e3dacb;">
        Total spent: <strong>${formatCurrency(totalSpent, user.currency, localeCode)}</strong>
      </p>
      ${
        topCategories.length
          ? `<p><strong>Top categories</strong></p><ul style="margin: 8px 0 12px; padding-left: 18px;">
              ${topCategories
                .map(
                  ([name, total]) =>
                    `<li>${name}: ${formatCurrency(total, user.currency, localeCode)}</li>`,
                )
                .join("")}
            </ul>`
          : "<p>No spending activity recorded this week.</p>"
      }
      ${
        upcomingBills.length
          ? `<p><strong>Upcoming bills</strong></p><ul style="margin: 8px 0 0; padding-left: 18px;">
              ${upcomingBills
                .map(
                  (bill) =>
                    `<li>${bill.name} · ${formatDate(bill.dueDate, localeCode, user.timezone)} · ${formatCurrency(Number(bill.amount), bill.currency, localeCode)}</li>`,
                )
                .join("")}
            </ul>`
          : "<p>No bills due in the next week.</p>"
      }
    `;

    await sendEmail({
      to: user.email,
      subject: `Weekly summary · ${formatDate(weekStart, localeCode, user.timezone)}`,
      html: buildEmailShell("Your weekly money summary", body),
    });
    await markNotified(user.id, NotificationType.WEEKLY_SUMMARY, key);
    sent += 1;
  }

  return sent;
}

async function sendOnboardingReminders(now: Date) {
  const users = await prisma.user.findMany({
    where: {
      onboarded: false,
      createdAt: { lte: new Date(now.getTime() - MS_DAY) },
    },
    select: {
      id: true,
      email: true,
      name: true,
      currency: true,
      timezone: true,
      locale: true,
      onboarded: true,
      createdAt: true,
    },
  });

  let sent = 0;
  const weekKey = startOfWeekUtc(now).toISOString().slice(0, 10);
  for (const user of users) {
    const key = `onboarding:${weekKey}`;
    if (await wasNotified(user.id, NotificationType.ONBOARDING_REMINDER, key)) continue;

    const localeCode = getLocaleCode(user.locale);
    const body = `
      <p>Hi ${formatName(user)}, you are just a few minutes away from your personalized dashboard.</p>
      <p>Complete onboarding to add your pay schedule, bills, and budget targets.</p>
      <p>When you are ready, log in and finish setup.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Finish your ArgoBucks setup",
      html: buildEmailShell("Quick onboarding reminder", body),
    });
    await markNotified(user.id, NotificationType.ONBOARDING_REMINDER, key);
    sent += 1;
  }

  return sent;
}

export async function runEmailNotifications() {
  const now = new Date();
  const [billDue, overspend, weekly, onboarding] = await Promise.all([
    sendBillDueNotifications(now),
    sendBudgetOverspendNotifications(now),
    sendWeeklySummaries(now),
    sendOnboardingReminders(now),
  ]);

  return {
    billDue,
    overspend,
    weekly,
    onboarding,
  };
}
