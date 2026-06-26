import { useState, useEffect, useCallback } from "react";
import { ShieldAlert, Lock, Unlock, Search, Eye } from "lucide-react";
import useUserStore from "../../../store/userStore";
import {
  getBlockedAccounts,
  unblockAccount,
  getSecurityLogs,
  getSecurityEventTypes,
} from "../../../api/admin.api";

export default function BlockedAccounts() {
  const token = useUserStore((s) => s.token);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logFilter, setLogFilter] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [eventTypes, setEventTypes] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchBlocked = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getBlockedAccounts(token, { page, limit });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch { setUsers([]); }
    setLoading(false);
  }, [token, page, limit]);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  const fetchLogs = useCallback(async (p = 1) => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const data = await getSecurityLogs(token, {
        page: p, limit: 50, event_type: logFilter, search: logSearch,
      });
      setLogs(data.logs || []);
      setLogsTotal(data.total || 0);
    } catch { setLogs([]); }
    setLogsLoading(false);
  }, [token, logFilter, logSearch]);

  useEffect(() => {
    if (showLogs) {
      if (!eventTypes.length) {
        getSecurityEventTypes(token).then(d => setEventTypes(d.event_types || []));
      }
      fetchLogs(logsPage);
    }
  }, [showLogs, logsPage, logFilter, logSearch, fetchLogs, token, eventTypes.length]);

  const handleUnblock = async (userId) => {
    if (!token) return;
    try {
      await unblockAccount(token, userId);
      setActionMsg("Account unblocked successfully");
      fetchBlocked();
      setTimeout(() => setActionMsg(""), 3000);
    } catch (e) {
      setActionMsg(e.response?.data?.detail || "Failed to unblock");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Login Security</span>
          </h1>
          <p className="text-sm text-gray-400">Monitor and manage blocked accounts</p>
        </div>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm">{showLogs ? "Blocked Accounts" : "Security Logs"}</span>
        </button>
      </div>

      {actionMsg && (
        <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          {actionMsg}
        </div>
      )}

      {showLogs ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => { setLogSearch(e.target.value); setLogsPage(1); }}
                placeholder="Search by email..."
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <select
              value={logFilter}
              onChange={(e) => { setLogFilter(e.target.value); setLogsPage(1); }}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">All Events</option>
              {eventTypes.map((et) => (
                <option key={et} value={et}>{et.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {logsLoading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No security logs found</div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase">
                      <th className="px-4 py-3 text-left">Event</th>
                      <th className="px-4 py-3 text-left">User / Email</th>
                      <th className="px-4 py-3 text-left">IP Address</th>
                      <th className="px-4 py-3 text-left">Device</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${
                            log.event_type === "login" ? "bg-green-500/10 text-green-400" :
                            log.event_type === "failed_login" ? "bg-yellow-500/10 text-yellow-400" :
                            log.event_type === "logout" ? "bg-blue-500/10 text-blue-400" :
                            log.event_type === "account_blocked" ? "bg-red-500/10 text-red-400" :
                            log.event_type === "account_unblocked" ? "bg-purple-500/10 text-purple-400" :
                            "bg-gray-500/10 text-gray-400"
                          }`}>
                            {log.event_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{log.email || log.user_id || "-"}</td>
                        <td className="px-4 py-3 text-sm font-mono">{log.ip_address || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{log.device || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {logsTotal > 50 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-gray-400">{logsTotal} total logs</span>
              <div className="flex gap-2">
                <button disabled={logsPage <= 1} onClick={() => setLogsPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10">Previous</button>
                <button disabled={logsPage * 50 >= logsTotal} onClick={() => setLogsPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10">Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{total}</div>
                  <div className="text-xs text-gray-400">Blocked Accounts</div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading blocked accounts...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No blocked accounts</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase">
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Failed Attempts</th>
                      <th className="px-4 py-3 text-left">Blocked At</th>
                      <th className="px-4 py-3 text-left">IP Address</th>
                      <th className="px-4 py-3 text-left">Reason</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{u.full_name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${
                            u.failed_attempts >= 10 ? "bg-red-500/10 text-red-400" :
                            u.failed_attempts >= 5 ? "bg-yellow-500/10 text-yellow-400" :
                            "bg-gray-500/10 text-gray-400"
                          }`}>
                            {u.failed_attempts}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {u.blocked_at ? new Date(u.blocked_at).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-400">
                          {u.last_login_ip || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                          {u.blocked_reason || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleUnblock(u.id)}
                            className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs hover:bg-green-500/20 transition-all"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-gray-400">{total} total blocked</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10">Previous</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
