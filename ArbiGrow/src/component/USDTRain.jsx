import { useEffect, useState, useMemo } from "react";

// USDT-themed rain for UserDashboard — replaces JPG coin rain.
// Premium, subtle, non-blocking, responsive, reduced-motion aware.
// Uses existing DollarSign visual concept via "$" + USDT badge styling, no extra assets.
export default function USDTRain({ enabled = true }) {
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => {
      mql.removeEventListener?.("change", update);
      window.removeEventListener("resize", check);
    };
  }, []);

  const particles = useMemo(() => {
    if (reducedMotion || !enabled) return [];
    const count = isMobile ? 12 : 20;
    return Array.from({ length: count }, (_, i) => {
      const left = Math.random() * 100;
      const size = isMobile ? 13 + Math.random() * 10 : 16 + Math.random() * 14; // px for $ glyph
      const duration = 5 + Math.random() * 4; // 5-9s premium slow fall
      const delay = Math.random() * 5;
      const drift = (Math.random() - 0.5) * 80;
      const opacity = 0.14 + Math.random() * 0.26;
      const rot = -10 + Math.random() * 20;
      return { id: i, left, size, duration, delay, drift, opacity, rot };
    });
  }, [isMobile, reducedMotion, enabled]);

  if (reducedMotion || !enabled) return null;

  return (
    <>
      <style>{`
        @keyframes usdtFall {
          0% { transform: translateY(-70px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: var(--op); }
          90% { opacity: var(--op); }
          100% { transform: translateY(110vh) translateX(var(--drift)) rotate(var(--rot)); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .usdt-rain { display: none !important; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="usdt-rain fixed inset-0 overflow-hidden pointer-events-none select-none"
        style={{ zIndex: 1 }} // behind sidebar (z-50) and modals, above background
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute font-black flex items-center justify-center rounded-full"
            style={{
              left: `${p.left}%`,
              top: `-60px`,
              width: `${p.size * 1.35}px`,
              height: `${p.size * 1.35}px`,
              fontSize: `${p.size}px`,
              // CSS variables for animation
              ["--op"]: p.opacity,
              ["--drift"]: `${p.drift}px`,
              ["--rot"]: `${p.rot}deg`,
              // USDT-themed: emerald/cyan pill with $ + subtle USDT label
              background: `linear-gradient(135deg, rgba(16,185,129,${(p.opacity * 0.9).toFixed(2)}) 0%, rgba(6,182,212,${(p.opacity * 0.7).toFixed(2)}) 100%)`,
              border: `1px solid rgba(52,211,153,${(p.opacity * 0.5).toFixed(2)})`,
              color: `rgba(255,255,255,${(p.opacity + 0.45).toFixed(2)})`,
              boxShadow: `0 0 ${Math.round(p.size * 0.6)}px rgba(16,185,129,${(p.opacity * 0.4).toFixed(2)}), inset 0 1px 2px rgba(255,255,255,0.5)`,
              textShadow: `0 1px 2px rgba(0,0,0,0.4)`,
              animation: `usdtFall ${p.duration}s linear ${p.delay}s infinite`,
              willChange: "transform, opacity",
              lineHeight: 1,
              fontFamily: "Inter, Poppins, ui-sans-serif",
            }}
            title="USDT"
          >
            $
          </span>
        ))}
      </div>
    </>
  );
}
