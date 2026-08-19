import { useEffect, useState } from "react"

export const LIVE_ACTIVITY_CONFIG = {
  liveOnline: {
    min: 178919,
    max: 587391,
    start: 178919,
    step: 55,
    decimals: 0,
  },
  tasks: {
    min: 21893,
    max: 89791,
    start: 21893,
    step: 48,
    decimals: 0,
  },
  earnings: {
    min: 19390.85,
    max: 27573.85,
    start: 19390.85,
    step: 38.5,
    decimals: 2,
  },
}

// Bounded controlled random walk (presentation-layer live activity only).
// - a small random delta each tick
// - bias toward the center: near the max it is pulled down, near the min pushed up
// - result is clamped to [min, max] and rounded to `decimals` (decimal-safe for money)
function updateBoundedCounter(current, cfg) {
  const { min, max, step, decimals } = cfg
  const range = max - min
  const t = range > 0 ? (current - min) / range : 0 // 0 at min, 1 at max
  const bias = (0.5 - t) * 2 // +1 near min (up bias), -1 near max (down bias)
  const rand = (Math.random() * 2 - 1) * step
  const f = Math.pow(10, decimals)
  let next = Math.min(max, Math.max(min, current + rand + bias * step))
  next = Math.round(next * f) / f
  // Guarantee the counter always moves (avoid a tick-to-tick "stuck" value),
  // nudging in the bias direction (or random direction near the center).
  if (next === current) {
    const unit = 1 / f
    const dir = bias > 0 ? unit : bias < 0 ? -unit : Math.random() < 0.5 ? unit : -unit
    next = Math.min(max, Math.max(min, Math.round((current + dir) * f) / f))
  }
  return next
}

export function computeLiveActivity() {
  return {
    live_online: LIVE_ACTIVITY_CONFIG.liveOnline.start,
    tasks_completed_today: LIVE_ACTIVITY_CONFIG.tasks.start,
    platform_earnings_activity: LIVE_ACTIVITY_CONFIG.earnings.start,
  }
}

export function useLiveActivity(intervalMs = 1000) {
  const [stats, setStats] = useState(() => computeLiveActivity())

  useEffect(() => {
    const id = setInterval(() => {
      setStats((prev) => ({
        live_online: updateBoundedCounter(prev.live_online, LIVE_ACTIVITY_CONFIG.liveOnline),
        tasks_completed_today: updateBoundedCounter(prev.tasks_completed_today, LIVE_ACTIVITY_CONFIG.tasks),
        platform_earnings_activity: updateBoundedCounter(prev.platform_earnings_activity, LIVE_ACTIVITY_CONFIG.earnings),
      }))
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return stats
}
