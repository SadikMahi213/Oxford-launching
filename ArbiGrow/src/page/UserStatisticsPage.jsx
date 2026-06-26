import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, ArrowLeft } from "lucide-react";
import useUserStore from "../store/userStore";
import { getUserStatistics, getUserList } from "../api/user.api.js";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 flex items-center gap-4"
  >
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </motion.div>
);

const UserStatisticsPage = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total_users: 0, active_users: 0, inactive_users: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useUserStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, listRes] = await Promise.all([
          getUserStatistics(),
          getUserList(1, 50),
        ]);
        setStats(statsRes.data);
        setUsers(Array.isArray(listRes?.data?.users) ? listRes.data.users : []);
      } catch (err) {
        console.error("Failed to load user statistics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("userStatistics.back")}
        </button>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t("userStatistics.title")}
          </span>
        </h1>
        <p className="text-sm text-gray-400">{t("userStatistics.subtitle")}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label={t("userStatistics.totalUsers")} value={stats.total_users} color="bg-gradient-to-br from-blue-600 to-blue-400" />
        <StatCard icon={UserCheck} label={t("userStatistics.activeUsers")} value={stats.active_users} color="bg-gradient-to-br from-green-600 to-green-400" />
        <StatCard icon={UserX} label={t("userStatistics.inactiveUsers")} value={stats.inactive_users} color="bg-gradient-to-br from-gray-600 to-gray-400" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">{t("userStatistics.allUsers")}</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">{t("userStatistics.loading")}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{t("userStatistics.noUsersFound")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-left">
                  <th className="px-5 py-3 font-medium">{t("userStatistics.name")}</th>
                  <th className="px-5 py-3 font-medium">{t("userStatistics.email")}</th>
                  <th className="px-5 py-3 font-medium">{t("userStatistics.status")}</th>
                  <th className="px-5 py-3 font-medium">{t("userStatistics.registrationDate")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id || i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-white">{u.full_name || u.name || "—"}</td>
                    <td className="px-5 py-3 text-gray-300">{u.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {u.status === "active" ? t("userStatistics.activeUsers") : t("userStatistics.inactiveUsers")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-300">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UserStatisticsPage;
