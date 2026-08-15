import { useEffect, useRef, useState, memo } from "react"
import { useTranslation } from "react-i18next"
import { Users, CheckCircle2, DollarSign } from "lucide-react"
import { AnimatedNumber } from "./AnimatedNumber.jsx"
import { useLiveActivity } from "./liveActivitySimulation.js"
import { fmtLiveOnline, fmtTasks, fmtEarnings } from "./liveStatsFormat.js"

const SPIN_KEYFRAMES = `
@keyframes ofa-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
@keyframes ofa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes ofa-glow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
`

const CIRCULAR_STATS = [
  {
    key: "live_online",
    labelKey: "liveStats.liveOnline",
    icon: Users,
    format: fmtLiveOnline,
    ring: "rgba(34,211,153,0.9)",
    ringSoft: "rgba(34,211,153,0.25)",
    text: "#34d399",
  },
  {
    key: "tasks_completed_today",
    labelKey: "liveStats.tasksCompletedToday",
    icon: CheckCircle2,
    format: fmtTasks,
    ring: "rgba(59,130,246,0.9)",
    ringSoft: "rgba(59,130,246,0.25)",
    text: "#3b82f6",
  },
  {
    key: "platform_earnings_activity",
    labelKey: "liveStats.platformEarningsActivity",
    icon: DollarSign,
    format: fmtEarnings,
    ring: "rgba(245,158,11,0.9)",
    ringSoft: "rgba(245,158,11,0.25)",
    text: "#f59e0b",
  },
]

const StatLabel = memo(function StatLabel({ labelKey, color }) {
  const { t } = useTranslation()
  return (
    <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-center px-1 leading-tight" style={{ color }}>
      {t(labelKey)}
    </div>
  )
})

function CircularStat({ stat, value, className = "" }) {
  const Icon = stat.icon
  return (
      <div className={"flex flex-col items-center gap-2 sm:border-l sm:border-white/[0.06] first:sm:border-l-0 " + className}>
        <div
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
          style={{
            background: `conic-gradient(${stat.ring} 0deg, ${stat.ringSoft} 360deg)`,
            padding: "2px",
            filter: `drop-shadow(0 0 12px ${stat.ringSoft})`,
          }}
        >
          <div className="w-full h-full rounded-full bg-[#0d1128] flex items-center justify-center">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: stat.text }} />
          </div>
        </div>
        <div className="text-base sm:text-xl font-extrabold text-white tabular-nums leading-none whitespace-nowrap">
          <AnimatedNumber value={value} format={stat.format} />
        </div>
        <StatLabel labelKey={stat.labelKey} color={stat.text} />
      </div>
  )
}

const OFACryptocurrency = () => {
  const { t } = useTranslation()
  const cardRef = useRef(null)
  const coinRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  const stats = useLiveActivity()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      if (coinRef.current) {
        coinRef.current.style.transform = `rotateY(${x * 25}deg) rotateX(${-y * 25}deg)`
      }
    }

    const handleMouseLeave = () => {
      if (coinRef.current) {
        coinRef.current.style.transform = "rotateY(0deg) rotateX(0deg)"
      }
    }

    card.addEventListener("mousemove", handleMouseMove)
    card.addEventListener("mouseleave", handleMouseLeave)
    return () => {
      card.removeEventListener("mousemove", handleMouseMove)
      card.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  if (!mounted) return null

  return (
    <>
      <style>{SPIN_KEYFRAMES}</style>
      <div
        ref={cardRef}
        className="relative p-5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.1)] overflow-hidden group"
      >
        {/* Animated bg orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-40 h-40 rounded-full bg-blue-500/5 blur-3xl" style={{ animation: "ofa-glow-pulse 4s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-cyan-500/5 blur-3xl" style={{ animation: "ofa-glow-pulse 4s ease-in-out infinite", animationDelay: "2s" }} />

        {/* Header */}
        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
          {t("overview.ofaCoin.title")}
        </h3>
        <p className="text-[11px] text-blue-300/70 mb-3 tracking-wide">{t("overview.ofaCoin.subtitle")}</p>

        {/* Center Token */}
        <div className="relative flex items-center justify-center py-4">
          <div
            ref={coinRef}
            className="relative w-28 h-28 rounded-full cursor-pointer shadow-[0_0_28px_rgba(212,175,55,0.35)]"
            style={{ transformStyle: "preserve-3d", perspective: "800px", transition: "transform 0.15s ease-out", animation: "ofa-float 3s ease-in-out infinite" }}
          >
            {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFD700]/45 via-[#D4AF37]/35 to-[#B8860B]/40 blur-xl" style={{ animation: "ofa-glow-pulse 3s ease-in-out infinite" }} />

            {/* Outer glowing gradient ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFE9A8] via-[#FFD700] to-[#D4AF37] shadow-[0_0_38px_rgba(212,175,55,0.55)]" style={{ clipPath: "inset(2px round 50%)", animation: "ofa-spin 10s linear infinite" }} />

            {/* Inner dark circle */}
              <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-[#2a2310] to-[#15110a] border border-[#D4AF37]/40 flex items-center justify-center shadow-[inset_0_0_30px_rgba(212,175,55,0.25)]">
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-400/5" />

              {/* OFA TOKEN symbol */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="text-xl font-black bg-gradient-to-br from-[#FFF1C2] via-[#FFD700] to-[#D4AF37] bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 14px rgba(212,175,55,0.7))" }}>
                  OFA
                </div>
                <div className="text-[8px] text-[#E8C66A] mt-0.5 font-mono tracking-widest">{t("overview.ofaCoin.token")}</div>
              </div>

              {/* Decorative rings */}
                <div className="absolute inset-[6px] rounded-full border border-[#D4AF37]/25" />
                <div className="absolute inset-[10px] rounded-full border border-dashed border-[#FFD700]/30" style={{ animation: "ofa-spin 20s linear infinite" }} />
                <div className="absolute inset-[14px] rounded-full border border-[#D4AF37]/15" />
            </div>

            {/* Inner shine */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-transparent via-white/5 to-transparent pointer-events-none" />

            {/* Top reflection */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-8 rounded-full bg-gradient-to-b from-white/10 to-transparent blur-sm pointer-events-none" />
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-gray-400 leading-relaxed text-center mt-1">
          {t("overview.ofaCoin.description")}
        </p>

        {/* Live Platform Activity */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
          <span className="text-[13px] text-gray-400 uppercase tracking-wider">{t("liveStats.livePlatformActivity")}</span>
        </div>

        {/* Three Circular Statistics */}
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {CIRCULAR_STATS.map((stat) => (
            <CircularStat
              key={stat.key}
              stat={stat}
              value={stats[stat.key]}
              className={stat.key === "platform_earnings_activity" ? "min-[480px]:max-sm:col-span-2" : ""}
            />
          ))}
        </div>

        {/* Token heading */}
        <h4 className="text-sm font-bold text-white mt-5 mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE9A8] to-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.7)]" />
          {t("overview.ofaCoin.tokenHeading")}
        </h4>

        {/* Lower information cards */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { label: t("overview.ofaCoin.symbol"), value: t("overview.tokenInfo.symbolVal") },
            { label: t("overview.ofaCoin.supply"), value: t("overview.tokenInfo.supplyVal") },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</div>
              <div className="text-[10px] sm:text-xs font-bold text-white mt-0.5 break-words leading-tight">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default OFACryptocurrency
