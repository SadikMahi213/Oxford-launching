import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { getLiveStats } from "../../../api/user.api.js";
import { Users, CheckCircle2, DollarSign } from "lucide-react";

function useAnimatedValue(target, duration = 800) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (Math.abs(diff) < 0.5) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(start + diff * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
        prevRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

function AnimatedNumber({ value, format }) {
  const animated = useAnimatedValue(value);
  return <>{format(animated)}</>;
}

function fmtLiveOnline(v) {
  return Math.round(v).toLocaleString("en-US");
}

function fmtTasks(v) {
  return Math.round(v).toLocaleString("en-US");
}

function fmtEarnings(v) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const POLL_INTERVAL_MIN = 40000;
const POLL_INTERVAL_MAX = 50000;

const cards = [
  {
    key: "live_online",
    label: "Live Online",
    icon: Users,
    color: "emerald",
    format: fmtLiveOnline,
    glow: "rgba(52,211,153,0.25)",
  },
  {
    key: "tasks_completed_today",
    label: "Tasks Completed Today",
    icon: CheckCircle2,
    color: "blue",
    format: fmtTasks,
    glow: "rgba(96,165,250,0.25)",
  },
  {
    key: "earnings_paid_today",
    label: "Today's Earnings Paid",
    icon: DollarSign,
    color: "amber",
    format: fmtEarnings,
    glow: "rgba(251,191,36,0.25)",
  },
];

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-5 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="h-3 w-20 bg-white/10 rounded" />
          </div>
          <div className="h-8 w-32 bg-white/10 rounded mb-2" />
          <div className="h-3 w-24 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorFallback({ onRetry }) {
  return (
    <div className="rounded-2xl bg-red-500/5 backdrop-blur-xl border border-red-500/20 p-5 text-center">
      <p className="text-red-300 text-sm mb-2">Unable to load live statistics</p>
      <button onClick={onRetry} className="text-xs text-red-400 hover:text-red-300 underline transition-colors">
        Tap to retry
      </button>
    </div>
  );
}

export function LiveStats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getLiveStats();
      if (!mountedRef.current) return;
      setData({
        live_online: res.data.live_online,
        tasks_completed_today: res.data.tasks_completed_today,
        earnings_paid_today: res.data.earnings_paid_today,
      });
      setError(null);
      setLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(true);
      setLoading(false);
    }
  }, []);

  const scheduleNext = useCallback(() => {
    const delay = POLL_INTERVAL_MIN + Math.random() * (POLL_INTERVAL_MAX - POLL_INTERVAL_MIN);
    intervalRef.current = setTimeout(async () => {
      await fetchStats();
      if (mountedRef.current) scheduleNext();
    }, delay);
  }, [fetchStats]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats().then(() => {
      if (mountedRef.current) scheduleNext();
    });

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [fetchStats, scheduleNext]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorFallback onRetry={fetchStats} />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="region" aria-label="Live platform statistics">
      {cards.map((card, idx) => {
        const value = data[card.key];
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.4 }}
            className="group relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-5 overflow-hidden hover:border-white/20 transition-all duration-500"
          >
            <div
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${card.glow}, transparent)` }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: card.color === "emerald" ? "#34d399" : card.color === "blue" ? "#60a5fa" : "#fbbf24" }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: card.color === "emerald" ? "#34d399" : card.color === "blue" ? "#60a5fa" : "#fbbf24" }} />
                </span>
                <span className="text-[11px] font-medium text-gray-400 tracking-wide">{card.label}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 tracking-tight tabular-nums">
                <AnimatedNumber value={value} format={card.format} />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  <Icon className={`w-3.5 h-3.5 ${card.color === "emerald" ? "text-emerald-400" : card.color === "blue" ? "text-blue-400" : "text-amber-400"}`} />
                </div>
                <span className="text-[10px] text-gray-500">
                  {card.key === "live_online" && "users online now"}
                  {card.key === "tasks_completed_today" && "completed today"}
                  {card.key === "earnings_paid_today" && "paid to users today"}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
