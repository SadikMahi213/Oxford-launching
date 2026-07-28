import { useCallback, useEffect, useState } from "react";
import useUserStore from "../../store/userStore.js";
import {
  getAdminRanks,
  createAdminRank,
  updateAdminRank,
  deleteAdminRank,
} from "../../api/admin.api.js";
import { Plus, Pencil, Trash2, Power, PowerOff, Medal, X } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  slug: "",
  sort_order: 1,
  target_volume: "0",
  max_matching_percent: "100",
  is_active: true,
  description: "",
  bonus_configs: [{ bonus_type: "matching", bonus_percent: "0", sort_order: 0 }],
};

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

export default function RankManagement() {
  const token = useUserStore((state) => state.token);
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadRanks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminRanks(token);
      setRanks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) loadRanks();
  }, [token, loadRanks]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (rank) => {
    setEditing(rank);
    setForm({
      name: rank.name || "",
      slug: rank.slug || "",
      sort_order: rank.sort_order || 1,
      target_volume: String(rank.target_volume || "0"),
      max_matching_percent: String(rank.max_matching_percent || "100"),
      is_active: rank.is_active ?? true,
      description: rank.description || "",
      bonus_configs: Array.isArray(rank.bonus_configs) && rank.bonus_configs.length > 0
        ? rank.bonus_configs.map((bc) => ({
            bonus_type: bc.bonus_type || "",
            bonus_percent: String(bc.bonus_percent || "0"),
            sort_order: bc.sort_order ?? 0,
          }))
        : [{ bonus_type: "matching", bonus_percent: "0", sort_order: 0 }],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setError("");
  };

  const addBonusField = () => {
    setForm((f) => ({
      ...f,
      bonus_configs: [
        ...f.bonus_configs,
        { bonus_type: "", bonus_percent: "0", sort_order: f.bonus_configs.length },
      ],
    }));
  };

  const removeBonusField = (index) => {
    setForm((f) => ({
      ...f,
      bonus_configs: f.bonus_configs.filter((_, i) => i !== index).map((bc, i) => ({ ...bc, sort_order: i })),
    }));
  };

  const updateBonusField = (index, field, value) => {
    setForm((f) => ({
      ...f,
      bonus_configs: f.bonus_configs.map((bc, i) =>
        i === index ? { ...bc, [field]: value } : bc
      ),
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        sort_order: Number(form.sort_order),
        target_volume: form.target_volume,
        max_matching_percent: form.max_matching_percent,
        bonus_configs: form.bonus_configs.map((bc, i) => ({
          bonus_type: bc.bonus_type,
          bonus_percent: bc.bonus_percent,
          sort_order: i,
        })),
      };
      if (editing) {
        await updateAdminRank(token, editing.id, payload);
        setSuccess("Rank updated successfully.");
      } else {
        await createAdminRank(token, payload);
        setSuccess("Rank created successfully.");
      }
      closeModal();
      await loadRanks();
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setSubmitting(false);
  };

  const handleDelete = async (rank) => {
    if (!window.confirm(`Delete rank "${rank.name}"? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      await deleteAdminRank(token, rank.id);
      setSuccess(`Rank "${rank.name}" deleted.`);
      await loadRanks();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleToggle = async (rank) => {
    setError("");
    setSuccess("");
    try {
      await updateAdminRank(token, rank.id, { is_active: !rank.is_active });
      setSuccess(`Rank "${rank.name}" ${rank.is_active ? "disabled" : "enabled"}.`);
      await loadRanks();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const getMatchingPercent = (rank) => {
    if (!rank.bonus_configs) return "0";
    const mc = rank.bonus_configs.find((bc) => bc.bonus_type === "matching");
    return mc ? mc.bonus_percent : "0";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
            Rank Management
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Configure the 21-rank progressive matching bonus system
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
        >
          <Plus className="size-4" /> Create Rank
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-cyan-500" />
        </div>
      ) : (
        <div className="responsive-table-wrapper">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Target Vol.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Matching %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ranks.map((rank) => (
                  <tr key={rank.id} className="hover:bg-white/[0.02] transition-colors">
                    <td data-label="#" className="px-4 py-3 text-gray-400">{rank.sort_order}</td>
                    <td data-label="Rank" className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Medal className="size-4 text-yellow-400 shrink-0" />
                        <span className="font-medium text-white">{rank.name}</span>
                      </div>
                    </td>
                    <td data-label="Target Vol." className="px-4 py-3 font-mono text-gray-300">
                      ${Number(rank.target_volume).toLocaleString()}
                    </td>
                    <td data-label="Matching %" className="px-4 py-3 font-mono text-cyan-400">
                      {getMatchingPercent(rank)}%
                    </td>
                    <td data-label="Status" className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          rank.is_active
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {rank.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td data-label="Actions" className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(rank)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                          title={rank.is_active ? "Disable" : "Enable"}
                        >
                          {rank.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(rank)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rank)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0D1B3A] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editing ? "Edit Rank" : "Create Rank"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Slug *</label>
                  <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Sort Order *</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Target Volume ($) *</label>
                  <input type="text" value={form.target_volume} onChange={(e) => setForm({ ...form, target_volume: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Max Matching %</label>
                  <input type="text" value={form.max_matching_percent} onChange={(e) => setForm({ ...form, max_matching_percent: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white" />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-300">Bonus Percentages</p>
                  <button
                    type="button"
                    onClick={addBonusField}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Plus className="size-3" /> Add Bonus Field
                  </button>
                </div>
                <div className="space-y-2">
                  {form.bonus_configs.map((bc, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bc.bonus_type}
                        onChange={(e) => updateBonusField(index, "bonus_type", e.target.value)}
                        placeholder="Type (e.g. matching, extra)"
                        className="flex-1 rounded-xl border border-white/10 bg-[#0A122C] px-4 py-2.5 text-white text-sm"
                      />
                      <input
                        type="text"
                        value={bc.bonus_percent}
                        onChange={(e) => updateBonusField(index, "bonus_percent", e.target.value)}
                        placeholder="%"
                        className="w-24 rounded-xl border border-white/10 bg-[#0A122C] px-4 py-2.5 text-white text-sm text-right"
                      />
                      <button
                        type="button"
                        onClick={() => removeBonusField(index)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white" />
              </div>

              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-5 w-5 rounded border-white/10 bg-[#0A122C] text-cyan-500" />
                <span className="text-sm text-gray-300">Active</span>
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={closeModal}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-gray-300 transition hover:bg-white/10">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                {submitting ? "Saving..." : editing ? "Update Rank" : "Create Rank"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
