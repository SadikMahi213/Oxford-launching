import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import {
  createDepositNetwork,
  deleteDepositNetwork,
  getDepositNetworks,
  updateDepositNetwork,
} from "../../api/admin.api.js";

const emptyForm = {
  network_name: "",
  display_name: "",
  wallet_address: "",
  status: true,
};

const toFormData = (network) => ({
  network_name: network?.network_name || "",
  display_name: network?.display_name || "",
  wallet_address: network?.wallet_address || "",
  status: Boolean(network?.status),
});

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

export default function DepositNetworks() {
  const token = useUserStore((state) => state.token);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNetworkId, setActionNetworkId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadNetworks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getDepositNetworks(token);
      setNetworks(response?.data || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadNetworks();
  }, [loadNetworks]);

  const closeModal = (force = false) => {
    if (isSubmitting && !force) return;
    setIsModalOpen(false);
    setEditingNetwork(null);
    setFormData(emptyForm);
  };

  const openAddModal = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingNetwork(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (network) => {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingNetwork(network);
    setFormData(toFormData(network));
    setIsModalOpen(true);
  };

  const onFieldChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "status" ? value === "active" : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      network_name: formData.network_name.trim(),
      display_name: formData.display_name.trim(),
      wallet_address: formData.wallet_address.trim(),
      status: formData.status,
    };

    if (!payload.network_name || !payload.display_name || !payload.wallet_address) {
      setErrorMessage("Please fill all fields.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingNetwork) {
        await updateDepositNetwork(token, editingNetwork.id, payload);
        setSuccessMessage("Network updated successfully.");
      } else {
        await createDepositNetwork(token, payload);
        setSuccessMessage("Network created successfully.");
      }

      closeModal(true);
      await loadNetworks();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (network) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Delete network "${network.display_name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setActionNetworkId(network.id);
      await deleteDepositNetwork(token, network.id);
      setSuccessMessage("Network deleted successfully.");
      await loadNetworks();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionNetworkId(null);
    }
  };

  const sortedNetworks = useMemo(
    () =>
      [...networks].sort((a, b) => {
        const aDate = new Date(a.date_created || 0).getTime();
        const bDate = new Date(b.date_created || 0).getTime();
        return bDate - aDate;
      }),
    [networks],
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
            Deposit{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Networks
            </span>
          </h1>
          <p className="text-gray-400">Configure available deposit networks</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          Add Network
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
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Network Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Display Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Wallet Address
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    Loading networks...
                  </td>
                </tr>
              )}

              {!loading && sortedNetworks.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    No networks found.
                  </td>
                </tr>
              )}

              {!loading &&
                sortedNetworks.map((network) => {
                  const isBusy = actionNetworkId === network.id;

                  return (
                    <tr key={network.id} className="transition-colors hover:bg-white/5">
                      <td className="px-6 py-4 text-gray-300">{network.network_name}</td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {network.display_name}
                      </td>
                      <td className="max-w-xs truncate px-6 py-4 font-mono text-sm text-gray-300">
                        {network.wallet_address}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusColor(network.status)}`}
                        >
                          {network.status ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(network)}
                            disabled={isBusy}
                            className="rounded-lg border border-blue-500/30 bg-blue-600/20 p-2 text-blue-400 transition-all hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Edit network"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(network)}
                            disabled={isBusy}
                            className="rounded-lg border border-red-500/30 bg-red-600/20 p-2 text-red-400 transition-all hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Delete network"
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
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0d1137] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingNetwork ? "Edit Network" : "Add Network"}
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
                <label className="mb-1 block text-sm text-gray-300">Network Name</label>
                <input
                  name="network_name"
                  value={formData.network_name}
                  onChange={onFieldChange}
                  placeholder="erc20"
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

              <div>
                <label className="mb-1 block text-sm text-gray-300">Wallet Address</label>
                <input
                  name="wallet_address"
                  value={formData.wallet_address}
                  onChange={onFieldChange}
                  placeholder="Wallet address"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition-colors focus:border-cyan-500/60"
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
                  <option
                    value="active"
                    style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                  >
                    Active
                  </option>
                  <option
                    value="inactive"
                    style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                  >
                    Inactive
                  </option>
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
                  {isSubmitting ? "Saving..." : editingNetwork ? "Update Network" : "Create Network"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
