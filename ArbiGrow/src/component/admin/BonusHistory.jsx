import { useCallback, useEffect, useState } from "react";
import useUserStore from "../../store/userStore.js";
import { getAllMatchingBonuses } from "../../api/admin.api.js";
import RankDistribution from "./RankDistribution.jsx";
import { DollarSign, Trophy, ChevronDown, ChevronUp } from "lucide-react";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

export default function BonusHistory() {
  const token = useUserStore((state) => state.token);
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [showDistribution, setShowDistribution] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllMatchingBonuses(token, {
        bonus_type: filterType || undefined,
        page,
        limit: 50,
      });
      setBonuses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  }, [token, page, filterType]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
          Matching Bonus Ledger
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          All matching bonus payouts — fully traceable
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
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
        <div className="flex gap-4">
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="w-48 rounded-xl border border-white/10 bg-[#0A122C] px-4 py-2.5 text-sm text-white"
          >
            <option value="">All Types</option>
            <option value="matching">Matching</option>
            <option value="extra">Extra</option>
            <option value="travel">Travel</option>
            <option value="company_profit">Company Profit</option>
            <option value="development">Development</option>
            <option value="international">International</option>
            <option value="position">Position</option>
          </select>
        </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Eligible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">%</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bonuses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      No matching bonuses recorded yet.
                    </td>
                  </tr>
                ) : (
                  bonuses.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{b.id}</td>
                      <td className="px-4 py-3 text-white">{b.user_no || `#${b.user_id}`}</td>
                      <td className="px-4 py-3 text-gray-400">{b.source_user_no || (b.source_user_id ? `#${b.source_user_id}` : "—")}</td>
                      <td className="px-4 py-3 text-gray-300">#{b.rank_id}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-300">
                          {b.bonus_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">
                        ${Number(b.eligible_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-cyan-400">{b.bonus_percent}%</td>
                      <td className="px-4 py-3 font-mono text-green-400 font-medium">
                        <div className="flex items-center gap-1">
                          <DollarSign className="size-3.5" />
                          {Number(b.bonus_amount).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(b.created_at).toLocaleDateString()}
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
          disabled={bonuses.length < 50}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
