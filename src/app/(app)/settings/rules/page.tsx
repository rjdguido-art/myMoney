import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/onboarding";

async function createRule(formData: FormData) {
  "use server";
  const user = await requireOnboardedUser();

  const descriptionContains = String(formData.get("descriptionContains") || "").trim();
  const categoryId = String(formData.get("categoryId") || "").trim();
  const priorityInput = Number(formData.get("priority") ?? 0);
  const priority = Number.isFinite(priorityInput) ? Math.round(priorityInput) : 0;

  if (!descriptionContains || !categoryId) {
    return;
  }

  await prisma.rule.create({
    data: {
      userId: user.id,
      descriptionContains,
      categoryId,
      priority,
    },
  });

  revalidatePath("/settings/rules");
}

async function toggleRule(formData: FormData) {
  "use server";
  const user = await requireOnboardedUser();
  const id = String(formData.get("id") || "");
  const nextActive = formData.get("nextActive") === "true";
  if (!id) return;
  await prisma.rule.update({
    where: { id, userId: user.id },
    data: { active: nextActive },
  });
  revalidatePath("/settings/rules");
}

async function deleteRule(formData: FormData) {
  "use server";
  const user = await requireOnboardedUser();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.rule.delete({
    where: { id, userId: user.id },
  });
  revalidatePath("/settings/rules");
}

export default async function RulesPage() {
  const user = await requireOnboardedUser();

  const [rules, categories] = await Promise.all([
    prisma.rule.findMany({
      where: { userId: user.id },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="pill inline-flex bg-white/80 text-emerald-700">Rules</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Merchant → category rules</h1>
          <p className="text-muted">
            Auto-classify imports: if the merchant text contains a phrase, assign the category.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1 space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm text-muted">New rule</p>
            <h2 className="text-lg font-semibold text-ink">Match & assign</h2>
          </div>
          <form action={createRule} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-ink">Merchant contains</label>
              <input
                name="descriptionContains"
                required
                className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                placeholder="e.g. starbucks"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">Category</label>
              <select
                name="categoryId"
                required
                className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">Priority (higher first)</label>
              <input
                name="priority"
                type="number"
                defaultValue={0}
                className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full pill bg-emerald-500 text-white border-transparent shadow-[0_12px_32px_rgba(121,211,198,0.32)] hover:brightness-105"
            >
              Create rule
            </button>
          </form>
        </section>

        <section className="lg:col-span-2 space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Existing rules</p>
              <h2 className="text-lg font-semibold text-ink">Applied on import & create</h2>
            </div>
            <span className="pill">{rules.length} total</span>
          </div>
          {rules.length ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col gap-3 rounded-md border border-border/80 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-[0.08em] text-emerald-700">
                      Match
                    </p>
                    <p className="text-lg font-semibold text-ink">
                      “{rule.descriptionContains}”
                    </p>
                    <p className="text-sm text-muted">
                      Assign <span className="font-semibold text-ink">{rule.category.name}</span>
                      {" · "}Priority {rule.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={toggleRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <input
                        type="hidden"
                        name="nextActive"
                        value={(!rule.active).toString()}
                      />
                      <button
                        type="submit"
                        className={[
                          "pill text-sm",
                          rule.active
                            ? "bg-emerald-500 text-white border-transparent hover:brightness-105"
                            : "border-border/80 bg-white text-ink hover:border-emerald-500/50",
                        ].join(" ")}
                      >
                        {rule.active ? "Active" : "Activate"}
                      </button>
                    </form>
                    <form action={deleteRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <button
                        type="submit"
                        className="pill border-border/80 bg-white text-sm text-ink hover:border-rose-500/60 hover:text-rose-600"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-white p-4 text-sm text-muted">
              No rules yet. Create one to automatically classify merchants as they arrive.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
