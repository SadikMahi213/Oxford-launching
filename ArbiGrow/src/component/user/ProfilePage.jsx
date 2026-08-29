import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Camera, Check, Lock, X, FileText, ShieldCheck, Eye } from "lucide-react";
import VerifiedBadge from "../common/VerifiedBadge";
import profilePlaceholder from "../../assets/banner.jpeg";
import useUserStore from "../../store/userStore";
import api from "../../api/axiosInstance.js";
import { useNavigate } from "react-router";
import { getMyKyc } from "../../api/kyc.api.js";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, setUser } = useUserStore();

  const displayUrl = user?.profile_image_url;
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoMode, setPhotoMode] = useState("url");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const initials = getInitials(user?.full_name);
  const showInitials = !displayUrl || !photoLoaded;

  // Read-only KYC submission view
  const [kycData, setKycData] = useState(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycError, setKycError] = useState("");

  useEffect(() => {
    let mounted = true;
    getMyKyc()
      .then((res) => {
        if (!mounted) return;
        if (res?.has_kyc && res?.kyc) setKycData(res.kyc);
        else setKycData(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setKycError(err?.response?.data?.detail || "");
        setKycData(null);
      })
      .finally(() => {
        if (mounted) setKycLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const isImageUrl = (url, key) => {
    const src = (url || key || "").toLowerCase();
    return src.endsWith(".jpg") || src.endsWith(".jpeg") || src.endsWith(".png") || src.endsWith(".webp") || src.endsWith(".gif");
  };
  const isPdfUrl = (url, key) => {
    const src = (url || key || "").toLowerCase();
    return src.endsWith(".pdf");
  };

  const handleSavePhoto = async () => {
    setPhotoLoading(true);
    setPhotoMsg("");
    try {
      const token = useUserStore.getState().token;
      let res;
      if (photoMode === "file" && photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const fetchRes = await fetch("/api/v1/user/profile-image/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        res = { data: await fetchRes.json() };
        if (!fetchRes.ok) throw new Error(res.data.detail || t('profile.photo_failed'));
        setPhotoMsg(t('profile.photo_uploaded'));
      } else if (!photoUrl.trim()) {
        setPhotoLoading(false);
        return;
      } else {
        res = await api.post("v1/user/profile-image", { profile_image_url: photoUrl.trim() }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPhotoMsg(t('profile.photo_saved'));
      }
      setPhotoLoaded(false);
      setUser({ profile_image_url: res.data.profile_image_url });
      setShowPhotoInput(false);
      setPhotoUrl("");
      setPhotoFile(null);
      setPhotoLoading(false);
      return;
    } catch (err) {
      setPhotoMsg(err.response?.data?.detail || err.message || t('profile.photo_saveFailed'));
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t('profile.title')}
            </span>
        </h1>
        <p className="text-sm text-gray-400">{t('profile.subtitle')}</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-blue-600/20 border-b border-white/10 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${profilePlaceholder})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {displayUrl ? (
                    <img
                      src={displayUrl}
                      alt={user.full_name}
                      className="w-full h-full object-cover"
                      onLoad={() => setPhotoLoaded(true)}
                      onError={(e) => { e.target.style.display = "none"; setPhotoLoaded(false) }}
                    />
                  ) : null}
                  <span className={`text-xl md:text-2xl font-bold text-white ${showInitials ? "" : "hidden"}`}>
                    {initials}
                  </span>
                </div>
                <button
                  onClick={() => { setShowPhotoInput(!showPhotoInput); setPhotoUrl(""); setPhotoMsg(""); setPhotoFile(null); setPhotoMode("url") }}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-500 border-2 border-[#0a0e27] flex items-center justify-center hover:bg-cyan-400 transition-colors"
                  title={t('profile.setPhoto')}
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-white">
                    {user.full_name}
                  </h2>
                  {user?.kyc_status === "approved" ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-xs text-green-400">
                      <VerifiedBadge size="xs" />
                      {t('profile.verified')}
                    </span>
                  ) : user?.kyc_status === "pending" ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-xs text-yellow-400">
                      {t('profile.processing')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-xs text-red-400">
                      {t('profile.unverified')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">@{user.username}</p>
              </div>
            </div>
          </div>

          {showPhotoInput && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setPhotoMode("url")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "url" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}
                >
                  {t('profile.url')}
                </button>
                <button
                  onClick={() => setPhotoMode("file")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "file" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}
                >
                  {t('profile.upload')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {photoMode === "url" ? (
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder={t('profile.url_plh')}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                    className="flex-1 text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
                  />
                )}
                <button
                  onClick={handleSavePhoto}
                  disabled={photoLoading || (photoMode === "url" ? !photoUrl.trim() : !photoFile)}
                  className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-500/30 disabled:opacity-50"
                >
                  {photoLoading ? <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 text-cyan-400" />}
                </button>
                <button
                  onClick={() => { setShowPhotoInput(false); setPhotoMsg("") }}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {photoMsg && (
                <p className={`mt-1 text-xs ${photoMsg === t('profile.photo_saved') || photoMsg === t('profile.photo_uploaded') ? "text-green-400" : "text-red-400"}`}>
                  {photoMsg}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Personal Information */}
        <div className="p-4 md:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            {t('profile.personalInfo')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">{t('profile.fullName')}</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{user.full_name}</p>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">{t('profile.username')}</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">@{user.username}</p>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">{t('profile.email')}</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{user.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">{t('profile.phone')}</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{user.phone_number}</p>
              </div>
            </div>

            {/* Country - Full Width */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-gray-400">{t('profile.country')}</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{user.country}</p>
              </div>
            </div>
          </div>

          {/* Change Password Button */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => navigate("/reset-password")}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {t('profile.changePassword')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Submitted KYC Documents — Read-Only */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
      >
        <div className="px-4 md:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-cyan-600/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white">Submitted KYC Documents</h3>
              <p className="text-xs text-gray-400">Read-only view of your submitted information and documents</p>
            </div>
            {kycData?.status && (
              <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold border ${kycData.status === "approved" ? "bg-green-500/20 border-green-500/40 text-green-400" : kycData.status === "pending" ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : "bg-red-500/20 border-red-500/40 text-red-400"}`}>
                {kycData.status.charAt(0).toUpperCase() + kycData.status.slice(1)}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6">
          {kycLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-400">Loading submitted documents...</span>
            </div>
          ) : !kycData ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No KYC submission found.</p>
              <p className="text-xs text-gray-500 mt-1">Submit your KYC to see documents here.</p>
            </div>
          ) : (
            <>
              {/* Submitted Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Full Name (KYC)</label>
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm">{kycData.full_name || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Country</label>
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm">{kycData.country || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Phone Number</label>
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm">{kycData.phone_number || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Document Type</label>
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm capitalize">{kycData.document_type || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Document Number</label>
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono">{kycData.document_number || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Transaction ID</label>
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono break-all">{kycData.transaction_id || "-"}</div>
                </div>
                {kycData.kyc_package && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">KYC Package</label>
                    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm">{kycData.kyc_package.name} — {kycData.kyc_package.price} USDT</div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Fee Paid</label>
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm">{kycData.fee_paid} USDT</div>
                </div>
                {kycData.admin_note && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-gray-400">Admin Note</label>
                    <div className="px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm">{kycData.admin_note}</div>
                  </div>
                )}
              </div>

              {/* Document Previews — Read Only, no edit */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Document Previews
                  <span className="text-xs font-normal text-gray-500">(read-only)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Front */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-xs text-gray-400 mb-2 font-medium">Front Side</div>
                    {!kycData.front_image_url ? (
                      <div className="h-48 flex flex-col items-center justify-center rounded-lg bg-black/20 border border-dashed border-white/10">
                        <FileText className="w-8 h-8 text-gray-500 mb-2" />
                        <p className="text-xs text-gray-500">Document not available</p>
                        <p className="text-[10px] text-gray-600 mt-1 break-all px-2 text-center">{kycData.front_image_key || ""}</p>
                      </div>
                    ) : isPdfUrl(kycData.front_image_url, kycData.front_image_key) ? (
                      <a href={kycData.front_image_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-48 rounded-lg bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-colors group">
                        <FileText className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span className="mt-2 text-sm text-cyan-300 font-medium">View PDF</span>
                        <span className="text-[10px] text-gray-500 mt-1">Opens in new tab</span>
                      </a>
                    ) : (
                      <img
                        src={kycData.front_image_url}
                        alt="KYC Front Document"
                        className="w-full h-48 object-contain rounded-lg bg-black/30 border border-white/10"
                        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                      />
                    )}
                    {/* Fallback for broken image - hidden by default, shown onError */}
                    {!kycData.front_image_url ? null : isPdfUrl(kycData.front_image_url, kycData.front_image_key) ? null : (
                      <div style={{ display: "none" }} className="h-48 flex-col items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">Failed to load image</p>
                        <p className="text-[10px] text-gray-500 break-all px-2 text-center mt-1">{kycData.front_image_key}</p>
                      </div>
                    )}
                  </div>

                  {/* Back */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-xs text-gray-400 mb-2 font-medium">Back Side {kycData.document_type === "passport" ? "(not required for passport)" : ""}</div>
                    {!kycData.back_image_url && !kycData.back_image_key ? (
                      <div className="h-48 flex flex-col items-center justify-center rounded-lg bg-black/20 border border-dashed border-white/10">
                        <FileText className="w-8 h-8 text-gray-500 mb-2" />
                        <p className="text-xs text-gray-500">{kycData.document_type === "passport" ? "Not required" : "No back document"}</p>
                      </div>
                    ) : !kycData.back_image_url ? (
                      <div className="h-48 flex flex-col items-center justify-center rounded-lg bg-black/20 border border-dashed border-white/10">
                        <FileText className="w-8 h-8 text-gray-500 mb-2" />
                        <p className="text-xs text-gray-500">Document not available</p>
                        <p className="text-[10px] text-gray-600 mt-1 break-all px-2 text-center">{kycData.back_image_key || ""}</p>
                      </div>
                    ) : isPdfUrl(kycData.back_image_url, kycData.back_image_key) ? (
                      <a href={kycData.back_image_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-48 rounded-lg bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-colors group">
                        <FileText className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span className="mt-2 text-sm text-cyan-300 font-medium">View PDF</span>
                        <span className="text-[10px] text-gray-500 mt-1">Opens in new tab</span>
                      </a>
                    ) : (
                      <img
                        src={kycData.back_image_url}
                        alt="KYC Back Document"
                        className="w-full h-48 object-contain rounded-lg bg-black/30 border border-white/10"
                        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                      />
                    )}
                    {!kycData.back_image_url ? null : isPdfUrl(kycData.back_image_url, kycData.back_image_key) ? null : (
                      <div style={{ display: "none" }} className="h-48 flex-col items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">Failed to load image</p>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 text-center">This is a read-only view. To resubmit, use the KYC Verification page. Documents are visible only to you and admins.</p>
              </div>
            </>
          )}
        </div>
      </motion.div>

    </div>
  );
};

export default ProfilePage;
