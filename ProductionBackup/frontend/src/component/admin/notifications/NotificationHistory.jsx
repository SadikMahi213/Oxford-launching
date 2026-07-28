import { useState, useEffect, useCallback } from "react";
import { Search, Filter, CheckCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import useUserStore from "../../../store/userStore.js";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../../api/notification.api.js";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "new_registration", label: "Registration" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "password_change", label: "Password Change" },
  { value: "failed_login", label: "Failed Login" },
  { value: "deposit_request", label: "Deposit Request" },
  { value: "deposit_approved", label: "Deposit Approved" },
  { value: "deposit_rejected", label: "Deposit Rejected" },
  { value: "withdrawal_request", label: "Withdrawal Request" },
  { value: "withdrawal_approved", label: "Withdrawal Approved" },
  { value: "withdrawal_rejected", label: "Withdrawal Rejected" },
  { value: "kyc_submitted", label: "KYC Submitted" },
  { value: "kyc_approved", label: "KYC Approved" },
  { value: "kyc_rejected", label: "KYC Rejected" },
  { value: "package_purchased", label: "Package Purchase" },
  { value: "wallet_updated", label: "Wallet Updated" },
  { value: "user_deleted", label: "User Deleted" },
  { value: "profit_credited", label: "Profit Credited" },
  { value: "mining_claimed", label: "Mining Claimed" },
  { value: "wallet_transfer", label: "Wallet Transfer" },
  { value: "send_funds", label: "Funds Sent" },
  { value: "ofa_converted", label: "OFA Converted" },
  { value: "profile_updated", label: "Profile Updated" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const priorityBadge = (p) => {
  const colors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    normal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return colors[p] || colors.normal;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NotificationHistory() {
  const token = useUserStore((s) => s.token);
  const [data, setData] = useState({ items: [], total: 0, page: 1, total_pages: 1 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [readFilter, setReadFilter] = useState("");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (readFilter === "unread") params.is_read = false;
      else if (readFilter === "read") params.is_read = true;

      const [res, uc] = await Promise.all([
        getNotifications(token, params),
        getUnreadCount(token),
      ]);
      if (res.success) setData(res.data);
      if (uc.success) setUnreadCount(uc.data.count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, page, search, typeFilter, priorityFilter, readFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMark = async (id) => {
    await markNotificationRead(token, id);
    fetchData();
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(token);
    fetchData();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notification History</h1>
          <p className="text-sm text-gray-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/20 transition-all text-sm"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
        </form>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0a0e27]">{o.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0a0e27]">{o.label}</option>
          ))}
        </select>
        <select
          value={readFilter}
          onChange={(e) => { setReadFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="" className="bg-[#0a0e27]">All Status</option>
          <option value="unread" className="bg-[#0a0e27]">Unread</option>
          <option value="read" className="bg-[#0a0e27]">Read</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No notifications found</div>
          ) : (
            data.items.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && handleMark(n.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  n.is_read
                    ? "bg-white/[0.02] border-white/5"
                    : "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    n.priority === "critical" ? "bg-red-500" :
                    n.priority === "high" ? "bg-orange-500" :
                    n.priority === "normal" ? "bg-blue-500" : "bg-gray-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{n.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${priorityBadge(n.priority)}`}>
                          {n.priority}
                        </span>
                        {n.type && (
                          <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                            {n.type.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(n.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{n.message}</p>
                    {(n.ip_address || n.device || n.user_id) && (
                      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-500">
                        {n.user_id && <span>{n.user_no || `User #${n.user_id}`}</span>}
                        {n.ip_address && <span>IP: {n.ip_address}</span>}
                        {n.device && <span className="truncate max-w-[200px]">{n.device.slice(0, 80)}</span>}
                      </div>
                    )}
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400">
            Page {data.page} of {data.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
