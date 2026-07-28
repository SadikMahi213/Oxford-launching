import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Camera, Check, Lock, Award, X } from "lucide-react";
import VerifiedBadge from "../common/VerifiedBadge";
import profilePlaceholder from "../../assets/banner.jpeg";
import useUserStore from "../../store/userStore";
import api from "../../api/axiosInstance.js";
import { useNavigate } from "react-router";

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

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`rounded-xl backdrop-blur-xl border p-4 md:p-5 ${
            user?.kyc_status === "approved"
              ? "bg-gradient-to-br from-green-600/10 to-green-600/5 border-green-500/30"
              : user?.kyc_status === "pending"
                ? "bg-gradient-to-br from-yellow-600/10 to-yellow-600/5 border-yellow-500/30"
                : "bg-gradient-to-br from-red-600/10 to-red-600/5 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              user?.kyc_status === "approved" ? "bg-green-500/20" : user?.kyc_status === "pending" ? "bg-yellow-500/20" : "bg-red-500/20"
            }`}>
              <Check className={`w-5 h-5 ${
                user?.kyc_status === "approved" ? "text-green-400" : user?.kyc_status === "pending" ? "text-yellow-400" : "text-red-400"
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{t('profile.accountStatus')}</h3>
              <p className={`text-xs ${
                user?.kyc_status === "approved" ? "text-green-400" : user?.kyc_status === "pending" ? "text-yellow-400" : "text-red-400"
              }`}>
                {user?.kyc_status === "approved" ? t('profile.status_active') : user?.kyc_status === "pending" ? t('profile.status_pending') : t('profile.status_unverified')}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            {user?.kyc_status === "approved"
              ? t('profile.desc_active')
              : user?.kyc_status === "pending"
                ? t('profile.desc_pending')
                : t('profile.desc_unverified')}
          </p>
          {user?.kyc_status === "rejected" && user?.kyc_note && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-xs font-semibold text-red-300 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-200">{user.kyc_note}</p>
            </div>
          )}
        </motion.div>

        {/* Member Since */}
        {/* <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.2 }}
                 className="rounded-xl bg-gradient-to-br from-blue-600/10 to-cyan-600/5 backdrop-blur-xl border border-blue-500/30 p-4 md:p-5"
               >
                 <div className="flex items-center gap-3 mb-3">
                   <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                     <Award className="w-5 h-5 text-blue-400" />
                   </div>
                   <div>
                     <h3 className="font-semibold text-white">Member Since</h3>
                     <p className="text-xs text-gray-400">Join Date</p>
                   </div>
                 </div>
                 <p className="text-sm text-gray-400">You joined Oxford Financial Ads on <span className="text-white font-semibold">December 1, 2024</span></p>
               </motion.div> */}
      </div>
    </div>
  );
};

export default ProfilePage;
