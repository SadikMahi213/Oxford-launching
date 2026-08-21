import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Rocket } from "lucide-react";

const LAUNCH_DATE = new Date("2026-09-20T00:00:00").getTime();

function calculateTimeLeft() {
  const now = Date.now();
  const diff = LAUNCH_DATE - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isLive: false,
  };
}

const TimeUnit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="relative">
      <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-[#0d1137]/80 to-[#0a0e27]/90 border border-cyan-500/20 flex items-center justify-center backdrop-blur-sm">
        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white tabular-nums min-w-[2ch] text-center">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 -z-10 blur-sm" />
    </div>
    <span className="mt-1.5 text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-medium">
      {label}
    </span>
  </div>
);

const Separator = () => (
  <div className="flex flex-col items-center justify-center gap-1 px-1 sm:px-2 pb-4">
    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
  </div>
);

export default function LaunchCountdown() {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full bg-gradient-to-r from-[#0d1137]/95 via-[#0a0e27]/98 to-[#0d1137]/95 border-y border-cyan-500/10 backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-3 md:py-4">
        {/* Desktop layout */}
        <div className="hidden md:flex items-center justify-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs text-cyan-400 uppercase tracking-widest font-semibold">
                {t("homePage.countdown.badge")}
              </div>
              <div className="text-sm text-white font-medium">
                {t("homePage.countdown.title")}
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="flex items-center gap-3 sm:gap-4">
            {timeLeft.isLive ? (
              <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                <span className="text-lg font-bold text-green-400 uppercase tracking-wider">
                  {t("homePage.countdown.live")}
                </span>
              </div>
            ) : (
              <>
                <TimeUnit value={timeLeft.days} label={t("homePage.countdown.days")} />
                <Separator />
                <TimeUnit value={timeLeft.hours} label={t("homePage.countdown.hours")} />
                <Separator />
                <TimeUnit value={timeLeft.minutes} label={t("homePage.countdown.minutes")} />
                <Separator />
                <TimeUnit value={timeLeft.seconds} label={t("homePage.countdown.seconds")} />
              </>
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <Rocket className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold leading-tight">
                  {t("homePage.countdown.badge")}
                </div>
                <div className="text-xs text-white font-medium truncate">
                  {t("homePage.countdown.launchDate")}
                </div>
              </div>
            </div>

            {timeLeft.isLive ? (
              <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 flex-shrink-0">
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                  {t("homePage.countdown.live")}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-white tabular-nums min-w-[2ch] text-center">
                    {String(timeLeft.days).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-gray-500 uppercase">{t("homePage.countdown.days")}</span>
                </div>
                <span className="text-cyan-400/50 text-xs">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-white tabular-nums min-w-[2ch] text-center">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-gray-500 uppercase">{t("homePage.countdown.hours")}</span>
                </div>
                <span className="text-cyan-400/50 text-xs">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-white tabular-nums min-w-[2ch] text-center">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-gray-500 uppercase">{t("homePage.countdown.minutes")}</span>
                </div>
                <span className="text-cyan-400/50 text-xs">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-white tabular-nums min-w-[2ch] text-center">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-gray-500 uppercase">{t("homePage.countdown.seconds")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
