"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Library } from "lucide-react";
import { Lockup } from "@/components/brand/Gloss";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useI18n";
import { onScroll, scrollY } from "@/lib/scroll";
import { LangToggle } from "./LangToggle";
import { SettingsMenu } from "@/components/ui/SettingsMenu";

/**
 * The bar across the top of the home page and the library: the same pieces in
 * the same places on both, so moving between them never shifts anything.
 * In the desktop shell it floats over the page, so it turns frosted once the
 * page scrolls under it: the same look the reader's bar takes.
 */
export function TopBar({ here, onLibrary }: { here?: "library"; onLibrary?: () => void }) {
  useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(scrollY() > 8);
    on();
    const off = onScroll(on);
    window.addEventListener("resize", on);
    return () => {
      off();
      window.removeEventListener("resize", on);
    };
  }, []);

  return (
    <header
      className={`app-topbar relative z-20 mx-auto flex h-[var(--topbar-h)] w-full max-w-[1400px] shrink-0 items-center justify-between border-b px-5 transition-colors duration-300 ease-[var(--ease-out)] max-[380px]:px-4 sm:px-8 ${
        scrolled ? "border-rule bg-bg/70 backdrop-blur-md" : "border-transparent"
      }`}
    >
      <span className="desktop-home-slot">
        <Lockup />
      </span>
      <nav aria-label={t("mainNav")} className="flex items-center gap-1 max-[380px]:gap-0">
        <Link
          href="/library"
          aria-current={here === "library" ? "page" : undefined}
          onClick={(e) => {
            if (!onLibrary) return;
            e.preventDefault();
            onLibrary();
          }}
          className="mr-1 inline-flex h-9 items-center gap-2 rounded-full px-3 text-[14px] font-medium text-ink-2 transition-colors hover:bg-sunk hover:text-ink aria-[current=page]:bg-sunk aria-[current=page]:text-ink max-sm:w-9 max-sm:justify-center max-sm:px-0"
        >
          <Library size={17} />
          <span className="max-sm:hidden">{t("library")}</span>
        </Link>
        <LangToggle />
        <SettingsMenu compact />
      </nav>
    </header>
  );
}
