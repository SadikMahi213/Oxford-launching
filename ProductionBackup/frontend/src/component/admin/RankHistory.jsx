import { useCallback, useEffect, useState } from "react";
import useUserStore from "../../store/userStore.js";
import { getAllRankHistory, getAdminRanks } from "../../api/admin.api.js";
import RankDistribution from "./RankDistribution.jsx";
import { Trophy, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

export default function RankHistoryPage() {
  const token = useUserStore((state) => state.token);
  const [history, setHistory] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [showDistribution, setShowDistribution] = useState(true);

  const rankMap = {};
  ranks.forEach((r) => { rankMap[r.id] = r; });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [h, r] = await Promise.all([
        getAllRankHistory(token, { page, limit: 50 }),
        getAdminRanks(token),
      ]);
      setHistory(Array.isArray(h) ? h : []);
      setRanks(Array.isArray(r) ? r : []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  }, [token, page]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const rankName = (id) => rankMap[id]?.name || `#${id}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
          Rank Achievement History
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Every rank upgrade ever achieved — never downgraded
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] overflow-hidden">
        <button
          onClick={() => setShowDistribution(!showDistribution)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Trophy className="size-4 text-yellow-400" />
            Position List Check — Rank Distribution
          </span>
          {showDistribution ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {showDistribution && (
          <div className="px-4 pb-4">
            <RankDistribution />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-cyan-500" />
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Rank Achieved</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Previous Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Team Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Achieved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No rank achievements recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{h.id}</td>
                      <td className="px-4 py-3 text-white">{h.user_no || `#${h.user_id}`}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="size-4 text-yellow-400" />
                          <span className="font-medium text-white">{rankName(h.rank_id)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {h.previous_rank_id ? (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="size-3.5 text-cyan-400" />
                            {rankName(h.previous_rank_id)}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">
                        ${Number(h.team_volume).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            h.status === "achieved"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-yellow-500/20 text-yellow-300"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(h.achieved_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm text-gray-500">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={history.length < 50}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
