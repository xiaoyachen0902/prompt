import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Locale } from "./translations";
import { t as tRaw } from "./translations";

const STORAGE_KEY = "prompt-debug-locale";

type TFunction = (key: string, vars?: Record<string, string>) => string;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "zh" || v === "en") return v;
  } catch (_) {}
  return "zh";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (_) {}
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t: TFunction = useCallback(
    (key: string, vars?: Record<string, string>) => tRaw(locale, key, vars),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className={`flex items-center gap-1 rounded-md border border-[hsl(var(--border))] p-0.5 ${className}`}>
      <button
        type="button"
        onClick={() => setLocale("zh")}
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
          locale === "zh"
            ? "bg-[hsl(var(--primary))] text-white"
            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        }`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
          locale === "en"
            ? "bg-[hsl(var(--primary))] text-white"
            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        }`}
      >
        EN
      </button>
    </div>
  );
}
