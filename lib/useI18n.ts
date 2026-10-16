"use client";

import { useStore } from "./store";
import type { Lang } from "./i18n";

/**
 * Subscribe this component to the interface language. Any component that
 * renders t()/tName() strings should call this once near the top so it
 * re-renders when settings.lang flips.
 */
export function useLang(): Lang {
  return useStore((s) => s.settings.lang ?? "en");
}
