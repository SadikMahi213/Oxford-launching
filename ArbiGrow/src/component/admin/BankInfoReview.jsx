import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Building2, CheckCircle, XCircle, Loader2, Search, ExternalLink } from "lucide-react";
import useUserStore from "../../store/userStore";
import { getAdminBankInfoList, updateBankInfoStatus } from "../../api/admin.api.js";

const statusColors = {
  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  approved: "text-green-400 bg-green-500/10 border-green-500/30",
  rejected: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default function BankInfoReview() {
  const token = useUserStore((s) => s.token);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminBankInfoList(token);
      setItems(res?.data || []);
    } catch {
      setMsg("Failed to load banking info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(); }, [token]);

  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 4000); return () => clearTimeout(t); } }, [msg]);

  const updateStatus = async (id, status) => {
    try {
      const adminNote = status === "rejected" ? prompt("Reason for rejection (optional):") : undefined;
      await updateBankInfoStatus(token, id, status, adminNote);
      setMsg(`Bank info ${status}`);
      load();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const filtered = items.filter((item) => {
    if (filter !== "all" && item.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.account_holder_name?.toLowerCase().includes(q) && !item.bank_name?.toLowerCase().includes(q) && !item.user_id?.toString().includes(q) && !item.user_no?.includes(q)) return false;
    }
    return true;
  });

  const counts = { all: items.length, pending: items.filter((i) => i.status === "pending").length, approved: items.filter((i) => i.status === "approved").length, rejected: items.filter((i) => i.status === "rejected").length };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Banking Information Review
          </span>
        </h1>
        <p className="text-sm text-gray-400">Review and approve user banking information for withdrawals.</p>
      </motion.div>

      {msg && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">{msg}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {["all", "pending", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === s ? "bg-cyan-600 border-cyan-500 text-white" : "border-white/10 text-gray-400 hover:border-white/30"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 w-48" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-10">No banking information found.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-cyan-400" />
                  <div>
                    <p className="text-white font-semibold">{item.account_holder_name}</p>
                    <p className="text-xs text-gray-500">{item.user_no || `User #${item.user_id}`} — {item.bank_name}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${statusColors[item.status] || "text-gray-400"}`}>{item.status}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                {[
                  ["Bank Name", item.bank_name], ["Account Number", item.account_number], ["Branch", item.branch_name],
                  ["SWIFT", item.swift_code], ["Routing", item.routing_code || "—"], ["Country", item.country],
                  ["Currency", item.currency], ["Account Type", item.account_type?.charAt(0).toUpperCase() + item.account_type?.slice(1)],
                ].map(([l, v]) => (
                  <div key={l}><p className="text-gray-500 text-xs uppercase tracking-wider">{l}</p><p className="text-white mt-0.5">{v}</p></div>
                ))}
              </div>

              {item.branch_address && <p className="text-sm text-gray-400"><span className="text-gray-500">Address:</span> {item.branch_address}</p>}

              {item.admin_note && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Admin Note</p>
                  <p className="text-gray-300">{item.admin_note}</p>
                </div>
              )}

              {item.status === "pending" && (
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <button onClick={() => updateStatus(item.id, "approved")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors"
                  ><CheckCircle className="w-4 h-4" /> Approve</button>
                  <button onClick={() => updateStatus(item.id, "rejected")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                  ><XCircle className="w-4 h-4" /> Reject</button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
