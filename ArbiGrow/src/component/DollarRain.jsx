import { useEffect, useState, useMemo } from "react";

// Premium subtle US dollar rain — CSS-only, capped DOM, responsive, reduced-motion aware.
// Keeps existing animation mechanism idea (continuous spawn via CSS infinite, randomized per particle).
export default function DollarRain() {
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mqlMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(mqlMotion.matches);
    updateMotion();
    mqlMotion.addEventListener?.("change", updateMotion);

    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      mqlMotion.removeEventListener?.("change", updateMotion);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const particles = useMemo(() => {
    const count = isMobile ? 10 : 22;
    return Array.from({ length: count }, (_, i) => {
      const left = Math.random() * 100; // %
      const size = isMobile
        ? 11 + Math.random() * 9 // 11-20px mobile
        : 14 + Math.random() * 18; // 14-32px desktop
      const duration = 4 + Math.random() * 5; // 4-9s
      const delay = Math.random() * 6; // 0-6s staggered start
      const drift = (Math.random() - 0.5) * 70; // -35..35px horizontal drift
      const opacity = 0.12 + Math.random() * 0.28; // 0.12-0.4 subtle
      const rotation = -12 + Math.random() * 24; // -12..12deg
      const swayDuration = duration * 0.9;
      return { id: i, left, size, duration, delay, drift, opacity, rotation, swayDuration };
    });
  }, [isMobile]);

  if (reducedMotion) return null;

  return (
    <>
      <style>{`
        @keyframes dollarFall {
          0%   { transform: translateY(-60px) translateX(0) rotate(0deg); opacity: 0; }
          8%   { opacity: var(--op); }
          92%  { opacity: var(--op); }
          100% { transform: translateY(110vh) translateX(var(--drift)) rotate(var(--rot)); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dollar-rain { display: none !important; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="dollar-rain absolute inset-0 overflow-hidden pointer-events-none select-none"
        style={{ zIndex: 0 }}
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute font-black select-none"
            style={{
              left: `${p.left}%`,
              top: `-50px`,
              fontSize: `${p.size}px`,
              // CSS variables for keyframes
              ["--op"]: p.opacity,
              ["--drift"]: `${p.drift}px`,
              ["--rot"]: `${p.rotation}deg`,
              // premium dollar look: emerald/cyan subtle glow, not solid coin
              color: `rgba(52,211,153,${p.opacity + 0.15})`,
              textShadow: `0 0 10px rgba(16,185,129,${(p.opacity * 0.6).toFixed(2)}), 0 1px 2px rgba(0,0,0,0.4)`,
              fontFamily: "Inter, Poppins, ui-sans-serif, system-ui",
              lineHeight: 1,
              fontWeight: 800,
              // GPU-friendly animation
              animation: `dollarFall ${p.duration}s linear ${p.delay}s infinite`,
              willChange: "transform, opacity",
              // slight blur for depth on larger particles
              filter: p.size > 24 ? "blur(0.2px)" : "none",
            }}
          >
            $
          </span>
        ))}
      </div>
    </>
  );
}
