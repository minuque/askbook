"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, NotebookPen } from "lucide-react";
import { Lockup } from "@/components/brand/Gloss";
import { LangToggle } from "@/components/ui/LangToggle";
import { SettingsMenu } from "@/components/ui/SettingsMenu";
import { barBtn } from "@/components/ui/Popover";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useI18n";
import { onScroll, scrollMax, scrollTo, scrollY } from "@/lib/scroll";
import { useGlosses, useHighlights, useStore } from "@/lib/store";
import { useReader } from "./context";

export function TopBar({ currentN, pastTitle }: { currentN: number | null; pastTitle: boolean }) {
  useLang();
  const { ix, jumpTo } = useReader();
  const [scrolledUp, setScrolledUp] = useState(false);
  const [peek, setPeek] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const focusMode = useStore((s) => s.focusMode);
  const barRef = useRef<HTMLSpanElement>(null);
  const notebookOpen = useStore((s) => s.notebookOpen);
  const setUI = useStore((s) => s.setUI);
  const brief = useStore((s) => s.briefs[ix.article.id]);
  const count = useGlosses(ix.article.id).length + useHighlights(ix.article.id).length;

  // The bar stays put while you read. Only the hairline follows the scroll,
  // written straight to the DOM: no re-render per frame.
  useEffect(() => {
    let last = scrollY();
    const on = () => {
      const y = scrollY();
      const max = scrollMax();
      if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      setScrolled(y > 8);
      if (Math.abs(y - last) < 6) return;
      setScrolledUp(y < last);
      last = y;
    };
    on();
    const off = onScroll(on);
    window.addEventListener("resize", on);
    return () => {
      off();
      window.removeEventListener("resize", on);
    };
  }, []);

  // In focus mode the bar stays away until the pointer touches the top edge,
  // and leaves again once it moves down past the bar. Touch: scroll up.
  useEffect(() => {
    if (!focusMode) return;
    setPeek(false);
    setScrolledUp(false);
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse") setPeek((p) => e.clientY < (p ? 96 : 12));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [focusMode]);

  // Reading never hides the bar. Focus mode keeps it away until the pointer
  // touches the top edge, or you scroll up.
  const tucked = focusMode && !peek && !scrolledUp && !notebookOpen;

  const section = (() => {
    if (brief?.status !== "ready" || currentN === null) return null;
    let s: { title: string; start: number } | null = null;
    for (const x of brief.data.sections) if (x.start <= currentN) s = x;
    return s;
  })();

  return (
    <header
      className={`app-topbar fixed inset-x-0 top-0 z-40 h-[var(--topbar-h)] transition-[transform,background-color,border-color] duration-300 ease-[var(--ease-out)] ${
        tucked ? "-translate-y-full" : ""
      } ${scrolled ? "border-b border-rule bg-bg/85 backdrop-blur-md" : "border-b border-transparent"}`}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        <span className="desktop-home-slot">
          <Lockup />
        </span>

        {/* Always a spacer; the running title shows in it from tablet width up. */}
        <div className={`flex min-w-0 flex-1 justify-center transition-opacity duration-300 ${pastTitle ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <div className="hidden h-9 min-w-0 max-w-[560px] items-center gap-2 text-[13.5px] md:flex">
            <button
              type="button"
              onClick={() => scrollTo(0, "smooth")}
              className="min-w-0 truncate rounded-full px-2.5 py-1.5 font-serif text-[16px] leading-none text-ink transition-colors hover:bg-sunk"
              data-tip={t("backToTop")}
            >
              {ix.article.title}
            </button>
            {section && (
              <>
                <span className="h-3.5 w-px shrink-0 bg-rule-strong" aria-hidden />
                <button
                  type="button"
                  onClick={() => jumpTo(section.start, { flash: false })}
                  data-tip={t("goToStart")}
                  className="min-w-0 truncate rounded-full px-2 py-1.5 leading-none text-ink-3 hover:bg-sunk hover:text-ink"
                >
                  {section.title}
                </button>
              </>
            )}
          </div>
        </div>

        <nav aria-label={t("readerTools")} className="flex items-center gap-1">
          <span className="hidden sm:block">
            <button type="button" className={barBtn} onClick={() => setUI({ shortcutsOpen: true })} aria-label={t("keyboardShortcuts")} data-tip={t("shortcuts")} data-tip-kbd="?">
              <Keyboard size={17} strokeWidth={1.8} />
            </button>
          </span>
          <LangToggle />
          <SettingsMenu />
          <button
            type="button"
            className={`${barBtn} !px-3 ${notebookOpen ? "bg-sunk text-ink" : ""}`}
            onClick={() => setUI({ notebookOpen: !notebookOpen })}
            aria-pressed={notebookOpen}
            aria-label={t("notebook")}
            data-tip={notebookOpen ? t("closeNotebook") : t("yourNotes")}
            data-tip-kbd="N"
          >
            <NotebookPen size={16} strokeWidth={1.8} />
            <span className="hidden sm:inline">{t("notebook")}</span>
            {count > 0 && (
              <span className="min-w-[18px] rounded-full bg-[var(--rubric)] px-1.5 text-center text-[11px] font-semibold leading-[18px] tabular-nums text-white">{count}</span>
            )}
          </button>
        </nav>
      </div>
      <span ref={barRef} aria-hidden className="absolute inset-x-0 -bottom-px h-[2px] origin-left bg-[var(--rubric)] opacity-80" style={{ transform: "scaleX(0)" }} />
    </header>
  );
}
