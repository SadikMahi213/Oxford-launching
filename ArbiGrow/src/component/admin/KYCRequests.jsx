import { useState, useEffect, useCallback, useRef } from "react";
import { Search, IdCard, CheckCircle, XCircle, Clock, ChevronRight, ExternalLink } from "lucide-react";
import { getAllUsers, getUser } from "../../api/admin.api.js";
import useUserStore from "../../store/userStore.js";
import AdminKycDetailDrawer from "./AdminKycDetailDrawer.jsx";

const normalizeStatus = (value) => {
  const s = String(value || "pending").toLowerCase();
  return ["approved", "pending", "rejected"].includes(s) ? s : "pending";
};

const STATUS_META = {
  approved: { label: "Approved", icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  pending: { label: "Processing", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

function KYCStatusBadge({ status }) {
  const meta = STATUS_META[normalizeStatus(status)];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.border} ${meta.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

export default function KYCRequests() {
  const token = useUserStore((s) => s.token);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [counts, setCounts] = useState({ approved: 0, pending: 0, rejected: 0 });
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const latestFetchIdRef = useRef(0);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    const fetchId = ++latestFetchIdRef.current;
    try {
      setLoading(true);
      const res = await getAllUsers(token, {
        page: 1,
        search: searchQuery,
        status: statusFilter === "all" ? "" : statusFilter,
        has_kyc: true,
      });
      const data = res?.data || {};
      const users = data?.users || [];
      const sc = data?.status_counts || {};
      if (fetchId !== latestFetchIdRef.current) return;
      setRequests(users.map((u) => ({ ...u, status: normalizeStatus(u?.status) })));
      setCounts({
        approved: Number(sc?.approved || 0),
        pending: Number(sc?.pending || 0),
        rejected: Number(sc?.rejected || 0),
      });
    } catch (err) {
      if (fetchId !== latestFetchIdRef.current) return;
    } finally {
      if (fetchId === latestFetchIdRef.current) setLoading(false);
    }
  }, [searchQuery, statusFilter, token]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleOpen = async (user) => {
    if (!token) return;
    try {
      const details = await getUser(token, user.id);
      setSelectedUser(details);
      setSelectedKyc(details?.kyc || null);
      setIsDrawerOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load KYC details: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            KYC{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Review
            </span>
          </h1>
          <p className="text-gray-400">Verify user identities and approve KYC submissions</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
          <IdCard className="w-4 h-4 text-purple-400" />
          <span>{counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 focus:outline-none transition-colors text-white placeholder-gray-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {[
            { id: "pending", label: "Processing", color: "text-yellow-400 border-yellow-500/50 bg-yellow-500/20" },
            { id: "approved", label: "Approved", color: "text-green-400 border-green-500/50 bg-green-500/20" },
            { id: "rejected", label: "Rejected", color: "text-red-400 border-red-500/50 bg-red-500/20" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                statusFilter === tab.id
                  ? `${tab.color} border`
                  : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {tab.label} ({counts[tab.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* KYC Cards */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading KYC requests...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <IdCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No KYC requests found</p>
          <p className="text-sm mt-1">Users who submit KYC documentation will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((user) => {
            const formattedDate = user?.kyc_created_at
              ? new Date(user.kyc_created_at).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })
              : null;
            return (
              <div
                key={user.id}
                onClick={() => handleOpen(user)}
                className="group relative rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-purple-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="p-5">
                  {/* Row 1: Avatar area + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {(user.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <KYCStatusBadge status={user.status} />
                  </div>

                  {/* Separator */}
                  <div className="border-t border-white/5 my-3" />

                  {/* Details */}
                  <div className="space-y-1.5 text-sm">
                    {user?.kyc_transaction_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Txn</span>
                        <span className="text-gray-400 font-mono text-xs truncate">{user.kyc_transaction_id}</span>
                      </div>
                    )}
                    {formattedDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Submitted</span>
                        <span className="text-gray-400 text-xs">{formattedDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover footer */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-r from-purple-600/20 to-pink-600/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-1.5 text-xs text-purple-300 font-medium">
                  Review KYC <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {isDrawerOpen && selectedUser && (
        <AdminKycDetailDrawer
          kyc={selectedKyc}
          user={selectedUser}
          onClose={() => { setIsDrawerOpen(false); setSelectedKyc(null); setSelectedUser(null); }}
          onRefresh={fetchRequests}
        />
      )}
    </div>
  );
}