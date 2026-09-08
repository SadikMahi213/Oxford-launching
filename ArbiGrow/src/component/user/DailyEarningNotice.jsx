import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone } from "lucide-react";
import { getEarningStatus } from "../../api/user.api.js";

// Shared official notice shown in Daily Earning areas when the admin
// Daily ROI / Daily Earning configuration is OFF. Renders nothing when
// earning is enabled (or while the status is still loading), so ON-state
// pages are visually unchanged. The backend still enforces the switch.
export default function DailyEarningNotice() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEarningStatus()
      .then((res) => {
        const data = res?.data || res;
        if (!cancelled && data?.enabled === false) {
          setVisible(true);
        }
      })
      .catch(() => {
        // Fail open on status-check errors; the backend still enforces the gate.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-5 text-center sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <Megaphone className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          <h2 className="text-base font-extrabold tracking-wide text-amber-200 sm:text-lg">
            {t("dailyEarningNotice.title")}
          </h2>
        </div>
        <div className="mt-3 space-y-2 break-words text-xs leading-relaxed text-amber-100/90 sm:text-sm">
          <p>{t("dailyEarningNotice.intro")}</p>
          <p className="font-semibold text-amber-200">{t("dailyEarningNotice.holidays")}</p>
          <p>{t("dailyEarningNotice.holidayNote")}</p>
          <p>{t("dailyEarningNotice.resume")}</p>
          <p className="pt-1 font-bold text-amber-200">{t("dailyEarningNotice.sign")}</p>
        </div>
      </div>
    </div>
  );
}
