import { useEffect, useState, useCallback } from "react";
import useUserStore from "../../store/userStore.js";
import {
  getAdminPackages,
  createAdminPackage,
  updateAdminPackage,
  deleteAdminPackage,
  toggleAdminPackage,
  getPackageStats,
  getPackageSubscribers,
  bulkTogglePackages,
} from "../../api/admin.api.js";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

const TASK_TYPES = [
  { value: "captcha", label: "Captcha Typing" },
  { value: "ad_view", label: "Ad View" },
];

const EMPTY_FORM = {
  name: "",
  investment_amount: "",
  total_return: "",
  daily_payment: "",
  duration_days: 365,
  captcha_required_per_day: 12,
  captcha_task_duration_seconds: 30,
  earn_per_captcha: 0.01,
  daily_captcha_limit: 12,
  task_type: "captcha",
  ad_duration_seconds: 30,
  signup_arbx_bonus: 0,
};

export default function PackageManagement() {
  const token = useUserStore((state) => state.token);

  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showSubscribers, setShowSubscribers] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [subscribersPage, setSubscribersPage] = useState(1);
  const [subscribersTotal, setSubscribersTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const [pkgsData, statsData] = await Promise.all([
        getAdminPackages(token),
        getPackageStats(token),
      ]);
      setPackages(pkgsData?.packages || []);
      setStats(statsData?.packages || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadPackages();
  }, [token, loadPackages]);

  useEffect(() => {
    if (!showSubscribers) return;
    const loadSubscribers = async () => {
      try {
        const data = await getPackageSubscribers(token, showSubscribers.id, subscribersPage);
        setSubscribers(data?.subscribers || []);
        setSubscribersTotal(data?.total_subscribers || 0);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    };
    loadSubscribers();
  }, [token, showSubscribers, subscribersPage]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setErrorMessage("Package name is required");
      return;
    }
    if (!form.investment_amount || Number(form.investment_amount) <= 0) {
      setErrorMessage("Investment amount must be positive");
      return;
    }
    if (!form.total_return || Number(form.total_return) <= 0) {
      setErrorMessage("Total return must be positive");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await createAdminPackage(token, {
        name: form.name.trim(),
        investment_amount: Number(form.investment_amount),
        total_return: Number(form.total_return),
        daily_payment: Number(form.daily_payment) || Number(form.total_return) / Number(form.duration_days || 365),
        duration_days: Number(form.duration_days) || 365,
        captcha_required_per_day: Number(form.captcha_required_per_day) || 12,
        captcha_task_duration_seconds: Number(form.captcha_task_duration_seconds) || 30,
        earn_per_captcha: Number(form.earn_per_captcha) || 0.01,
        daily_captcha_limit: Number(form.daily_captcha_limit) || 12,
        task_type: form.task_type || "captcha",
        ad_duration_seconds: Number(form.ad_duration_seconds) || 30,
        signup_arbx_bonus: Number(form.signup_arbx_bonus) || 0,
      });
      setSuccessMessage(`Package "${form.name}" created successfully`);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await loadPackages();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await updateAdminPackage(token, showEdit.id, {
        name: form.name.trim(),
        investment_amount: Number(form.investment_amount),
        total_return: Number(form.total_return),
        daily_payment: Number(form.daily_payment),
        duration_days: Number(form.duration_days),
        captcha_required_per_day: Number(form.captcha_required_per_day),
        captcha_task_duration_seconds: Number(form.captcha_task_duration_seconds),
        earn_per_captcha: Number(form.earn_per_captcha),
        daily_captcha_limit: Number(form.daily_captcha_limit),
        task_type: form.task_type || "captcha",
        ad_duration_seconds: Number(form.ad_duration_seconds) || 30,
        signup_arbx_bonus: Number(form.signup_arbx_bonus) || 0,
        is_active: form.is_active,
      });
      setSuccessMessage(`Package "${form.name}" updated successfully`);
      setShowEdit(null);
      await loadPackages();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Delete package "${pkg.name}"? This cannot be undone.`)) return;
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await deleteAdminPackage(token, pkg.id);
      setSuccessMessage(`Package "${pkg.name}" deleted`);
      await loadPackages();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleToggle = async (pkg) => {
    try {
      await toggleAdminPackage(token, pkg.id);
      await loadPackages();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleBulkToggle = async (isActive) => {
    if (selectedIds.length === 0) {
      setErrorMessage("Select packages first");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await bulkTogglePackages(token, selectedIds, isActive);
      setSelectedIds([]);
      setSuccessMessage(`${selectedIds.length} packages ${isActive ? "activated" : "deactivated"}`);
      await loadPackages();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === packages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(packages.map((p) => p.id));
    }
  };

  const openEdit = (pkg) => {
    setForm({
      name: pkg.name,
      investment_amount: pkg.investment_amount,
      total_return: pkg.total_return,
      daily_payment: pkg.daily_payment,
      duration_days: pkg.duration_days,
      captcha_required_per_day: pkg.captcha_required_per_day,
      captcha_task_duration_seconds: pkg.captcha_task_duration_seconds,
      earn_per_captcha: pkg.earn_per_captcha || 0.01,
      daily_captcha_limit: pkg.daily_captcha_limit || 12,
      task_type: pkg.task_type || "captcha",
      ad_duration_seconds: pkg.ad_duration_seconds || 30,
      signup_arbx_bonus: pkg.signup_arbx_bonus ?? 0,
      is_active: pkg.is_active,
    });
    setShowEdit(pkg);
  };

  const getStatForPackage = (name) =>
    stats.find((s) => s.name === name) || {};

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Package{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="text-gray-400">
            Create, edit, and manage all investment packages
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setShowCreate(true);
          }}
          className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity"
        >
          + Create Package
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {successMessage}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
          <span className="text-sm text-blue-200">
            {selectedIds.length} package(s) selected
          </span>
          <button
            type="button"
            onClick={() => handleBulkToggle(true)}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
          >
            Activate All
          </button>
          <button
            type="button"
            onClick={() => handleBulkToggle(false)}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
          >
            Deactivate All
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-500"
          >
            Clear Selection
          </button>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === packages.length && packages.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-[#0A122C] text-cyan-500 focus:ring-cyan-500/50"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Package</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Return</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Daily Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Daily Required</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Daily Max</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Earn/Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">OFA Bonus</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Investors</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Profit Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {packages.map((pkg) => {
                const pkgStat = getStatForPackage(pkg.name);
                return (
                  <tr key={pkg.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(pkg.id)}
                        onChange={() => toggleSelect(pkg.id)}
                        className="rounded border-white/20 bg-[#0A122C] text-cyan-500 focus:ring-cyan-500/50"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{pkg.name}</td>
                    <td className="px-4 py-3 text-cyan-300">${pkg.investment_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-300">${pkg.total_return.toLocaleString()}</td>
                    <td className="px-4 py-3 text-yellow-300">${pkg.daily_payment.toFixed(2)}/day</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${pkg.task_type === "ad_view" ? "bg-purple-500/20 text-purple-300" : "bg-cyan-500/20 text-cyan-300"}`}>
                        {pkg.task_type === "ad_view" ? "Ad View" : "Captcha"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{pkg.captcha_required_per_day}</td>
                    <td className="px-4 py-3 text-gray-300">{pkg.daily_captcha_limit}</td>
                    <td className="px-4 py-3 text-green-300">${(pkg.earn_per_captcha || 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-purple-300">{(pkg.signup_arbx_bonus || 0).toFixed(2)} OFA</td>
                    <td className="px-4 py-3 text-gray-300">{pkg.duration_days}d</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggle(pkg)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          pkg.is_active
                            ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                            : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        }`}
                      >
                        {pkg.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{pkgStat.total_investors || 0}</td>
                    <td className="px-4 py-3 text-cyan-300">${(pkgStat.total_invested || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-300">${(pkgStat.total_profit_paid || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSubscribersPage(1);
                            setShowSubscribers(pkg);
                          }}
                          className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-500"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(pkg)}
                          className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(pkg)}
                          className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(showCreate || showEdit) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D1B3A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {showCreate ? "Create New Package" : `Edit: ${showEdit.name}`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setShowEdit(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Package Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  placeholder="e.g. Starter"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Investment Amount ($) *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.investment_amount}
                    onChange={(e) => setForm({ ...form, investment_amount: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Total Return ($) *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.total_return}
                    onChange={(e) => setForm({ ...form, total_return: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Daily Payment ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.daily_payment}
                    onChange={(e) => setForm({ ...form, daily_payment: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                    placeholder="Auto-calculated if empty"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Duration (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration_days}
                    onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Task Type</label>
                <div className="flex gap-3">
                  {TASK_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, task_type: t.value })}
                      className={`flex-1 p-3 rounded-xl text-sm font-medium transition-colors ${
                        form.task_type === t.value
                          ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                          : "bg-white/5 text-gray-400 border border-white/10"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">{form.task_type === "ad_view" ? "Ad Duration (sec)" : "Task Duration (sec)"}</label>
                <input
                  type="number"
                  min="5"
                  value={form.task_type === "ad_view" ? form.ad_duration_seconds : form.captcha_task_duration_seconds}
                  onChange={(e) => {
                    if (form.task_type === "ad_view") {
                      setForm({ ...form, ad_duration_seconds: e.target.value });
                    } else {
                      setForm({ ...form, captcha_task_duration_seconds: e.target.value });
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Earn Per Task ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.earn_per_captcha}
                    onChange={(e) => setForm({ ...form, earn_per_captcha: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">{form.task_type === "ad_view" ? "Daily Ads Required" : "Daily Captchas Required"}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.captcha_required_per_day}
                    onChange={(e) => setForm({ ...form, captcha_required_per_day: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum tasks required per day for ROI payout</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">{form.task_type === "ad_view" ? "Max Ads Per Day" : "Max Captchas Per Day"}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.daily_captcha_limit}
                    onChange={(e) => setForm({ ...form, daily_captcha_limit: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum tasks a user can complete per day</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">OFA Signup Bonus</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.signup_arbx_bonus}
                    onChange={(e) => setForm({ ...form, signup_arbx_bonus: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  />
                </div>
              </div>

              {showEdit && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">Status:</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      form.is_active
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {form.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setShowEdit(null);
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={showCreate ? handleCreate : handleEdit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : showCreate
                    ? "Create Package"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubscribers && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D1B3A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                Subscribers: {showSubscribers.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowSubscribers(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-400">
              Total: {subscribersTotal} subscriber(s)
            </p>

            {subscribers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No subscribers yet</p>
            ) : (
              <div className="space-y-3">
                {subscribers.map((sub) => (
                  <div
                    key={sub.investment_id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{sub.username}</p>
                      <p className="text-xs text-gray-400">{sub.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-cyan-300 font-medium">
                        ${sub.invested_amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-400">
                        Earned: ${(sub.profit_earned + (sub.total_captcha_earned || 0) + (sub.total_ad_view_earned || 0)).toFixed(2)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        sub.status === "active"
                          ? "bg-green-500/20 text-green-300"
                          : sub.status === "completed"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-gray-500/20 text-gray-300"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {subscribersTotal > 50 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubscribersPage((p) => Math.max(1, p - 1))}
                  disabled={subscribersPage === 1}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-400">
                  Page {subscribersPage}
                </span>
                <button
                  type="button"
                  onClick={() => setSubscribersPage((p) => p + 1)}
                  disabled={subscribers.length < 50}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
