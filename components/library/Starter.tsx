"use client";

import { useState } from "react";
import { ArrowRight, Link2, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useI18n";
import { normalizeUrl } from "@/lib/links";
import { CLASSICS, classicCover } from "@/lib/classics";
import { importFromUrl, keep } from "@/lib/import";
import { useStore } from "@/lib/store";

/**
 * Under a shelf that is still nearly empty: two ways to fill it. A dozen
 * classics in one click, or links of your own.
 */
export function Starter({ count, onAdd }: { count: number; onAdd: () => void }) {
  useLang();
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState(0);

  const shelveClassics = async () => {
    const have = new Set(useStore.getState().library.map((x) => (x.sourceUrl ? normalizeUrl(x.sourceUrl) : "")));
    const todo = CLASSICS.filter((c) => !have.has(normalizeUrl(c.url)));
    if (!todo.length) return;
    setBusy({ done: 0, total: todo.length });
    setFailed(0);
    const next = async () => {
      for (let c = todo.shift(); c; c = todo.shift()) {
        const r = await importFromUrl(c.url);
        const err = r.ok ? await keep({ ...r.article, title: c.title, author: c.author, published: String(c.year) }, undefined, { topic: c.topic, cover: classicCover(c) }) : r.error;
        if (err) setFailed((n) => n + 1);
        setBusy((b) => b && { ...b, done: b.done + 1 });
      }
    };
    await Promise.all([next(), next(), next()]);
    setBusy(null);
  };

  return (
    <section className="starter" aria-label={t("fillLibrary")}>
      <div className="starter-card is-classics">
        <div className="starter-fan" aria-hidden>
          {CLASSICS.slice(0, 5).map((c, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={c.key} src={classicCover(c)} alt="" style={{ ["--i" as string]: i }} />
          ))}
        </div>
        <div className="min-w-0">
          <p className="starter-title">{count ? t("addClassics") : t("startClassics")}</p>
          <p className="starter-body">{t("dozenEssays")}</p>
          <button type="button" onClick={shelveClassics} disabled={Boolean(busy)} className="starter-btn">
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" /> {t("shelving", { done: busy.done, total: busy.total })}
              </>
            ) : (
              <>
                {t("shelveThem")} <ArrowRight size={15} />
              </>
            )}
          </button>
          {failed > 0 && !busy && <p className="mt-2 text-[12.5px] text-ink-3">{t("failedRead", { n: failed })}</p>}
        </div>
      </div>
      <button type="button" className="starter-card" onClick={onAdd}>
        <span className="starter-icon">
          <Link2 size={20} />
        </span>
        <span className="starter-title">{t("saveOwnLinks")}</span>
        <span className="starter-body">{t("glossSorts")}</span>
      </button>
    </section>
  );
}
