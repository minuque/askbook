import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useI18n";

/**
 * The landing's top: what askbook does, in one line, and the place to start.
 * "any line" is marked the way a reader marks: the wash, then the pen under it.
 */
export function Hero({ children }: { children: ReactNode }) {
  useLang();
  return (
    <section className="mx-auto flex w-full max-w-[980px] flex-col items-center px-6 text-center sm:px-10">
      <h1 className="hero-title font-serif text-ink">
        <span className="block">
          {t("highlightAny")} <span className="hero-mark">{t("anyLine")}</span>.
        </span>
        <span className="block">{t("askItAnythingDot")}</span>
      </h1>
      {children}
    </section>
  );
}
