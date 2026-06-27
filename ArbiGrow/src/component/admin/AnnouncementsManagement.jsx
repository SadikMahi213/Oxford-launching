import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit2, Megaphone, Plus, Power, Trash2, X } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAdminAnnouncements,
  updateAnnouncement,
  updateAnnouncementStatus,
} from "../../api/admin.api.js";

const emptyForm = {
  title: "",
  message: "",
  isActive: true,
  imageFile: null,
  imageUrl: "",
  imagePreview: "",
};

const getErrorMessage = (error) => {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    const joined = detail
      .map((item) => item?.msg || item?.message || "")
      .filter(Boolean)
      .join(" | ");
    return joined || "Validation failed";
  }

  if (detail && typeof detail === "object") {
    return detail?.message || "Request failed";
  }

  return (
    (typeof detail === "string" ? detail : "") ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
};

export default function AnnouncementsManagement() {
  const token = useUserStore((state) => state.token);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getAdminAnnouncements(token);
      setAnnouncements(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(
    () => () => {
      if (form.imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(form.imagePreview);
      }
    },
    [form.imagePreview],
  );

  const resetForm = () => {
    if (form.imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(form.imagePreview);
    }
    setForm(emptyForm);
    setEditingItem(null);
  };

  const closeModal = (force = false) => {
    if (isSubmitting && !force) return;
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    setErrorMessage("");
    setSuccessMessage("");
    resetForm();
    setForm({
      ...emptyForm,
      isActive: announcements.length === 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingItem(item);
    setForm({
      title: item?.title || "",
      message: item?.message || "",
      isActive: Boolean(item?.is_active),
      imageFile: null,
      imageUrl: item?.image_url || "",
      imagePreview: item?.image_url || "",
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    setForm((prev) => {
      if (prev.imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.imagePreview);
      }
      return {
        ...prev,
        imageFile: nextFile,
        imagePreview: nextFile ? URL.createObjectURL(nextFile) : "",
      };
    });
  };

  const buildFormData = () => {
    const payload = new FormData();
    payload.append("title", form.title.trim());
    payload.append("message", form.message.trim());
    payload.append("is_active", String(Boolean(form.isActive)));
    if (form.imageFile) {
      payload.append("image", form.imageFile);
    }
    if (form.imageUrl.trim()) {
      payload.append("image_url", form.imageUrl.trim());
    }
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    if (!editingItem && !form.imageFile && !form.imageUrl.trim()) {
      setErrorMessage("Please upload an image or provide an image URL.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = buildFormData();

      if (editingItem) {
        await updateAnnouncement(token, editingItem.id, payload);
        setSuccessMessage("Announcement updated successfully.");
      } else {
        await createAnnouncement(token, payload);
        setSuccessMessage("Announcement created successfully.");
      }

      closeModal(true);
      await loadAnnouncements();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      setActionId(item.id);
      setErrorMessage("");
      setSuccessMessage("");
      await updateAnnouncementStatus(token, item.id, !item.is_active);
      setSuccessMessage(
        !item.is_active
          ? "Announcement activated successfully."
          : "Announcement disabled successfully.",
      );
      await loadAnnouncements();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Delete announcement "${item.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setActionId(item.id);
      setErrorMessage("");
      setSuccessMessage("");
      await deleteAnnouncement(token, item.id);
      setSuccessMessage("Announcement deleted successfully.");
      await loadAnnouncements();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const sortedAnnouncements = useMemo(
    () =>
      [...announcements].sort((a, b) => {
        const aDate = new Date(a?.updated_at || 0).getTime();
        const bDate = new Date(b?.updated_at || 0).getTime();
        return bDate - aDate;
      }),
    [announcements],
  );

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">
            Announcement{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="text-gray-400">
            Create and control user announcements with image banners
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          New Announcement
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
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Image
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Message
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Updated
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    Loading announcements...
                  </td>
                </tr>
              )}
              {!loading && sortedAnnouncements.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    No announcements created yet.
                  </td>
                </tr>
              )}
              {!loading &&
                sortedAnnouncements.map((item) => {
                  const busy = actionId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="h-14 w-24 overflow-hidden rounded-lg border border-white/15 bg-[#0c1035]">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">
                              No Image
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white font-semibold">{item.title}</td>
                      <td className="max-w-sm px-6 py-4 text-sm text-gray-300">
                        <p className="max-h-12 overflow-hidden break-words">
                          {item.message || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            item.is_active
                              ? "border-green-500/40 bg-green-500/10 text-green-300"
                              : "border-gray-500/30 bg-gray-500/10 text-gray-400"
                          }`}
                        >
                          {item.is_active ? "ACTIVE" : "DISABLED"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(item.updated_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            disabled={busy}
                            className="rounded-lg border border-blue-500/30 bg-blue-600/20 p-2 text-blue-300 transition-colors hover:bg-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Edit announcement"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={busy}
                            className={`rounded-lg border p-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                              item.is_active
                                ? "border-amber-500/30 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                : "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            }`}
                            title={item.is_active ? "Disable announcement" : "Activate announcement"}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={busy}
                            className="rounded-lg border border-red-500/30 bg-red-600/20 p-2 text-red-300 transition-colors hover:bg-red-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Delete announcement"
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

        <div className="md:hidden p-4 space-y-3">
          {loading && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-gray-400">
              Loading announcements...
            </div>
          )}

          {!loading && sortedAnnouncements.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-gray-400">
              No announcements created yet.
            </div>
          )}

          {!loading &&
            sortedAnnouncements.map((item) => {
              const busy = actionId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#0c1035]">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {item.title}
                      </div>
                      <p className="mt-1 text-xs text-gray-300 break-words">
                        {item.message || "-"}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            item.is_active
                              ? "border-green-500/40 bg-green-500/10 text-green-300"
                              : "border-gray-500/30 bg-gray-500/10 text-gray-400"
                          }`}
                        >
                          {item.is_active ? "ACTIVE" : "DISABLED"}
                        </span>
                        <span className="text-[11px] text-gray-400 text-right">
                          {formatDate(item.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-blue-500/30 bg-blue-600/20 py-2 text-blue-300 transition-colors hover:bg-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(item)}
                      disabled={busy}
                      className={`flex-1 rounded-lg border py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                        item.is_active
                          ? "border-amber-500/30 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                          : "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      }`}
                    >
                      {item.is_active ? "Disable" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-red-500/30 bg-red-600/20 py-2 text-red-300 transition-colors hover:bg-red-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0d1137] p-4 sm:p-6 shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto">
            <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-cyan-300" />
                {editingItem ? "Edit Announcement" : "New Announcement"}
              </h2>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-lg border border-white/20 bg-white/5 p-2 text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-300">Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="Announcement title"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleInputChange}
                  placeholder="Optional details for the modal"
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-cyan-200"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Recommended: portrait poster format for mobile popup.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Or Image URL</label>
                <input
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500/60"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Paste a direct link to an image. Used if no file is uploaded.
                </p>
              </div>

              {form.imagePreview && (
                <div className="overflow-hidden rounded-xl border border-white/15">
                  <img
                    src={form.imagePreview}
                    alt="Announcement preview"
                    className="max-h-56 sm:max-h-72 w-full object-contain bg-[#0c1035]"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 accent-cyan-500"
                />
                Activate after saving
              </label>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 font-semibold text-gray-200 transition-colors hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingItem
                      ? "Update Announcement"
                      : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
