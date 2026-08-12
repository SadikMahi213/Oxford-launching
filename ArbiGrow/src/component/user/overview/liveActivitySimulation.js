import { useEffect, useState } from "react"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const LIVE_ACTIVITY_CONFIG = {
  tasks: {
    start: 1000,
    max: 21000,
    exponent: 1.35,
    variance: 0.05,
  },
  platformEarnings: {
    start: 1000,
    max: 7700,
    exponent: 1.35,
    variance: 0.05,
  },
  liveOnline: {
    min: 240000,
    peak: 1050000,
    peakHour: 20,
    ripple: 0.02,
  },
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))

function dayProgress(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return clamp01((date.getTime() - start) / MS_PER_DAY)
}

function dayFactor(date) {
  const ymd = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const x = Math.sin(ymd * 12.9898) * 43758.5453
  const frac = x - Math.floor(x)
  return 1 + (frac - 0.5) * 2 * LIVE_ACTIVITY_CONFIG.tasks.variance
}

function cumulativeValue(date, cfg) {
  const p = dayProgress(date)
  const eased = Math.pow(p, cfg.exponent)
  const max = cfg.max * dayFactor(date)
  return cfg.start + (max - cfg.start) * eased
}

function liveOnlineValue(date) {
  const { min, peak, peakHour, ripple } = LIVE_ACTIVITY_CONFIG.liveOnline
  const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
  const wave = (1 + Math.cos(((h - peakHour) / 24) * Math.PI * 2)) / 2
  const drift = Math.sin((date.getTime() / (30 * 60 * 1000)) * Math.PI * 2) * ripple * (peak - min)
  return min + Math.max(0, peak - min) * wave + drift
}

export function computeLiveActivity(date = new Date()) {
  return {
    live_online: liveOnlineValue(date),
    tasks_completed_today: cumulativeValue(date, LIVE_ACTIVITY_CONFIG.tasks),
    platform_earnings_activity: cumulativeValue(date, LIVE_ACTIVITY_CONFIG.platformEarnings),
  }
}

export function useLiveActivity(intervalMs = 1000) {
  const [stats, setStats] = useState(() => computeLiveActivity())

  useEffect(() => {
    const id = setInterval(() => setStats(computeLiveActivity()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return stats
}