import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  CircleDollarSign,
  Clock3,
  Users,
  UserCheck,
  Wallet,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { getAdminDashboardOverview } from "../../api/admin.api.js";
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
        if (response) {
          setOverview(response);
        }
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
        label: "Pending Verifications",
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

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Admin{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Overview
          </span>
        </h1>
        <p className="text-gray-400">Real-time admin system metrics</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
    </div>
  );
}
