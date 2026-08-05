import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Trophy,
  Target,
  TrendingUp,
  Layers,
  Award,
  Info,
  ChevronRight,
  ChevronLeft,
  Search,
  Download,
} from "lucide-react";
import useUserStore from "../../store/userStore.js";
import {
  getUserRankInfo,
  getAllRanks,
  getMyRankHistory,
  getMyMatchingBonuses,
} from "../../api/user.api.js";
import { useTranslation } from "react-i18next";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

export default function MatchingBonusInfo({ setActivePage }) {
  const { t } = useTranslation();
  const token = useUserStore((state) => state.token);
  const user = useUserStore((state) => state.user);
  const [rankInfo, setRankInfo] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [rankHistory, setRankHistory] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [historyPage, setHistoryPage] = useState(1);
  const [bonusPage, setBonusPage] = useState(1);
  const [bonusTotal, setBonusTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const historyLimit = 10;
  const bonusLimit = 10;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [rankInfoRes, ranksRes, historyRes, bonusRes] = await Promise.all([
        getUserRankInfo(),
        getAllRanks(),
        getMyRankHistory(),
        getMyMatchingBonuses({ page: 1, limit: 200 }),
      ]);
      setRankInfo(rankInfoRes.data);
      setRanks(Array.isArray(ranksRes.data) ? ranksRes.data : []);
      setRankHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      const bData = Array.isArray(bonusRes.data) ? bonusRes.data : [];
      setBonuses(bData);
      setBonusTotal(bData.length);
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const nextRank = rankInfo?.next_rank;
  const currentRank = rankInfo?.current_rank;
  const teamVolume = parseFloat(rankInfo?.team_volume || 0);
  const totalMatchingBonus = parseFloat(rankInfo?.total_matching_bonus_earned || 0);
  const remainingVolume = parseFloat(rankInfo?.remaining_volume || 0);
  const nextTargetVolume = parseFloat(rankInfo?.next_target_volume || 0);
  const progress = rankInfo?.progress ?? 100;

  const getBonusPercent = (rank, type) => {
    if (!rank?.bonus_configs) return 0;
    const found = rank.bonus_configs.find((bc) => bc.bonus_type === type);
    return found ? parseFloat(found.bonus_percent) : 0;
  };

  const currentMatchingPercent = getBonusPercent(currentRank, "matching");

  const filteredHistory = rankHistory.filter((h) => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return h.rank_name?.toLowerCase().includes(q);
  });
  const historyTotalPages = Math.ceil(filteredHistory.length / historyLimit);
  const pagedHistory = filteredHistory.slice(
    (historyPage - 1) * historyLimit,
    historyPage * historyLimit
  );

  const bonusTotalPages = Math.ceil(bonusTotal / bonusLimit);
  const pagedBonuses = bonuses.slice(
    (bonusPage - 1) * bonusLimit,
    bonusPage * bonusLimit
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen p-4 md:p-6"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage?.("overview")}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t("matchingBonusInfo.title")}
            </h1>
            <p className="text-sm text-gray-400">
              {t("matchingBonusInfo.subtitle")}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Current Status Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  {t("matchingBonusInfo.currentRank")}
                </div>
                <div className="text-xl font-bold text-white">
                  {user?.kyc_status === "approved"
                    ? (currentRank?.name || t("matchingBonusInfo.unranked"))
                    : t("matchingBonusInfo.unranked")}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentMatchingPercent > 0
                    ? t("matchingBonusInfo.rate", { percent: currentMatchingPercent })
                    : t("matchingBonusInfo.startBuilding")}
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  {t("matchingBonusInfo.yourDeposit")}
                </div>
                <div className="text-xl font-bold text-emerald-400">
                  {Number(user?.deposit_wallet ?? 0).toFixed(2)} USDT
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t("matchingBonusInfo.ownDepositDesc")}
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  {t("matchingBonusInfo.teamVolume")}
                </div>
                <div className="text-xl font-bold text-white">
                  {teamVolume.toFixed(2)} USDT
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t("matchingBonusInfo.networkTotal")}
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  {t("matchingBonusInfo.nextTarget")}
                </div>
                <div className="text-xl font-bold text-purple-400">
                  {nextTargetVolume.toLocaleString()} USDT
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {nextRank
                    ? t("matchingBonusInfo.rankTarget", { rank: nextRank.name })
                    : t("matchingBonusInfo.maxRank")}
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Trophy className="w-4 h-4 text-cyan-400" />
                  {t("matchingBonusInfo.totalEarned")}
                </div>
                <div className="text-xl font-bold text-cyan-400">
                  {totalMatchingBonus.toFixed(2)} USDT
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t("matchingBonusInfo.lifetimeBonus")}
                </div>
              </div>
            </div>

            {/* ── Progress Bar ── */}
            {nextRank && (
              <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">
                      {t("matchingBonusInfo.progressTo")}{" "}
                      <span className="text-white font-semibold">
                        {nextRank.name}
                      </span>
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {teamVolume.toFixed(2)} / {nextTargetVolume.toFixed(2)} USDT
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      progress >= 100
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                        : "bg-gradient-to-r from-blue-500 to-cyan-500"
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-500">
                    {progress >= 100
                      ? t("matchingBonusInfo.targetReached")
                      : t("matchingBonusInfo.remaining", { amount: remainingVolume.toFixed(2) })}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.min(progress, 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

              {/* ── Full Rank Table ── */}
            {(() => {
              const allBonusTypes = [...new Set(
                ranks.flatMap((r) =>
                  (r.bonus_configs || []).map((bc) => bc.bonus_type)
                )
              )];
              const bonusColors = [
                "text-emerald-400", "text-purple-400", "text-orange-400",
                "text-blue-400", "text-pink-400", "text-yellow-400",
                "text-cyan-400", "text-rose-400", "text-violet-400",
                "text-amber-400",
              ];
              return (
            <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  {t("matchingBonusInfo.completeRankStructure")}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {t("matchingBonusInfo.allRanksDesc")}
                </p>
              </div>
              <div className="responsive-table-wrapper">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="text-left p-4 text-gray-400 font-medium">
                        {t("matchingBonusInfo.rank")}
                      </th>
                      <th className="text-right p-4 text-gray-400 font-medium">
                        {t("matchingBonusInfo.volumeRequired")}
                      </th>
                      {allBonusTypes.map((bt, i) => (
                        <th key={bt} className={`text-right p-4 ${bonusColors[i] || "text-gray-400"} font-medium capitalize`}>
                          {bt.replace("_", " ")}
                        </th>
                      ))}
                      <th className="text-center p-4 text-gray-400 font-medium">
                        {t("matchingBonusInfo.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranks.map((r, idx) => {
                      const isCurrent =
                        currentRank?.id === r.id;
                      const isAchieved =
                        parseFloat(r.target_volume) <= teamVolume;
                      const isNext = nextRank?.id === r.id;
                      const bonusMap = {};
                      (r.bonus_configs || []).forEach((bc) => {
                        bonusMap[bc.bonus_type] = parseFloat(bc.bonus_percent);
                      });
                      return (
                        <tr
                          key={r.id}
                          className={`border-b border-white/5 hover:bg-white/5 transition ${
                            isCurrent
                              ? "bg-cyan-500/5 border-l-2 border-l-cyan-400"
                              : isNext
                                ? "bg-blue-500/5"
                                : ""
                          }`}
                        >
                          <td data-label={t("matchingBonusInfo.rank")} className="p-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isCurrent
                                    ? "bg-cyan-500/20 text-cyan-400"
                                    : isAchieved
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-white/5 text-gray-500"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span
                                className={
                                  isCurrent
                                    ? "text-cyan-300 font-semibold"
                                    : "text-white"
                                }
                              >
                                {r.name}
                              </span>
                            </div>
                          </td>
                          <td data-label={t("matchingBonusInfo.volumeRequired")} className="p-4 text-right text-gray-300">
                            {parseFloat(r.target_volume).toLocaleString()} USDT
                          </td>
                          {allBonusTypes.map((bt, i) => (
                            <td key={bt} data-label={bt.replace("_", " ")} className={`p-4 text-right font-medium ${bonusColors[i] || "text-gray-400"}`}>
                              {bonusMap[bt] > 0 ? `${bonusMap[bt]}%` : "-"}
                            </td>
                          ))}
                          <td data-label={t("matchingBonusInfo.status")} className="p-4 text-center">
                            {isCurrent ? (
                              <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                {t("matchingBonusInfo.current")}
                              </span>
                            ) : isAchieved ? (
                              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {t("matchingBonusInfo.achieved")}
                              </span>
                            ) : isNext ? (
                              <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                {t("matchingBonusInfo.next")}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs bg-gray-500/10 text-gray-500 border border-gray-500/30">
                                {t("matchingBonusInfo.locked")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
              );
            })()}

            {/* ── Bonus Explanation ── */}
            <div className="rounded-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20 p-5">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-400 leading-relaxed space-y-2">
                  <p>
                    <strong className="text-white">
                      {t("matchingBonusInfo.howItWorksTitle")}
                    </strong>
                  </p>
                  <p>
                    {t("matchingBonusInfo.howItWorksDesc1")}
                  </p>
                  <p>
                    {t("matchingBonusInfo.howItWorksDesc2")}
                  </p>
                  <p>
                    {t("matchingBonusInfo.howItWorksDesc3")}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Bonus Volume Examples ── */}
            <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
              <h2 className="text-lg font-bold text-white mb-4">
                {t("matchingBonusInfo.bonusVolumeTiers")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ranks.slice(0, 21).map((r, idx) => {
                  const prevVolume =
                    idx > 0
                      ? parseFloat(ranks[idx - 1].target_volume)
                      : 0;
                  const currVolume = parseFloat(r.target_volume);
                  const rangeLabel =
                    idx === 0
                      ? `0 - ${currVolume.toLocaleString()} USDT`
                      : `${(prevVolume + 1).toLocaleString()} - ${currVolume.toLocaleString()} USDT`;
                  return (
                    <div
                      key={r.id}
                      className="rounded-lg bg-white/5 border border-white/10 p-3"
                    >
                      <div className="text-sm font-semibold text-white">
                        {r.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {rangeLabel}
                      </div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        {getBonusPercent(r, "matching")}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Rank History ── */}
            <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {t("matchingBonusInfo.rankHistory")}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("matchingBonusInfo.rankHistoryDesc")}
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder={t("matchingBonusInfo.searchRanks")}
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>
              {pagedHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {t("matchingBonusInfo.noRankHistory")}
                </div>
              ) : (
                <>
                  <div className="responsive-table-wrapper">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="text-left p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.rank")}
                          </th>
                          <th className="text-right p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.teamVolumeCol")}
                          </th>
                          <th className="text-center p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.status")}
                          </th>
                          <th className="text-right p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.dateAchieved")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedHistory.map((h) => (
                          <tr
                            key={h.id}
                            className="border-b border-white/5 hover:bg-white/5"
                          >
                            <td data-label={t("matchingBonusInfo.rank")} className="p-4 text-white">
                              {h.rank_name || t("matchingBonusInfo.unknown")}
                            </td>
                            <td data-label={t("matchingBonusInfo.teamVolumeCol")} className="p-4 text-right text-gray-300">
                              {parseFloat(h.team_volume).toFixed(2)} USDT
                            </td>
                            <td data-label={t("matchingBonusInfo.status")} className="p-4 text-center">
                              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 capitalize">
                                {h.status || "achieved"}
                              </span>
                            </td>
                            <td data-label={t("matchingBonusInfo.dateAchieved")} className="p-4 text-right text-gray-400 whitespace-nowrap">
                              {h.achieved_at
                                ? new Date(
                                    h.achieved_at
                                  ).toLocaleDateString()
                                : h.created_at
                                  ? new Date(
                                      h.created_at
                                    ).toLocaleDateString()
                                  : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 p-4 border-t border-white/10">
                      <button
                        onClick={() =>
                          setHistoryPage((p) => Math.max(1, p - 1))
                        }
                        disabled={historyPage === 1}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </button>
                      <span className="text-sm text-gray-400">
                        {t("matchingBonusInfo.page", { page: historyPage, totalPages: historyTotalPages })}
                      </span>
                      <button
                        onClick={() =>
                          setHistoryPage((p) =>
                            Math.min(historyTotalPages, p + 1)
                          )
                        }
                        disabled={historyPage === historyTotalPages}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Matching Bonus History ── */}
            <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">
                  {t("matchingBonusInfo.bonusHistory")}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {t("matchingBonusInfo.bonusHistoryDesc")}
                </p>
              </div>
              {pagedBonuses.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {t("matchingBonusInfo.noBonuses")}
                </div>
              ) : (
                <>
                  <div className="responsive-table-wrapper">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="text-left p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.rank")}
                          </th>
                          <th className="text-right p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.eligibleVolume")}
                          </th>
                          <th className="text-right p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.rate")}
                          </th>
                          <th className="text-right p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.bonusAmount")}
                          </th>
                          <th className="text-right p-4 text-gray-400 font-medium">
                            {t("matchingBonusInfo.date")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedBonuses.map((b) => (
                          <tr
                            key={b.id}
                            className="border-b border-white/5 hover:bg-white/5"
                          >
                            <td data-label={t("matchingBonusInfo.rank")} className="p-4 text-white">
                              {b.rank_name || `Rank #${b.rank_id}`}
                            </td>
                            <td data-label={t("matchingBonusInfo.eligibleVolume")} className="p-4 text-right text-gray-300">
                              {parseFloat(
                                b.eligible_amount || 0
                              ).toFixed(2)}{" "}
                              USDT
                            </td>
                            <td data-label={t("matchingBonusInfo.rate")} className="p-4 text-right text-gray-300">
                              {parseFloat(b.bonus_percent || 0)}%
                            </td>
                            <td data-label={t("matchingBonusInfo.bonusAmount")} className="p-4 text-right text-emerald-400 font-medium">
                              +
                              {parseFloat(
                                b.bonus_amount || 0
                              ).toFixed(2)}{" "}
                              USDT
                            </td>
                            <td data-label={t("matchingBonusInfo.date")} className="p-4 text-right text-gray-400 whitespace-nowrap">
                              {b.created_at
                                ? new Date(
                                    b.created_at
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bonusTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 p-4 border-t border-white/10">
                      <button
                        onClick={() =>
                          setBonusPage((p) => Math.max(1, p - 1))
                        }
                        disabled={bonusPage === 1}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </button>
                      <span className="text-sm text-gray-400">
                        {t("matchingBonusInfo.page", { page: bonusPage, totalPages: bonusTotalPages })}
                      </span>
                      <button
                        onClick={() =>
                          setBonusPage((p) =>
                            Math.min(bonusTotalPages, p + 1)
                          )
                        }
                        disabled={bonusPage === bonusTotalPages}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
