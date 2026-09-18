import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from "lucide-react";
import useUserStore from "../../store/userStore";
import { getUserApprovals, approveUserApproval, rejectUserApproval } from "../../api/admin.api.js";

export default function UserApproval() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const token = useUserStore.getState().token;
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await getUserApprovals(token, { page, search, status });
      setUsers(res.users || []);
      setTotal(res.total || 0);
      if (res.counts) setCounts(res.counts);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (u) => {
    if (!window.confirm(`Approve ${u.full_name} (${u.email}) for login?`)) return;
    const token = useUserStore.getState().token;
    setActionId(u.id);
    setMsg(""); setError("");
    try {
      await approveUserApproval(token, u.id);
      setMsg(`Approved ${u.email}`);
      fetchData();
    } catch (e) {
      setError(e.response?.data?.detail || "Approve failed");
    } finally { setActionId(null); }
  };

  const handleReject = async (u) => {
    if (!window.confirm(`Reject ${u.full_name} (${u.email})? They will be blocked from login.`)) return;
    const token = useUserStore.getState().token;
    setActionId(u.id);
    setMsg(""); setError("");
    try {
      await rejectUserApproval(token, u.id);
      setMsg(`Rejected ${u.email}`);
      fetchData();
    } catch (e) {
      setError(e.response?.data?.detail || "Reject failed");
    } finally { setActionId(null); }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getStatusBadge = (s) => {
    const v = (s || "pending").toLowerCase();
    if (v === "approved") return "bg-green-500/20 border-green-500/40 text-green-400";
    if (v === "rejected") return "bg-red-500/20 border-red-500/40 text-red-400";
    return "bg-yellow-500/20 border-yellow-500/40 text-yellow-400";
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">User Approval</span>
        </h1>
        <p className="text-sm text-gray-400">Manage login access — separate from KYC (pending / approved / rejected)</p>
      </div>

      {msg && <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm text-green-300">{msg}</div>}
      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        {[
          { k: "pending", label: "Pending", icon: Clock, color: "text-yellow-400", bg: "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20" },
          { k: "approved", label: "Approved", icon: CheckCircle, color: "text-green-400", bg: "from-green-500/10 to-green-500/5 border-green-500/20" },
          { k: "rejected", label: "Rejected", icon: XCircle, color: "text-red-400", bg: "from-red-500/10 to-red-500/5 border-red-500/20" },
        ].map(({k,label,icon:Icon,color,bg}) => (
          <div key={k} className={`p-4 rounded-xl bg-gradient-to-br ${bg} border`}>
            <div className={`flex items-center gap-2 text-sm ${color}`}><Icon className="w-4 h-4" />{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{counts[k] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e)=>{setSearch(e.target.value); setPage(1);}} placeholder="Search name, username, email, user_no..." className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <div className="flex gap-2">
          {["pending","approved","rejected","all"].map(s => (
            <button key={s} onClick={()=>{setStatus(s); setPage(1);}} className={`px-4 py-3 rounded-xl text-sm font-semibold border ${status===s ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Registration Date</th>
                <th className="px-4 py-3">Approval Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : users.length===0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white text-sm">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">@{u.username}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm font-mono">{u.user_no || u.id}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(u.approval_status)}`}>{(u.approval_status||"pending").toUpperCase()}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {u.approval_status !== "approved" && (
                        <button disabled={actionId===u.id} onClick={()=>handleApprove(u)} className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 text-xs font-semibold disabled:opacity-50">Approve</button>
                      )}
                      {u.approval_status !== "rejected" && (
                        <button disabled={actionId===u.id} onClick={()=>handleReject(u)} className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 text-xs font-semibold disabled:opacity-50">Reject</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-400">Page {page} of {totalPages} • {total} users</span>
          <div className="flex gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
