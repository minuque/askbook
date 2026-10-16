"use client";

import { Languages } from "lucide-react";
import { applySettings } from "@/lib/settings";
import { useStore } from "@/lib/store";

/** The language switch in the top bar: en ⇄ 中. */
export function LangToggle() {
  const lang = useStore((s) => s.settings.lang ?? "en");
  const setSettings = useStore((s) => s.setSettings);

  const flip = () => {
    const next = lang === "en" ? "zh" : "en";
    setSettings({ lang: next });
    applySettings(useStore.getState().settings);
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={lang === "en" ? "切换到中文" : "Switch to English"}
      data-tip={lang === "en" ? "中文" : "English"}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-sunk hover:text-ink max-sm:w-9 max-sm:justify-center max-sm:px-0"
    >
      <Languages size={16} />
      <span className="max-sm:hidden">{lang === "en" ? "EN" : "中"}</span>
    </button>
  );
}
