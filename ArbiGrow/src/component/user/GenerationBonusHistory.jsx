import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, GitBranch, Search, ChevronLeft, ChevronRight } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import { getGenerationBonuses } from "../../api/user.api.js";
import { useTranslation } from "react-i18next";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message;

const LEVEL_LABELS = { 2: "genLevel2", 3: "genLevel3", 4: "genLevel4", 5: "genLevel5" };
const LEVEL_COLORS = {
  2: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  3: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  4: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  5: "text-pink-400 bg-pink-500/10 border-pink-500/30",
};

export default function GenerationBonusHistory({ setActivePage }) {
  const { t } = useTranslation();
  const token = useUserStore((state) => state.token);
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const limit = 20;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (levelFilter) params.level = levelFilter;
      const res = await getGenerationBonuses(params);
      const d = res.data;
      setBonuses(d.data || []);
      setTotal(d.total || 0);
    } catch (e) {
      setError(getErrorMessage(e) || t("genBonus.error"));
    }
    setLoading(false);
  }, [token, page, search, levelFilter]);

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
            <GitBranch className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t("genBonus.title")}</h1>
            <p className="text-sm text-gray-400">{t("genBonus.subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={t("genBonus.search_plh")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">{t("genBonus.all")}</option>
            <option value="2">{t("genBonus.gen2")}</option>
            <option value="3">{t("genBonus.gen3")}</option>
            <option value="4">{t("genBonus.gen4")}</option>
            <option value="5">{t("genBonus.gen5")}</option>
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-12">{t("genBonus.loading")}</p>
        ) : bonuses.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">{t("genBonus.empty")}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left p-4 text-gray-400 font-medium">{t("genBonus.user")}</th>
                    <th className="text-left p-4 text-gray-400 font-medium">{t("genBonus.username")}</th>
                    <th className="text-center p-4 text-gray-400 font-medium">{t("genBonus.generation")}</th>
                    <th className="text-right p-4 text-gray-400 font-medium">{t("genBonus.amount")}</th>
                    <th className="text-right p-4 text-gray-400 font-medium">{t("genBonus.rate")}</th>
                    <th className="text-right p-4 text-gray-400 font-medium">{t("genBonus.date")}</th>
                    <th className="text-center p-4 text-gray-400 font-medium">{t("genBonus.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bonuses.map((b) => (
                    <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4 text-white">{b.source_name}</td>
                      <td className="p-4 text-gray-400">@{b.source_username}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${LEVEL_COLORS[b.level] || "text-gray-400 bg-white/5 border-white/10"}`}>
                          {LEVEL_LABELS[b.level] ? t(`genBonus.${LEVEL_LABELS[b.level]}`) : t("genBonus.genLevelN", { level: b.level })}
                        </span>
                      </td>
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
                <span className="text-sm text-gray-400">{t("genBonus.page", { page, totalPages })}</span>
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
