"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  variant?: "pill" | "compact";
};

export function LanguageToggle({ locale, variant = "pill" }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [value, setValue] = useState<Locale>(locale);
  const [loading, setLoading] = useState(false);

  const handleChange = async (nextLocale: Locale) => {
    setValue(nextLocale);
    setLoading(true);

    try {
      await fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      await update();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const labelClass =
    variant === "compact" ? "text-xs font-medium text-muted" : "text-sm font-medium text-muted";
  const selectClass =
    variant === "compact"
      ? "rounded-sm border border-border/80 bg-white/80 px-2 py-1 text-xs text-ink"
      : "rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink";

  return (
    <div className="flex items-center gap-2">
      <span className={labelClass}>{String(t("nav.language", value))}</span>
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value as Locale)}
        disabled={loading}
        className={selectClass}
      >
        <option value="en">{String(t("nav.languageEnglish", value))}</option>
        <option value="es">{String(t("nav.languageSpanish", value))}</option>
      </select>
    </div>
  );
}
