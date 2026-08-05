import { useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Camera,
  Mail,
  Pickaxe,
  Award,
  Users,
  Settings,
  Clock,
  CalendarDays,
  IdCard,
  ShieldCheck,
  MapPin,
  Quote,
  Check,
  X,
} from "lucide-react";
import VerifiedBadge from "../common/VerifiedBadge";
import useUserStore from "../../store/userStore";
import api from "../../api/axiosInstance.js";
import profileBg from "../../assets/profile-bg.jpeg";
import profilePlaceholder from "../../assets/banner.jpeg";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getTimeAgo(dateStr, t) {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return t("profileCard.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("profileCard.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("profileCard.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("profileCard.daysAgo", { count: days });
  return t("profileCard.monthsAgo", { count: Math.floor(days / 30) });
}

function formatJoinDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function getInitialsGradient(name) {
  if (!name) return "from-blue-600 to-cyan-500";
  const gradients = [
    "from-blue-600 to-cyan-500",
    "from-purple-600 to-pink-500",
    "from-emerald-600 to-teal-500",
    "from-orange-600 to-rose-500",
    "from-indigo-600 to-violet-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export default function ProfileCard({ setActivePage }) {
  const { t } = useTranslation();
  const { user, setUser } = useUserStore();
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoMode, setPhotoMode] = useState("url");
  const displayUrl = user?.profile_image_url;
  const [photoLoaded, setPhotoLoaded] = useState(!!displayUrl);
  const initials = getInitials(user?.full_name);
  const showInitials = !displayUrl || !photoLoaded;
  const joinDate = formatJoinDate(user?.created_at);
  const lastLogin = getTimeAgo(user?.updated_at, t);
  const userId = user?.user_no || null;
  const memberId = user?.member_id || userId;
  const kycRaw = user?.kyc_status;
  const getKycStatus = () => {
    if (kycRaw === "approved") return t("profileCard.verified");
    if (kycRaw === "rejected") return t("profileCard.rejected");
    if (kycRaw === "pending") return t("profileCard.pendingVerification");
    return t("profileCard.notVerified");
  };
  const kycStatus = getKycStatus();
  const position = t("profileCard.member");

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
        if (!fetchRes.ok) throw new Error(res.data.detail || t("profileCard.uploadFailed"));
        setPhotoMsg(t("profileCard.profileImageUploaded"));
      } else if (!photoUrl.trim()) {
        setPhotoLoading(false);
        return;
      } else {
        res = await api.post("v1/user/profile-image", { profile_image_url: photoUrl.trim() }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPhotoMsg(t("profileCard.photoSaved"));
      }
      setUser({ profile_image_url: res.data.profile_image_url });
      setPhotoLoaded(true);
      setShowPhotoInput(false);
      setPhotoUrl("");
      setPhotoFile(null);
      setPhotoLoading(false);
      return;
    } catch (err) {
      setPhotoMsg(err.response?.data?.detail || err.message || t("profileCard.failedSavePhoto"));
    } finally {
      setPhotoLoading(false);
    }
  };

  const hasKYC = user?.kyc_status === "approved";
  const kycBadgeColor = kycRaw === "approved" ? "text-emerald-400" : kycRaw === "pending" ? "text-yellow-400" : "text-red-400";
  const kycBadgeBg = kycRaw === "approved" ? "bg-emerald-500/10 border-emerald-500/30" : kycRaw === "pending" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-red-500/10 border-red-500/30";
  const badges = [];
  if (user?.email_verified) {
    badges.push({ label: t("profileCard.emailVerified"), icon: Mail, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" });
  }
  if (hasKYC) {
    badges.push({ label: t("profileCard.kycVerified"), icon: "verified", color: kycBadgeColor, bg: kycBadgeBg });
  }
  if (user?.is_mining) {
    badges.push({ label: t("profileCard.miningActive"), icon: Pickaxe, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" });
  }

  const completionItems = [
    { label: t("profileCard.completionEmail"), done: !!user?.email_verified },
    { label: t("profileCard.completionKyc"), done: hasKYC },
    { label: t("profileCard.completionPhone"), done: !!user?.phone_number },
    { label: t("profileCard.completionCountry"), done: !!user?.country },
    { label: t("profileCard.completionReferral"), done: !!user?.referral_code },
    { label: t("profileCard.completionProfileId"), done: !!user?.id },
  ];
  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPercent = Math.round((completedCount / completionItems.length) * 100);

  const gradient = getInitialsGradient(user?.full_name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 overflow-hidden relative"
      style={{ backgroundImage: `url(${profileBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
      <div className="p-5 md:p-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <div className="flex items-center gap-4 md:flex-col md:items-center">
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden relative"
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
                    onError={(e) => { e.target.style.display = "none"; setPhotoLoaded(false); }}
                  />
                ) : null}
                <span className={`text-2xl md:text-3xl font-bold text-white ${showInitials ? "" : "hidden"}`}>
                  {initials}
                </span>
              </div>
              {hasKYC && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-[#0a0e27] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <VerifiedBadge size="sm" />
                </div>
              )}
            </div>
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:hidden">
                {badges.slice(0, 2).map((b) => (
                  <span key={b.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${b.bg} ${b.color} text-[10px] font-medium`}>
                    {b.icon === "verified" ? (
                      <VerifiedBadge size="xs" />
                    ) : b.icon ? (
                      <b.icon className="w-3 h-3" />
                    ) : null}
                    {b.label}
                  </span>
                ))}
                {badges.length > 2 && (
                  <span className="text-[10px] text-gray-400">+{badges.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {showPhotoInput && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 mb-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setPhotoMode("url")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "url" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}
                >
                  {t("profileCard.url")}
                </button>
                <button
                  onClick={() => setPhotoMode("file")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "file" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}
                >
                  {t("profileCard.upload")}
                </button>
              </div>
              {photoMode === "url" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder={t("profileCard.urlPlaceholder")}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    onClick={handleSavePhoto}
                    disabled={photoLoading || !photoUrl.trim()}
                    className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {photoLoading ? <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                    className="flex-1 text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
                  />
                  <button
                    onClick={handleSavePhoto}
                    disabled={photoLoading || !photoFile}
                    className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {photoLoading ? <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                </div>
              )}
              <button
                onClick={() => { setShowPhotoInput(false); setPhotoMsg(""); }}
                className="mt-2 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
              {photoMsg && (
                <p className={`mt-1 text-xs ${photoMsg === t("profileCard.photoSaved") || photoMsg === t("profileCard.profileImageUploaded") ? "text-green-400" : "text-red-400"}`}>
                  {photoMsg}
                </p>
              )}
            </motion.div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-white truncate">
                  {user?.full_name || t("profileCard.user")}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-400">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    kycRaw === "approved"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : kycRaw === "pending"
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      : kycRaw === "rejected"
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                  }`}>
                    {kycStatus}
                  </span>
                  {userId && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <IdCard className="w-3 h-3" />
                      {userId}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                  {joinDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {t("profileCard.joined")} {joinDate}
                    </span>
                  )}
                  {lastLogin && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lastLogin}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setShowPhotoInput(!showPhotoInput); setPhotoUrl(""); setPhotoMsg(""); setPhotoFile(null); setPhotoMode("url"); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-cyan-500/50 transition-all"
                  title={t("profileCard.setPhoto")}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("profileCard.setPhoto")}</span>
                </button>
                <button
                  onClick={() => setActivePage?.("profile")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-cyan-500/50 transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("profileCard.edit")}</span>
                </button>
              </div>
            </div>

            <div className="hidden md:flex flex-wrap gap-2 mt-3">
              {badges.map((b) => (
                <span key={b.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${b.bg} ${b.color} text-xs font-medium`}>
                  {b.icon === "verified" ? (
                    <VerifiedBadge size="xs" />
                  ) : b.icon ? (
                    <b.icon className="w-3.5 h-3.5" />
                  ) : null}
                  {b.label}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">{t("profileCard.profileCompletion")}</span>
                <span className="text-xs font-semibold text-cyan-400">{completionPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            { icon: Users, label: t("profileCard.referrals"), value: user?.referral_code ? t("profileCard.active") : "0", color: "text-blue-400", bg: "bg-blue-500/10" },
            { icon: Award, label: t("profileCard.badges"), value: `${badges.length}`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</div>
                <div className={`text-sm font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-start gap-2 mb-3">
            <Quote className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-cyan-300/80 italic">
              &ldquo;{t("profileCard.motto")}&rdquo;
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <IdCard className="w-3 h-3 text-cyan-400" />
              <span>{t("profileCard.id")} <span className="text-white/80">{userId || "-"}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <ShieldCheck className={`w-3 h-3 ${kycRaw === "approved" ? "text-emerald-400" : kycRaw === "pending" ? "text-yellow-400" : "text-red-400"}`} />
              <span>{t("profileCard.kyc")} <span className={kycRaw === "approved" ? "text-emerald-400" : kycRaw === "pending" ? "text-yellow-400" : "text-red-400"}>{kycStatus}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Award className="w-3 h-3 text-purple-400" />
              <span>{t("profileCard.memberLabel")} <span className="text-white/80">{memberId || "-"}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span>{t("profileCard.position")} <span className="text-white/80">{position}</span></span>
            </div>
          </div>
          {joinDate && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {t("profileCard.since")} {joinDate}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
