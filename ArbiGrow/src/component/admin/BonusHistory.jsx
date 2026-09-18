import { Fragment, useCallback, useEffect, useState } from "react";
import useUserStore from "../../store/userStore.js";
import { getAllMatchingBonuses, getAdminRanks } from "../../api/admin.api.js";
import { DollarSign, ChevronDown, ChevronUp } from "lucide-react";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

const displayOrNA = (value) => {
  if (value === null || value === undefined) return "N/A";
  const text = String(value).trim();
  return text === "" ? "N/A" : text;
};

export default function BonusHistory() {
  const token = useUserStore((state) => state.token);
  const [bonuses, setBonuses] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [filterRankId, setFilterRankId] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, rankList] = await Promise.all([
        getAllMatchingBonuses(token, {
          bonus_type: filterType || undefined,
          rank_id: filterRankId || undefined,
          page,
          limit: 50,
        }),
        getAdminRanks(token).catch(() => []),
      ]);
      setBonuses(Array.isArray(data) ? data : []);
      setRanks(Array.isArray(rankList) ? rankList : []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  }, [token, page, filterType, filterRankId]);

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
        <div className="flex flex-wrap gap-4">
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
          <select
            value={filterRankId}
            onChange={(e) => { setFilterRankId(e.target.value); setPage(1); }}
            className="w-48 rounded-xl border border-white/10 bg-[#0A122C] px-4 py-2.5 text-sm text-white"
          >
            <option value="">All Ranks</option>
            {ranks.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Rank Achieved</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Eligible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">%</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bonuses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                      No matching bonuses recorded yet.
                    </td>
                  </tr>
                ) : (
                  bonuses.map((b) => (
                    <Fragment key={b.id}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{b.id}</td>
                        <td className="px-4 py-3 min-w-[160px] whitespace-nowrap">
                          <div className="font-medium text-white">{b.user_full_name || b.user_username || b.user_no || `#${b.user_id}`}</div>
                          <div className="font-mono text-[11px] text-gray-400">
                            {b.user_username ? `@${b.user_username} · ` : ""}{b.user_email || b.user_no || `#${b.user_id}`}
                          </div>
                          <div className="font-mono text-[10px] text-gray-500">ID: {b.user_id}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {b.source_full_name || b.source_username || b.source_user_no || (b.source_user_id ? `#${b.source_user_id}` : "—")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-1 text-xs font-semibold text-yellow-300">
                            Rank Achieved: {b.rank_name || `#${b.rank_id}`}
                          </span>
                        </td>
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
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label={expandedId === b.id ? "Hide details" : "Show details"}
                          >
                            {expandedId === b.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                        </td>
                      </tr>
                      {expandedId === b.id && (
                        <tr key={`${b.id}-detail`} className="bg-white/[0.03]">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">User</div><div className="text-white font-medium">{displayOrNA(b.user_full_name)}</div><div className="font-mono text-[11px] text-gray-400">{displayOrNA(b.user_username && `@${b.user_username}`)} · {displayOrNA(b.user_email)}</div><div className="font-mono text-[11px] text-gray-500">User ID: {b.user_id} · No: {displayOrNA(b.user_no)}</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Previous Rank</div><div className="text-gray-300">N/A</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Achieved Rank</div><div className="text-yellow-300 font-semibold">{displayOrNA(b.rank_name)} (ID: {b.rank_id})</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Team Volume at Achievement</div><div className="text-gray-300">N/A</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Required Team Volume</div><div className="text-white font-mono">{b.rank_target_volume != null ? `${Number(b.rank_target_volume).toLocaleString()} USDT` : "N/A"}</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Achieved At</div><div className="text-white">{b.created_at ? new Date(b.created_at).toLocaleString() : "N/A"}</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Rank Bonus</div><div className="text-green-400 font-mono font-medium">${Number(b.bonus_amount).toLocaleString()} ({b.bonus_percent}% of ${Number(b.eligible_amount).toLocaleString()})</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Source / Reason</div><div className="text-gray-300">{displayOrNA(b.source_full_name || b.source_username || b.source_user_no)} · {displayOrNA(b.description)}</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Reference</div><div className="font-mono text-gray-300">{b.reference_type ? `${b.reference_type} #${b.reference_id}` : "N/A"}</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Status</div><div className="text-gray-300">{displayOrNA(b.status)}</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Wallet / Bonus Balance</div><div className="text-gray-300">N/A</div></div>
                              <div><div className="text-[10px] uppercase tracking-wider text-gray-500">Ledger ID</div><div className="font-mono text-gray-300">#{b.id}</div></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
