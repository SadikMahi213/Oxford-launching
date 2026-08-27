import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import {
  createWithdrawalMethod,
  deleteWithdrawalMethod,
  getWithdrawalMethods,
  updateWithdrawalMethod,
} from "../../api/admin.api.js";

const emptyForm = {
  method_type: "network",
  name: "",
  display_name: "",
  wallet_address: "",
  instructions: "",
  min_amount: "",
  max_amount: "",
  fixed_fee: "0",
  percent_fee: "0",
  status: true,
};

const toFormData = (method) => ({
  method_type: method?.method_type || "network",
  name: method?.name || "",
  display_name: method?.display_name || "",
  wallet_address: method?.wallet_address || "",
  instructions: method?.instructions || "",
  min_amount: method?.min_amount ?? "",
  max_amount: method?.max_amount ?? "",
  fixed_fee: method?.fixed_fee ?? "0",
  percent_fee: method?.percent_fee ?? "0",
  status: Boolean(method?.status),
});

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

const METHOD_TYPE_OPTIONS = [
  { value: "bank", label: "Bank Transfer" },
  { value: "network", label: "Crypto Network" },
  { value: "mobile", label: "Mobile Money" },
];

export default function WithdrawalMethodManager() {
  const token = useUserStore((state) => state.token);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMethodId, setActionMethodId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadMethods = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getWithdrawalMethods(token);
      setMethods(response?.data || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const closeModal = (force = false) => {
    if (isSubmitting && !force) return;
    setIsModalOpen(false);
    setEditingMethod(null);
    setFormData(emptyForm);
  };

  const openAddModal = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingMethod(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (method) => {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingMethod(method);
    setFormData(toFormData(method));
    setIsModalOpen(true);
  };

  const onFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "status"
          ? value === "active"
          : name === "method_type"
            ? value
            : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      method_type: formData.method_type,
      name: formData.name.trim(),
      display_name: formData.display_name.trim(),
      wallet_address: formData.wallet_address.trim(),
      instructions: formData.instructions.trim(),
      status: formData.status,
    };

    if (formData.min_amount) payload.min_amount = formData.min_amount;
    if (formData.max_amount) payload.max_amount = formData.max_amount;
    if (formData.fixed_fee) payload.fixed_fee = formData.fixed_fee;
    if (formData.percent_fee) payload.percent_fee = formData.percent_fee;

    if (!payload.name || !payload.display_name) {
      setErrorMessage("Please fill all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingMethod) {
        await updateWithdrawalMethod(token, editingMethod.id, payload);
        setSuccessMessage("Withdrawal method updated successfully.");
      } else {
        await createWithdrawalMethod(token, payload);
        setSuccessMessage("Withdrawal method created successfully.");
      }

      closeModal(true);
      await loadMethods();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (method) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Delete withdrawal method "${method.display_name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setActionMethodId(method.id);
      await deleteWithdrawalMethod(token, method.id);
      setSuccessMessage("Withdrawal method deleted successfully.");
      await loadMethods();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionMethodId(null);
    }
  };

  const sortedMethods = useMemo(
    () =>
      [...methods].sort((a, b) => {
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return bDate - aDate;
      }),
    [methods],
  );

  const getStatusColor = (isActive) =>
    isActive
      ? "text-green-400 bg-green-500/10 border-green-500/30"
      : "text-gray-400 bg-gray-500/10 border-gray-500/30";

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">
            Withdrawal{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Methods
            </span>
          </h1>
          <p className="text-gray-400">Configure available withdrawal methods</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          Add Method
        </button>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {successMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">Display Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">Min/Max</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">Fees</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    Loading withdrawal methods...
                  </td>
                </tr>
              )}

              {!loading && sortedMethods.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    No withdrawal methods found.
                  </td>
                </tr>
              )}

              {!loading &&
                sortedMethods.map((method) => {
                  const isBusy = actionMethodId === method.id;

                  return (
                    <tr key={method.id} className="transition-colors hover:bg-white/5">
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-gray-300">
                          {method.method_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-300">{method.name}</td>
                      <td className="px-6 py-4 font-semibold text-white">{method.display_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {method.min_amount ?? "—"} / {method.max_amount ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {method.fixed_fee && Number(method.fixed_fee) > 0 ? `${method.fixed_fee} USDT` : ""}
                        {method.fixed_fee && Number(method.fixed_fee) > 0 && method.percent_fee && Number(method.percent_fee) > 0 ? " + " : ""}
                        {method.percent_fee && Number(method.percent_fee) > 0 ? `${method.percent_fee}%` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusColor(method.status)}`}
                        >
                          {method.status ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(method)}
                            disabled={isBusy}
                            className="rounded-lg border border-blue-500/30 bg-blue-600/20 p-2 text-blue-400 transition-all hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Edit method"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(method)}
                            disabled={isBusy}
                            className="rounded-lg border border-red-500/30 bg-red-600/20 p-2 text-red-400 transition-all hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Delete method"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1137] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingMethod ? "Edit Withdrawal Method" : "Add Withdrawal Method"}
              </h2>

              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-lg border border-white/20 bg-white/5 p-2 text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-300">Method Type</label>
                <select
                  name="method_type"
                  value={formData.method_type}
                  onChange={onFieldChange}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                >
                  {METHOD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={onFieldChange}
                    placeholder="usdt_erc20"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Display Name</label>
                  <input
                    name="display_name"
                    value={formData.display_name}
                    onChange={onFieldChange}
                    placeholder="USDT (ERC20)"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">
                  Wallet Address <span className="text-gray-500">(for network type)</span>
                </label>
                <input
                  name="wallet_address"
                  value={formData.wallet_address}
                  onChange={onFieldChange}
                  placeholder="Wallet address"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition-colors focus:border-cyan-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Min Amount (USDT)</label>
                  <input
                    name="min_amount"
                    value={formData.min_amount}
                    onChange={onFieldChange}
                    placeholder="10"
                    type="number"
                    step="any"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Max Amount (USDT)</label>
                  <input
                    name="max_amount"
                    value={formData.max_amount}
                    onChange={onFieldChange}
                    placeholder="700"
                    type="number"
                    step="any"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Fixed Fee (USDT)</label>
                  <input
                    name="fixed_fee"
                    value={formData.fixed_fee}
                    onChange={onFieldChange}
                    placeholder="0"
                    type="number"
                    step="any"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Percent Fee (%)</label>
                  <input
                    name="percent_fee"
                    value={formData.percent_fee}
                    onChange={onFieldChange}
                    placeholder="0"
                    type="number"
                    step="any"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Instructions</label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={onFieldChange}
                  rows={3}
                  placeholder="Instructions for users..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Status</label>
                <select
                  name="status"
                  value={formData.status ? "active" : "inactive"}
                  onChange={onFieldChange}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                >
                  <option value="active" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Active</option>
                  <option value="inactive" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 font-semibold text-gray-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : editingMethod ? "Update Method" : "Create Method"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
