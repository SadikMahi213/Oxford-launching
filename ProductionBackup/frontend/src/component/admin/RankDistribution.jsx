import { useCallback, useEffect, useState } from "react";
import useUserStore from "../../store/userStore.js";
import { getRankDistribution } from "../../api/admin.api.js";
import { Users, Trophy, BarChart3 } from "lucide-react";

export default function RankDistribution() {
  const token = useUserStore((state) => state.token);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getRankDistribution(token);
      setData(result);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  const ranks = data?.ranks || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="size-5 text-cyan-400" />
        <span className="text-sm text-gray-400">
          Total Users: <strong className="text-white">{data?.total_users ?? 0}</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {ranks.map((r) => (
          <div
            key={r.rank_id}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="size-4 text-yellow-400 shrink-0" />
              <span className="text-sm font-medium text-white truncate">{r.rank_name}</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">{r.user_count}</div>
            <div className="text-xs text-gray-500 mt-1">
              {r.percentage}% of total
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Users</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">%</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ranks.map((r) => {
                const maxCount = Math.max(...ranks.map((x) => x.user_count), 1);
                const barWidth = (r.user_count / maxCount) * 100;
                return (
                  <tr key={r.rank_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="size-4 text-yellow-400" />
                        <span className="text-white font-medium">{r.rank_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-cyan-400 font-bold text-lg">{r.user_count}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{r.percentage}%</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-white/5 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}