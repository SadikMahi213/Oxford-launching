import { useEffect, useRef, useState } from "react"

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

// Independent update cadence per metric (Part 1 / Part 8):
//   Live Online Users          → every 3 seconds
//   Tasks Completed            → every 5 seconds
//   Earning Activity           → every 10 seconds
// Driven by a SINGLE controlled timer loop (250ms granularity) so we never
// spawn three uncontrolled intervals, and the interval is cleared on unmount
// to avoid leaks / duplicate timers.
export const LIVE_ACTIVITY_INTERVALS = {
  live_online: 3000,
  tasks_completed_today: 5000,
  platform_earnings_activity: 10000,
}

export function useLiveActivity() {
  const [stats, setStats] = useState(() => computeLiveActivity())

  const lastUpdateRef = useRef({
    live_online: 0,
    tasks_completed_today: 0,
    platform_earnings_activity: 0,
  })

  useEffect(() => {
    // Anchor the first update of each metric to fire exactly one interval later.
    const now = Date.now()
    lastUpdateRef.current = {
      live_online: now,
      tasks_completed_today: now,
      platform_earnings_activity: now,
    }

    const id = setInterval(() => {
      const ts = Date.now()
      setStats((prev) => {
        const next = { ...prev }
        let changed = false

        if (ts - lastUpdateRef.current.live_online >= LIVE_ACTIVITY_INTERVALS.live_online) {
          next.live_online = updateBoundedCounter(prev.live_online, LIVE_ACTIVITY_CONFIG.liveOnline)
          lastUpdateRef.current.live_online = ts
          changed = true
        }
        if (ts - lastUpdateRef.current.tasks_completed_today >= LIVE_ACTIVITY_INTERVALS.tasks_completed_today) {
          next.tasks_completed_today = updateBoundedCounter(prev.tasks_completed_today, LIVE_ACTIVITY_CONFIG.tasks)
          lastUpdateRef.current.tasks_completed_today = ts
          changed = true
        }
        if (ts - lastUpdateRef.current.platform_earnings_activity >= LIVE_ACTIVITY_INTERVALS.platform_earnings_activity) {
          next.platform_earnings_activity = updateBoundedCounter(prev.platform_earnings_activity, LIVE_ACTIVITY_CONFIG.earnings)
          lastUpdateRef.current.platform_earnings_activity = ts
          changed = true
        }

        return changed ? next : prev
      })
    }, 250)

    return () => clearInterval(id)
  }, [])

  return stats
}
