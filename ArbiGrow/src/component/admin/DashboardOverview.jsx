import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  CircleDollarSign,
  Clock3,
  Users,
  UserCheck,
  Wallet,
  CheckCircle,
  UsersRound,
  Banknote,
  ArrowUpFromLine,
  ArrowLeftFromLine,
  ArrowRightLeft,
  Gift,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router";
import { getAdminDashboardOverview, getAdminRealtimeStats } from "../../api/admin.api.js";
import useUserStore from "../../store/userStore.js";

const toAmount = (value) => Number(value ?? 0);

export default function DashboardOverview() {
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);
  const logout = useUserStore((state) => state.logout);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState({
    users: { total: 0, active: 0 },
    kyc: { pending: 0 },
    investments: {
      active: 0,
      completed: 0,
      total_invested: "0",
      profit_distributed: "0",
    },
  });

  const [realtime, setRealtime] = useState(null);
  const [rtLoading, setRtLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await getAdminDashboardOverview(token);
        if (response) setOverview(response);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          logout();
          navigate("/login");
          return;
        }
        setError(err?.response?.data?.detail || "Failed to load dashboard overview.");
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, [token, navigate, logout]);

  const fetchRealtime = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAdminRealtimeStats(token);
      if (data) setRealtime(data);
    } catch {
      // ignore polling errors
    } finally {
      setRtLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRealtime();
    const iv = setInterval(fetchRealtime, 15000);
    return () => clearInterval(iv);
  }, [fetchRealtime]);

  const cards = useMemo(
    () => [
      {
        label: "Total Users",
        value: String(overview?.users?.total ?? 0),
        icon: Users,
      },
      {
        label: "Active Users",
        value: String(overview?.users?.active ?? 0),
        icon: UserCheck,
      },
      {
        label: "Processing Verifications",
        value: String(overview?.kyc?.pending ?? 0),
        icon: Clock3,
      },
      {
        label: "Active Investments",
        value: String(overview?.investments?.active ?? 0),
        icon: Wallet,
      },
      {
        label: "Completed Investments",
        value: String(overview?.investments?.completed ?? 0),
        icon: CheckCircle,
      },
      {
        label: "Total Invested (USDT)",
        value: `$${toAmount(overview?.investments?.total_invested).toLocaleString()}`,
        icon: CircleDollarSign,
      },
      {
        label: "Profit Distributed (USDT)",
        value: `$${toAmount(overview?.investments?.profit_distributed).toLocaleString()}`,
        icon: CircleDollarSign,
      },
    ],
    [overview],
  );

  const realtimeCards = useMemo(() => {
    if (!realtime) return [];
    return [
      {
        label: "Users with Deposits",
        value: String(realtime.users_with_deposits ?? 0),
        icon: UsersRound,
      },
      {
        label: "Total Deposited (USDT)",
        value: `$${toAmount(realtime.total_deposited).toLocaleString()}`,
        icon: Banknote,
      },
      {
        label: "Total Withdrawn (USDT)",
        value: `$${toAmount(realtime.total_withdrawn).toLocaleString()}`,
        icon: ArrowUpFromLine,
      },
      {
        label: "Total Transferred (USDT)",
        value: `$${toAmount(realtime.total_transferred).toLocaleString()}`,
        icon: ArrowRightLeft,
      },
      {
        label: "Total Distributed (USDT)",
        value: `$${toAmount(realtime.total_distributed).toLocaleString()}`,
        icon: Gift,
      },
      {
        label: "E-commerce Wallet Funded (USDT)",
        value: `$${toAmount(realtime.total_ecommerce_funded).toLocaleString()}`,
        icon: ShoppingCart,
      },
    ];
  }, [realtime]);

  const profitColor =
    realtime && toAmount(realtime.company_running_profit) >= 0
      ? "text-emerald-400"
      : "text-red-400";

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Admin{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Overview
          </span>
        </h1>
        <p className="text-gray-400">Real-time admin system metrics (auto-refreshes every 15s)</p>
      </div>

      {loading && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
          Loading dashboard data...
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Standard Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {cards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
          >
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <stat.icon className="w-4 h-4 text-cyan-400" />
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Real-time Statistics Section */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-1">
          Real-Time{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Financial Statistics
          </span>
        </h2>
        <p className="text-gray-400 text-sm">Calculated live from database transactions</p>
      </div>

      {rtLoading && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
          Loading financial statistics...
        </div>
      )}

      {realtime && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {realtimeCards.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-6 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <stat.icon className="w-4 h-4 text-emerald-400" />
                  {stat.label}
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Company Running Profit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
          >
            <div className="absolute -inset-[1px] bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-40"></div>
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Company Running Profit (USDT)</div>
                <div className={`text-3xl font-bold ${profitColor}`}>
                  ${toAmount(realtime.company_running_profit).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Total Deposits − Total Withdrawals − Total Distributions
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}