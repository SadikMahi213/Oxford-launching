import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  RotateCcw,
  Shield,
  ShieldOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ArrowRightLeft,
  History,
  X,
} from "lucide-react";
import api from "../../api/axiosInstance.js";
import useUserStore from "../../store/userStore.js";

const authHeaders = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};

const ACTION_LABELS = {
  lift_suspension: "Lift Suspension",
  lift_restriction: "Lift Restriction",
  dismiss_warnings: "Dismiss Warnings",
  unblock_login: "Unblock Login",
  restore_account_status: "Restore Account Status",
  full_restore: "Full Restore",
};

const ACTION_DESCRIPTIONS = {
  lift_suspension: "Deactivate all active suspensions and restore account access",
  lift_restriction: "Deactivate all active task restrictions",
  dismiss_warnings: "Dismiss all active task warnings",
  unblock_login: "Remove login block and reset failed attempts",
  restore_account_status: "Set account status from on_hold to active",
  full_restore: "Perform all available restore actions at once",
};

export default function AccountRestore() {
  const [userId, setUserId] = useState("");
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirmAction, setConfirmAction] = useState(null);
  const [reason, setReason] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const token = useUserStore((state) => state.token);

  const fetchUserStatus = useCallback(async () => {
    if (!userId.trim()) return;
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.get(
        `v1/admin/restore/user/${userId.trim()}`,
        authHeaders(token)
      );
      setUserStatus(res.data || res);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to fetch user status",
      });
      setUserStatus(null);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await api.get(
        "v1/admin/restore/audit-log?limit=50",
        authHeaders(token)
      );
      setAuditLogs(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setAuditLoading(false);
    }
  }, [token]);

  const handleAction = async (action) => {
    setActionLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.post(
        `v1/admin/restore/user/${userId.trim()}`,
        {
          action,
          reason: reason || `Admin performed ${ACTION_LABELS[action]}`,
          confirmed: true,
        },
        authHeaders(token)
      );
      const data = res.data || res;
      setMessage({
        type: "success",
        text: `${ACTION_LABELS[action]} completed: ${(data.changes || []).join(", ")}`,
      });
      setConfirmAction(null);
      setReason("");
      fetchUserStatus();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || `Failed to perform ${ACTION_LABELS[action]}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <RotateCcw className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Account Restore
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Restore affected user accounts without modifying financial data
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4">
          Search User by ID
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Enter User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUserStatus()}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
          />
          <button
            onClick={fetchUserStatus}
            disabled={loading}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex-shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border ${
              message.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            <div className="flex items-start gap-2">
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span className="text-sm break-words">{message.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {userStatus && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                User Information
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    userStatus.is_affected
                      ? "bg-red-500/10 text-red-400 border border-red-500/30"
                      : "bg-green-500/10 text-green-400 border border-green-500/30"
                  }`}
                >
                  {userStatus.is_affected ? "Issues Found" : "No Issues"}
                </span>
                <button
                  onClick={() => {
                    setShowAuditLog(!showAuditLog);
                    if (!showAuditLog) fetchAuditLog();
                  }}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-sm hover:bg-white/10 transition-all flex items-center gap-1.5"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">Audit Log</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">User ID</div>
                <div className="text-lg font-bold text-white">
                  {userStatus.user?.id}
                </div>
                {userStatus.user?.user_no && (
                  <div className="text-xs text-gray-500">
                    No: {userStatus.user.user_no}
                  </div>
                )}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Username</div>
                <div className="text-lg font-bold text-white">
                  {userStatus.user?.username || "N/A"}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Email</div>
                <div className="text-sm font-medium text-white break-all">
                  {userStatus.user?.email}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Full Name</div>
                <div className="text-sm font-medium text-white">
                  {userStatus.user?.full_name}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Account Status</div>
                <div
                  className={`text-sm font-medium ${
                    userStatus.user?.account_status === "on_hold"
                      ? "text-red-400"
                      : userStatus.user?.account_status === "active"
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  {userStatus.user?.account_status}
                  {userStatus.user?.account_issue && (
                    <div className="text-xs text-gray-500 mt-1">
                      {userStatus.user.account_issue}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Task Errors</div>
                <div className="text-lg font-bold text-white">
                  {userStatus.total_errors}
                </div>
              </div>
            </div>
          </div>

          {userStatus.active_suspensions?.length > 0 && (
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                Active Suspensions ({userStatus.active_suspensions.length})
              </h3>
              {userStatus.active_suspensions.map((s) => (
                <div
                  key={s.id}
                  className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 sm:p-4 mb-3 last:mb-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                          {s.suspension_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {s.suspended_by}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mt-1 break-words">
                        {s.reason}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Since: {formatDate(s.suspended_at)} | Expires:{" "}
                        {formatDate(s.expires_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmAction("lift_suspension")}
                      className="px-3 py-1.5 border border-green-500/30 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition-all flex-shrink-0"
                    >
                      Lift
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {userStatus.active_restrictions?.length > 0 && (
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ShieldOff className="w-5 h-5 text-orange-300" />
                Active Restrictions ({userStatus.active_restrictions.length})
              </h3>
              {userStatus.active_restrictions.map((r) => (
                <div
                  key={r.id}
                  className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 sm:p-4 mb-3 last:mb-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300">
                          {r.restriction_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {r.issued_by}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mt-1 break-words">
                        {r.reason}
                      </div>
                      {r.expires_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Expires: {formatDate(r.expires_at)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmAction("lift_restriction")}
                      className="px-3 py-1.5 border border-green-500/30 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition-all flex-shrink-0"
                    >
                      Lift
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {userStatus.active_warnings?.length > 0 && (
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Active Warnings ({userStatus.active_warnings.length})
              </h3>
              {userStatus.active_warnings.map((w) => (
                <div
                  key={w.id}
                  className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 sm:p-4 mb-3 last:mb-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          {w.warning_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {w.issued_by}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mt-1 break-words">
                        {w.reason}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmAction("dismiss_warnings")}
                      className="px-3 py-1.5 border border-green-500/30 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition-all flex-shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {userStatus.user?.is_blocked && (
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Login Block
              </h3>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 break-words">
                      {userStatus.user.blocked_reason || "Account is blocked"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Blocked at: {formatDate(userStatus.user.blocked_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmAction("unblock_login")}
                    className="px-3 py-1.5 border border-green-500/30 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition-all flex-shrink-0"
                  >
                    Unblock
                  </button>
                </div>
              </div>
            </div>
          )}

          {userStatus.restorable_actions?.length > 0 && (
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {userStatus.restorable_actions.map((action) => (
                  <button
                    key={action}
                    onClick={() => setConfirmAction(action)}
                    disabled={actionLoading}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-all group disabled:opacity-50"
                  >
                    <div className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                      {ACTION_LABELS[action]}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {ACTION_DESCRIPTIONS[action]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showAuditLog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  Restore Audit Log
                </h3>
                <button
                  onClick={() => setShowAuditLog(false)}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {auditLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No restore actions found
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
                            {log.action?.replace("restore_", "")}
                          </span>
                          <span className="text-gray-300">
                            User #{log.target_user_id}
                            {log.target_username &&
                              ` (${log.target_username})`}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      {log.details && (
                        <div className="text-xs text-gray-400 mt-1 break-words">
                          {log.details}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        By: {log.admin_name || `Admin #${log.admin_id}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border border-white/10 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-white mb-2">
                Confirm {ACTION_LABELS[confirmAction]}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {ACTION_DESCRIPTIONS[confirmAction]}
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
                <div className="text-xs text-gray-400 mb-1">Target User</div>
                <div className="text-sm text-white">
                  #{userStatus?.user?.id} - {userStatus?.user?.username} (
                  {userStatus?.user?.email})
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  placeholder="Reason for restore action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(confirmAction)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
