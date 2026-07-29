import { useEffect, useState, useCallback } from "react";
import useUserStore from "../../store/userStore.js";

const extractDetail = (data) => {
  if (!data) return "Something went wrong";
  if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join("; ");
  return data.detail || data.message || "Something went wrong";
};

const EMPTY_FORM = {
  title: "",
  youtube_url: "",
  required_watch_seconds: 30,
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AdManagement() {
  const token = useUserStore((state) => state.token);

  const [ads, setAds] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/ads?page=${page}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractDetail(data));
      setAds(data.ads || []);
      setTotal(data.total || 0);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    if (token) loadAds();
  }, [token, loadAds]);

  const handleCreate = async () => {
    if (!form.title.trim()) { setErrorMessage("Title is required"); return; }
    if (!form.youtube_url.trim()) { setErrorMessage("YouTube URL is required"); return; }
    if (form.required_watch_seconds < 5) { setErrorMessage("Watch seconds must be at least 5"); return; }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const body = new FormData();
      body.append("title", form.title.trim());
      body.append("youtube_url", form.youtube_url.trim());
      body.append("required_watch_seconds", form.required_watch_seconds);
      if (thumbnailFile) body.append("thumbnail", thumbnailFile);
      const res = await fetch("/api/v1/admin/ads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractDetail(data));
      setSuccessMessage(`Ad "${form.title}" created successfully`);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setThumbnailFile(null);
      await loadAds();
    } catch (error) {
      setErrorMessage(error.message);
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
      const body = new FormData();
      if (form.title.trim()) body.append("title", form.title.trim());
      if (form.youtube_url.trim()) body.append("youtube_url", form.youtube_url.trim());
      body.append("required_watch_seconds", form.required_watch_seconds);
      if (thumbnailFile) body.append("thumbnail", thumbnailFile);
      const res = await fetch(`/api/v1/admin/ads/${showEdit.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractDetail(data));
      setSuccessMessage(`Ad updated successfully`);
      setShowEdit(null);
      await loadAds();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (ad) => {
    try {
      const res = await fetch(`/api/v1/admin/ads/${ad.id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractDetail(data));
      await loadAds();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleDelete = async (ad) => {
    if (!window.confirm(`Delete ad "${ad.title}"? This cannot be undone.`)) return;
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await fetch(`/api/v1/admin/ads/${ad.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractDetail(data));
      setSuccessMessage(`Ad "${ad.title}" deleted`);
      await loadAds();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const openEdit = (ad) => {
    setForm({
      title: ad.title,
      youtube_url: ad.youtube_url,
      required_watch_seconds: ad.required_watch_seconds,
    });
    setThumbnailFile(null);
    setShowEdit(ad);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading ads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Ad{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="text-gray-400">
            Manage YouTube Ads for the Ad View & Earn system
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}
          className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity"
        >
          + Add YouTube Ad
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

      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Preview</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Video ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Watch (s)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No ads yet. Click "Add YouTube Ad" to create one.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-20 h-14 rounded-lg overflow-hidden bg-black/40">
                        <img
                          src={ad.thumbnail || `https://img.youtube.com/vi/${ad.video_id}/hqdefault.jpg`}
                          alt={ad.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate">{ad.title}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{ad.video_id}</td>
                    <td className="px-4 py-3 text-gray-300">{ad.required_watch_seconds}s</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggle(ad)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          ad.is_active
                            ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                            : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        }`}
                      >
                        {ad.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {ad.created_at ? new Date(ad.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={ad.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/20"
                        >
                          YouTube
                        </a>
                        <button
                          type="button"
                          onClick={() => openEdit(ad)}
                          className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ad)}
                          className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 50 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-400">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={ads.length < 50}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {(showCreate || showEdit) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D1B3A] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {showCreate ? "Add YouTube Ad" : `Edit: ${showEdit.title}`}
              </h2>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setShowEdit(null); }}
                className="text-gray-400 hover:text-white"
              >
                ✕
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
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Ad Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  placeholder="e.g. Crypto Explained"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">YouTube URL *</label>
                <input
                  type="text"
                  value={form.youtube_url}
                  onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-gray-500 mt-1">Supports youtube.com/watch, youtu.be, /embed/ URLs</p>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Required Watch Time (seconds)</label>
                <input
                  type="number"
                  min="5"
                  value={form.required_watch_seconds}
                  onChange={(e) => setForm({ ...form, required_watch_seconds: parseInt(e.target.value) || 30 })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum seconds user must watch before earning. Min: 5</p>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Thumbnail Image (optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setThumbnailFile(e.target.files[0] || null)}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/30"
                />
                <p className="text-xs text-gray-500 mt-1">Upload a custom thumbnail. Falls back to YouTube auto-generated thumbnail.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setShowEdit(null); }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={showCreate ? handleCreate : handleEdit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : showCreate ? "Add Ad" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
