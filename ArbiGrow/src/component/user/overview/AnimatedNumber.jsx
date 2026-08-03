import { useEffect, useRef, useState } from "react"

function useAnimatedValue(target, duration = 800) {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)
  const rafRef = useRef(null)

  useEffect(() => {
    const start = prevRef.current
    const diff = target - start
    if (Math.abs(diff) < 0.5) {
      prevRef.current = target
      return
    }
    const startTime = performance.now()

    const tick = (now) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - (1 - t) * (1 - t)
      setDisplay(start + diff * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(target)
        prevRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return display
}

export function AnimatedNumber({ value, format }) {
  const animated = useAnimatedValue(value)
  return <>{format(animated)}</>
}
