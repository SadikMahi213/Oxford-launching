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
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Ban,
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

const ISSUE_TYPE_LABELS = {
  missing_earning: "Missing Earning",
  incorrect_earning: "Incorrect Earning",
  duplicate_earning: "Duplicate Earning",
  wallet_mismatch: "Wallet Mismatch",
};

const ISSUE_TYPE_COLORS = {
  missing_earning: "bg-red-500/10 text-red-400 border border-red-500/30",
  incorrect_earning: "bg-orange-500/10 text-orange-300 border border-orange-500/30",
  duplicate_earning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  wallet_mismatch: "bg-purple-500/10 text-purple-400 border border-purple-500/30",
};

const TASK_TYPE_LABELS = {
  captcha: "Captcha",
  ad_view: "Ad View",
};

const STATUS_COLORS = {
  pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  restored: "bg-green-500/10 text-green-400 border border-green-500/30",
  dismissed: "bg-white/5 text-gray-400 border border-white/10",
};

export default function AccountRestore() {
  const [affectedData, setAffectedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [expandedUser, setExpandedUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("affected");

  const token = useUserStore((state) => state.token);

  const fetchAffectedAccounts = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.get(
        "v1/admin/restore/affected-accounts",
        authHeaders(token)
      );
      setAffectedData(res.data || res);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to fetch affected accounts",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

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

  const handleRestore = async (recordId) => {
    setActionLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.post(
        "v1/admin/restore/execute-restore",
        {
          record_id: recordId,
          reason: reason || "Admin restore action",
          confirmed: true,
        },
        authHeaders(token)
      );
      const data = res.data || res;
      setMessage({
        type: "success",
        text: `Restore completed: ${data.wallet} adjusted by $${data.correction}. New balance: $${data.new_balance}`,
      });
      setConfirmAction(null);
      setReason("");
      fetchAffectedAccounts();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to execute restore",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async (recordId) => {
    setActionLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await api.post(
        "v1/admin/restore/dismiss",
        {
          record_id: recordId,
          reason: reason || "Dismissed by admin",
        },
        authHeaders(token)
      );
      setMessage({ type: "success", text: "Record dismissed" });
      setConfirmAction(null);
      setReason("");
      fetchAffectedAccounts();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to dismiss",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLiftSuspension = async (userId) => {
    setActionLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.post(
        "v1/admin/restore/lift-suspension",
        {
          user_id: userId,
          reason: reason || "Admin restore action",
        },
        authHeaders(token)
      );
      const data = res.data || res;
      setMessage({
        type: "success",
        text: `Suspension lifted for user #${data.user_id}. ${data.lifted_count} suspension(s) removed. Account status: ${data.account_status}`,
      });
      setConfirmAction(null);
      setReason("");
      fetchAffectedAccounts();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to lift suspension",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatNumber = (num) => {
    const n = Number(num);
    if (isNaN(n)) return "0.00";
    return n.toFixed(14).replace(/\.?0+$/, "") || "0";
  };

  const formatCurrency = (num) => {
    const n = Number(num);
    if (isNaN(n)) return "$0.00";
    return `$${n.toFixed(4)}`;
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
            Detect and restore accounts affected by task-related errors
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={fetchAffectedAccounts}
          disabled={loading}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {affectedData ? "Refresh Scan" : "Scan for Affected Accounts"}
        </button>
        <button
          onClick={() => {
            setShowAuditLog(!showAuditLog);
            if (!showAuditLog) fetchAuditLog();
          }}
          className="px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          Audit Log
        </button>
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

      {affectedData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Reconciliation Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Affected Users</div>
                <div className="text-2xl font-bold text-white">
                  {affectedData.summary?.total_affected_users || 0}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Affected Tasks</div>
                <div className="text-2xl font-bold text-white">
                  {affectedData.summary?.total_affected_tasks || 0}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Total Affected</div>
                <div className="text-2xl font-bold text-orange-400">
                  {formatCurrency(affectedData.summary?.total_affected_amount)}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-xs text-gray-400 mb-1">Pending Restore</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {affectedData.summary?.pending_restore || 0}
                </div>
              </div>
            </div>
          </div>

          {affectedData.users?.length === 0 ? (
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No Affected Accounts Found
              </h3>
              <p className="text-sm text-gray-400">
                All task earnings match wallet balances. No inconsistencies detected.
              </p>
            </div>
          ) : (
            affectedData.users?.map((user) => (
              <motion.div
                key={user.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
              >
                <div
                  className="p-3 sm:p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  onClick={() =>
                    setExpandedUser(
                      expandedUser === user.user_id ? null : user.user_id
                    )
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white">
                            #{user.user_id}
                          </span>
                          <span className="text-sm text-gray-400">
                            {user.username}
                          </span>
                          {user.is_suspended && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                              Suspended ({user.active_suspension_count})
                            </span>
                          )}
                          {!user.is_suspended && user.account_status === "on_hold" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                              On Hold
                            </span>
                          )}
                          {!user.is_suspended && user.account_status !== "on_hold" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {user.is_suspended && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({
                              type: "lift_suspension",
                              userId: user.user_id,
                              issue: { description: `Lift ${user.active_suspension_count} active suspension(s)` },
                            });
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg text-xs font-medium hover:shadow-lg hover:shadow-green-500/30 transition-all"
                        >
                          Lift Suspension
                        </button>
                      )}
                      <div className="text-right">
                        <div className="text-sm font-medium text-orange-400">
                          {formatCurrency(user.total_affected_amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.issue_count} issue{user.issue_count !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Wallets:
                        </span>
                        <span className="text-xs text-cyan-400">
                          C: {formatCurrency(user.captcha_wallet)}
                        </span>
                        <span className="text-xs text-cyan-400">
                          A: {formatCurrency(user.ad_view_wallet)}
                        </span>
                      </div>
                      <ChevronIcon
                        expanded={expandedUser === user.user_id}
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedUser === user.user_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/10 p-3 sm:p-4 space-y-3">
                        {user.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    ISSUE_TYPE_COLORS[issue.issue_type] || ""
                                  }`}
                                >
                                  {ISSUE_TYPE_LABELS[issue.issue_type] || issue.issue_type}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-gray-400 border border-white/10">
                                  {TASK_TYPE_LABELS[issue.task_type] || issue.task_type}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    STATUS_COLORS[issue.restore_status] || ""
                                  }`}
                                >
                                  {issue.restore_status}
                                </span>
                              </div>
                              {issue.restore_status === "pending" && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmAction({
                                        type: "restore",
                                        recordId: issue.restore_record_id,
                                        userId: user.user_id,
                                        issue,
                                      });
                                    }}
                                    className="px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg text-xs font-medium hover:shadow-lg hover:shadow-green-500/30 transition-all"
                                  >
                                    Restore
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmAction({
                                        type: "dismiss",
                                        recordId: issue.restore_record_id,
                                        userId: user.user_id,
                                        issue,
                                      });
                                    }}
                                    className="px-3 py-1 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-xs hover:bg-white/10 transition-all"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-300 break-words mb-2">
                              {issue.description}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Expected:</span>{" "}
                                <span className="text-green-400">
                                  {formatCurrency(issue.expected_amount)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Actual:</span>{" "}
                                <span className="text-orange-400">
                                  {formatCurrency(issue.actual_amount)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Difference:</span>{" "}
                                <span
                                  className={
                                    issue.difference > 0
                                      ? "text-red-400"
                                      : issue.difference < 0
                                      ? "text-green-400"
                                      : "text-gray-400"
                                  }
                                >
                                  {issue.difference > 0 ? "+" : ""}
                                  {formatCurrency(issue.difference)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Wallet:</span>{" "}
                                <span className="text-cyan-400">
                                  {issue.affected_wallet}
                                </span>
                              </div>
                            </div>
                            {issue.task_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                Task date:{" "}
                                {new Date(issue.task_date).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
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
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              log.action === "execute_account_restore"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {log.action === "execute_account_restore"
                              ? "Restored"
                              : "Dismissed"}
                          </span>
                          <span className="text-gray-300">
                            User #{log.target_user_id}
                            {log.target_username &&
                              ` (${log.target_username})`}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.details && (
                        <div className="text-xs text-gray-400 mt-1 break-words">
                          {log.details}
                        </div>
                      )}
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
                {confirmAction.type === "restore"
                  ? "Confirm Restore"
                  : confirmAction.type === "lift_suspension"
                  ? "Confirm Lift Suspension"
                  : "Confirm Dismiss"}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {confirmAction.type === "restore"
                  ? `This will adjust the user's ${confirmAction.issue.affected_wallet} by ${formatCurrency(confirmAction.issue.difference)}.`
                  : confirmAction.type === "lift_suspension"
                  ? "This will lift all active suspensions and restore the user's account to Active status."
                  : "This will dismiss the record as a false positive."}
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
                <div className="text-xs text-gray-400 mb-1">Target User</div>
                <div className="text-sm text-white">
                  #{confirmAction.userId}
                </div>
                <div className="text-xs text-gray-400 mt-2 mb-1">
                  {confirmAction.type === "lift_suspension" ? "Action" : "Issue"}
                </div>
                <div className="text-sm text-gray-300 break-words">
                  {confirmAction.issue.description}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  placeholder="Reason for this action..."
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
                  onClick={() =>
                    confirmAction.type === "restore"
                      ? handleRestore(confirmAction.recordId)
                      : confirmAction.type === "lift_suspension"
                      ? handleLiftSuspension(confirmAction.userId)
                      : handleDismiss(confirmAction.recordId)
                  }
                  disabled={actionLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                    confirmAction.type === "restore" || confirmAction.type === "lift_suspension"
                      ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30"
                      : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : confirmAction.type === "restore" ? (
                    "Confirm Restore"
                  ) : confirmAction.type === "lift_suspension" ? (
                    "Confirm Lift Suspension"
                  ) : (
                    "Confirm Dismiss"
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

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-400 transition-transform ${
        expanded ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
