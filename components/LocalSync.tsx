"use client";

import { useEffect } from "react";
import { registerLangSource } from "@/lib/i18n";
import { resolveTheme } from "@/lib/settings";
import { useStore } from "@/lib/store";
import { startSync } from "@/lib/sync";

/** Hydrates the store, runs local SQLite sync, and tells the desktop shell which theme to wear. Renders nothing. */
export function LocalSync() {
  useEffect(() => {
    // After hydration, t()/tName() read the store's lang, not the DOM — SSR and
    // the first client render both see "en" and stay consistent.
    registerLangSource(() => useStore.getState().settings.lang ?? "en");
    useStore.getState().hydrate();
    const s = startSync();
    // Synced after hydration, and again whenever the theme changes.
    const send = () =>
      (window as { glossDesktop?: { setTheme?: (t: string) => void } }).glossDesktop?.setTheme?.(resolveTheme(useStore.getState().settings.theme));
    send();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", send);
    const unsub = useStore.subscribe((st, prev) => {
      if (st.settings.theme !== prev.settings.theme) send();
    });
    return () => {
      s.stop();
      media.removeEventListener("change", send);
      unsub();
    };
  }, []);
  return null;
}
