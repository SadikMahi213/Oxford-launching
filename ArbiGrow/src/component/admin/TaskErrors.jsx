import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  RefreshCw,
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

export default function TaskErrors() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState([]);
  const [filters, setFilters] = useState({ status: "", task_type: "", user_id: "" });
  const [expandedError, setExpandedError] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [userSearchId, setUserSearchId] = useState("");
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });
  const [editingConfig, setEditingConfig] = useState(null);
  const [configValue, setConfigValue] = useState("");

  const token = useUserStore((state) => state.token);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.task_type) params.append("task_type", filters.task_type);
      if (filters.user_id) params.append("user_id", filters.user_id);
      params.append("limit", pagination.limit);
      params.append("offset", pagination.offset);

      const res = await api.get(`v1/admin/task-errors/errors?${params}`, authHeaders(token));
      const data = res.data || res;
      setErrors(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      console.error("Failed to fetch errors:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset, token]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get("v1/admin/task-errors/config", authHeaders(token));
      const data = res.data || res;
      setConfig(data.data || []);
    } catch (err) {
      console.error("Failed to fetch config:", err);
    }
  }, [token]);

  const fetchUserDetail = useCallback(async (userId) => {
    try {
      const res = await api.get(`v1/admin/task-errors/users/${userId}/status`, authHeaders(token));
      const data = res.data || res;
      setUserDetail(data);
    } catch (err) {
      console.error("Failed to fetch user detail:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchErrors();
    fetchConfig();
  }, [fetchErrors, fetchConfig]);

  const handleConfigUpdate = async (key) => {
    try {
      await api.put(`v1/admin/task-errors/config/${key}`, { value: configValue }, authHeaders(token));
      setEditingConfig(null);
      fetchConfig();
    } catch (err) {
      console.error("Failed to update config:", err);
    }
  };

  const handleReviewError = async (errorId, status) => {
    try {
      await api.put(`v1/admin/task-errors/errors/${errorId}/review`, { review_status: status }, authHeaders(token));
      fetchErrors();
    } catch (err) {
      console.error("Failed to review error:", err);
    }
  };

  const handleAction = async (userId, action, body = {}) => {
    try {
      await api.post(`v1/admin/task-errors/users/${userId}/${action}`, body, authHeaders(token));
      fetchUserDetail(userId);
      fetchErrors();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    }
  };

  const handleUserSearch = () => {
    if (userSearchId.trim()) {
      fetchUserDetail(userSearchId.trim());
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  const getActionBadge = (action) => {
    const colors = {
      none: "bg-gray-100 text-gray-700",
      warning: "bg-yellow-100 text-yellow-700",
      restriction: "bg-orange-100 text-orange-700",
      suspension: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[action] || colors.none}`}>
        {action}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      reviewed: "bg-green-100 text-green-700",
      dismissed: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Errors & Suspensions</h2>
          <p className="text-sm text-gray-500">Monitor and manage task error detection</p>
        </div>
      </div>

      {/* Disciplinary Config */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Disciplinary Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.map((cfg) => (
            <div key={cfg.key} className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">{cfg.description}</div>
              {editingConfig === cfg.key ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={configValue}
                    onChange={(e) => setConfigValue(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <button
                    onClick={() => handleConfigUpdate(cfg.key)}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    className="px-2 py-1 bg-gray-300 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600"
                  onClick={() => {
                    setEditingConfig(cfg.key);
                    setConfigValue(cfg.value);
                  }}
                >
                  {cfg.value}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">{cfg.key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* User Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">User Status Lookup</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            placeholder="Enter User ID"
            value={userSearchId}
            onChange={(e) => setUserSearchId(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleUserSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {userDetail && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold">{userDetail.username || `User #${userDetail.user_id}`}</h4>
                <p className="text-sm text-gray-500">Total Errors: {userDetail.total_errors}</p>
              </div>
              <div className="flex gap-2">
                {!userDetail.access?.allowed && userDetail.access?.status === "suspended" && (
                  <button
                    onClick={() => handleAction(userDetail.user_id, "lift-suspension")}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Lift Suspension
                  </button>
                )}
                {!userDetail.access?.allowed && userDetail.access?.status === "restricted" && (
                  <button
                    onClick={() => handleAction(userDetail.user_id, "lift-restriction")}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Lift Restriction
                  </button>
                )}
              </div>
            </div>

            <div className={`p-3 rounded-lg mb-4 ${userDetail.access?.allowed ? "bg-green-50" : "bg-red-50"}`}>
              <div className={`font-medium ${userDetail.access?.allowed ? "text-green-700" : "text-red-700"}`}>
                {userDetail.access?.allowed ? "Access Allowed" : "Access Blocked"}
              </div>
              {userDetail.access?.reason && (
                <div className="text-sm text-gray-600 mt-1">{userDetail.access?.reason}</div>
              )}
              {userDetail.access?.expires_at && (
                <div className="text-sm text-gray-500 mt-1">
                  Expires: {formatDate(userDetail.access?.expires_at)}
                </div>
              )}
            </div>

            {userDetail.warnings?.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium mb-2">Warnings</h5>
                {userDetail.warnings.map((w) => (
                  <div key={w.id} className="text-sm border-b py-2">
                    <span className="text-yellow-600">{w.warning_type}</span>: {w.reason}
                    <span className="text-gray-400 ml-2">({formatDate(w.created_at)})</span>
                  </div>
                ))}
              </div>
            )}

            {userDetail.suspensions?.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium mb-2">Suspensions</h5>
                {userDetail.suspensions.map((s) => (
                  <div key={s.id} className="text-sm border-b py-2">
                    <span className={`font-medium ${s.status === "active" ? "text-red-600" : "text-gray-500"}`}>
                      {s.status}
                    </span>
                    : {s.reason}
                    <span className="text-gray-400 ml-2">({formatDate(s.suspended_at)})</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select
            value={filters.task_type}
            onChange={(e) => setFilters((f) => ({ ...f, task_type: e.target.value }))}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            <option value="">All Tasks</option>
            <option value="captcha">Captcha</option>
            <option value="ad_view">Ad View</option>
          </select>
          <input
            type="number"
            placeholder="User ID"
            value={filters.user_id}
            onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))}
            className="px-3 py-1 border rounded-lg text-sm w-24"
          />
          <button
            onClick={() => {
              setPagination((p) => ({ ...p, offset: 0 }));
              fetchErrors();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setFilters({ status: "", task_type: "", user_id: "" });
              setPagination((p) => ({ ...p, offset: 0 }));
            }}
            className="px-3 py-1 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Errors Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Error Log</h3>
          <button
            onClick={fetchErrors}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : errors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No errors found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Error</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {errors.map((error) => (
                  <>
                    <tr key={error.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{error.id}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{error.username || `User #${error.user_id}`}</div>
                        <div className="text-xs text-gray-500">{error.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          error.task_type === "captcha" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {error.task_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-red-600">{error.error_code}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{error.error_reason}</div>
                      </td>
                      <td className="px-4 py-3">{getActionBadge(error.system_action)}</td>
                      <td className="px-4 py-3">{getStatusBadge(error.review_status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(error.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedError === error.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedError === error.id && (
                      <tr key={`${error.id}-detail`}>
                        <td colSpan="8" className="px-4 py-4 bg-gray-50">
                          <div className="flex gap-2">
                            {error.review_status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleReviewError(error.id, "reviewed")}
                                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 inline mr-1" />
                                  Mark Reviewed
                                </button>
                                <button
                                  onClick={() => handleReviewError(error.id, "dismissed")}
                                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                                >
                                  <XCircle className="w-4 h-4 inline mr-1" />
                                  Dismiss
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => fetchUserDetail(error.user_id)}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                            >
                              <User className="w-4 h-4 inline mr-1" />
                              View User
                            </button>
                          </div>
                          {error.admin_notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <strong>Notes:</strong> {error.admin_notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
                disabled={pagination.offset === 0}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((p) => ({ ...p, offset: p.offset + p.limit }))}
                disabled={pagination.offset + pagination.limit >= pagination.total}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
