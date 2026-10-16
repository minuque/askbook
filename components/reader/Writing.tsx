import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useI18n";

/** Before the first words arrive: three lines of the pen's wash, shimmering. */
export function Writing({ className = "" }: { className?: string }) {
  useLang();
  return (
    <div className={`writing ${className}`} role="status" aria-label={t("writing")}>
      <span style={{ width: "94%" }} />
      <span style={{ width: "82%" }} />
      <span style={{ width: "58%" }} />
    </div>
  );
}
