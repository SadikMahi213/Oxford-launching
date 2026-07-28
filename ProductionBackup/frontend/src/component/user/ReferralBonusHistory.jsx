import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Users, Search, ChevronLeft, ChevronRight } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import { getReferralBonuses } from "../../api/user.api.js";
import { useTranslation } from "react-i18next";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message;

export default function ReferralBonusHistory({ setActivePage }) {
  const { t } = useTranslation();
  const token = useUserStore((state) => state.token);
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const limit = 20;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await getReferralBonuses({ page, limit, search: search || undefined });
      const d = res.data;
      setBonuses(d.data || []);
      setTotal(d.total || 0);
    } catch (e) {
      setError(getErrorMessage(e) || t("referralBonusHistory.error"));
    }
    setLoading(false);
  }, [token, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setActivePage?.("overview")} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t("referralBonusHistory.title")}</h1>
            <p className="text-sm text-gray-400">{t("referralBonusHistory.subtitle")}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={t("referralBonusHistory.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-12">{t("referralBonusHistory.loading")}</p>
        ) : bonuses.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">{t("referralBonusHistory.noBonuses")}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left p-4 text-gray-400 font-medium">{t("referralBonusHistory.user")}</th>
                    <th className="text-left p-4 text-gray-400 font-medium">{t("referralBonusHistory.username")}</th>
                    <th className="text-right p-4 text-gray-400 font-medium">{t("referralBonusHistory.amount")}</th>
                    <th className="text-right p-4 text-gray-400 font-medium">{t("referralBonusHistory.rate")}</th>
                    <th className="text-right p-4 text-gray-400 font-medium">{t("referralBonusHistory.date")}</th>
                    <th className="text-center p-4 text-gray-400 font-medium">{t("referralBonusHistory.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bonuses.map((b) => (
                    <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4 text-white">{b.source_name}</td>
                      <td className="p-4 text-gray-400">@{b.source_username}</td>
                      <td className="p-4 text-right text-emerald-400 font-medium">+{b.amount.toFixed(2)}</td>
                      <td className="p-4 text-right text-gray-300">{b.percentage}%</td>
                      <td className="p-4 text-right text-gray-400 whitespace-nowrap">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
                <span className="text-sm text-gray-400">{t("referralBonusHistory.page", { page, totalPages })}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
