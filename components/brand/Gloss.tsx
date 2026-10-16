import Link from "next/link";
import { House } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useI18n";

/** Lines of text with a note in the margin: the whole idea in 24px. */
export function GlossMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M3 6.5h10.5M3 11.5h10.5M3 16.5h6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 3v18" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.32" />
      <circle cx="18.5" cy="11.5" r="2.9" fill="var(--rubric)" />
    </svg>
  );
}

/** The wordmark. The serif's line box is set to its own size and nudged so the word's cap height is centered on the mark. */
export function GlossWordmark() {
  return (
    <span className="flex h-9 items-center gap-[7px] text-ink">
      <GlossMark className="size-[21px] shrink-0" />
      <span className="block translate-y-[2px] font-serif text-[21px] font-[440] leading-[21px] tracking-[-0.018em] [font-variation-settings:'opsz'_36]">
        askbook
      </span>
    </span>
  );
}

/** The bar's left button: home, back to the library. */
export function Lockup({ href = "/" }: { href?: string }) {
  useLang();
  return (
    <Link
      href={href}
      aria-label={t("backToLibrary")}
      data-tip={t("library")}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-sunk"
    >
      <House size={18} strokeWidth={1.8} />
    </Link>
  );
}
