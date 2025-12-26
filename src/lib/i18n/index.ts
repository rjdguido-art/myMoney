import en from "./en";
import es from "./es";

export type Locale = "en" | "es";
export type TranslationKey = keyof typeof en;

const dictionaries = { en, es } as const;

export function t(
  key: TranslationKey,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries.en;
  const template = dict[key] ?? dictionaries.en[key] ?? key;

  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (_, name) =>
    String(params[name] ?? `{${name}}`),
  );
}

export function tJSON<T>(key: TranslationKey, locale: Locale, fallback: T): T {
  const dict = dictionaries[locale] ?? dictionaries.en;
  const value = dict[key] ?? dictionaries.en[key];
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
