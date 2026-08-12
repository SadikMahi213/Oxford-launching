import { useEffect, useState } from "react"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const LIVE_ACTIVITY_CONFIG = {
  tasks: {
    dailyStart: 1200,
    dailyMax: 21000,
    exponent: 1.3,
    variance: 0.05,
  },
  platformActivity: {
    dailyStart: 1500,
    dailyMax: 86000,
    exponent: 1.3,
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

function dayProgress(now) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return clamp01((now.getTime() - start) / MS_PER_DAY)
}

function dailyFactor(now) {
  const ymd = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const x = Math.sin(ymd * 12.9898) * 43758.5453
  const frac = x - Math.floor(x)
  return 1 + (frac - 0.5) * 2 * LIVE_ACTIVITY_CONFIG.tasks.variance
}

function cumulativeValue(now, cfg) {
  const p = dayProgress(now)
  const eased = Math.pow(p, cfg.exponent)
  const max = cfg.dailyMax * dailyFactor(now)
  return cfg.dailyStart + (max - cfg.dailyStart) * eased
}

function liveOnlineValue(now) {
  const { min, peak, peakHour, ripple } = LIVE_ACTIVITY_CONFIG.liveOnline
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  const wave = (1 + Math.cos(((h - peakHour) / 24) * Math.PI * 2)) / 2
  const drift = Math.sin((now.getTime() / (30 * 60 * 1000)) * Math.PI * 2) * ripple * (peak - min)
  return min + Math.max(0, peak - min) * wave + drift
}

export function computeLiveActivity(now = new Date()) {
  return {
    live_online: liveOnlineValue(now),
    tasks_completed_today: cumulativeValue(now, LIVE_ACTIVITY_CONFIG.tasks),
    platform_activity_today: cumulativeValue(now, LIVE_ACTIVITY_CONFIG.platformActivity),
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