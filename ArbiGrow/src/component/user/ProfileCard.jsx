import { useState } from "react";
import { motion } from "motion/react";
import {
  Camera,
  Mail,
  Pickaxe,
  Award,
  Users,
  Settings,
  BadgeCheck,
  Clock,
  CalendarDays,
  IdCard,
  Check,
  X,
} from "lucide-react";
import useUserStore from "../../store/userStore";
import api from "../../api/axiosInstance.js";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getTimeAgo(dateStr) {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatJoinDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
  const { user, setUser } = useUserStore();
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const displayUrl = user?.profile_image_url;
  const initials = getInitials(user?.full_name);
  const joinDate = formatJoinDate(user?.created_at);
  const lastLogin = getTimeAgo(user?.updated_at);
  const userId = user?.id ? `OFA-${String(user.id).padStart(5, "0")}` : null;

  const handleSavePhoto = async () => {
    if (!photoUrl.trim()) return;
    setPhotoLoading(true);
    setPhotoMsg("");
    try {
      const token = useUserStore.getState().token;
      const res = await api.post("v1/user/profile-image", { profile_image_url: photoUrl.trim() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ profile_image_url: res.data.profile_image_url });
      setPhotoMsg("Photo saved");
      setShowPhotoInput(false);
      setPhotoUrl("");
      setPhotoLoading(false);
      return;
    } catch (err) {
      setPhotoMsg(err.response?.data?.detail || "Failed to save photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const hasKYC = !!(user?.phone_number && user?.country);
  const badges = [];
  if (user?.email_verified) {
    badges.push({ label: "Email Verified", icon: Mail, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" });
  }
  if (hasKYC) {
    badges.push({ label: "KYC Verified", icon: BadgeCheck, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" });
  }
  if (user?.is_mining) {
    badges.push({ label: "Mining Active", icon: Pickaxe, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" });
  }

  const completionItems = [
    { label: "Email Verified", done: !!user?.email_verified },
    { label: "KYC Submitted", done: hasKYC },
    { label: "Phone Added", done: !!user?.phone_number },
    { label: "Country Added", done: !!user?.country },
    { label: "Referral Code", done: !!user?.referral_code },
    { label: "Profile ID", done: !!user?.id },
  ];
  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPercent = Math.round((completedCount / completionItems.length) * 100);

  const gradient = getInitialsGradient(user?.full_name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
    >
      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <div className="flex items-center gap-4 md:flex-col md:items-center">
            <div className="relative flex-shrink-0">
              <div
                className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden relative`}
              >
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; const s = e.target.nextSibling; if (s) s.style.display = "flex"; }}
                  />
                ) : null}
                <span className={`text-2xl md:text-3xl font-bold text-white ${displayUrl ? "hidden" : ""}`}>
                  {initials}
                </span>
              </div>
              <button
                onClick={() => { setShowPhotoInput(!showPhotoInput); setPhotoUrl(""); setPhotoMsg(""); }}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-500 border-2 border-[#0a0e27] flex items-center justify-center hover:bg-cyan-400 transition-colors"
                title="Set profile photo"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:hidden">
                {badges.slice(0, 2).map((b) => (
                  <span key={b.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${b.bg} ${b.color} text-[10px] font-medium`}>
                    <b.icon className="w-3 h-3" />
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={handleSavePhoto}
                  disabled={photoLoading || !photoUrl.trim()}
                  className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-500/30 disabled:opacity-50"
                >
                  {photoLoading ? <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 text-cyan-400" />}
                </button>
                <button
                  onClick={() => { setShowPhotoInput(false); setPhotoMsg(""); }}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {photoMsg && (
                <p className={`mt-1 text-xs ${photoMsg === "Photo saved" ? "text-green-400" : "text-red-400"}`}>
                  {photoMsg}
                </p>
              )}
            </motion.div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-white truncate">
                  {user?.full_name || "User"}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-400">
                  {user?.username && (
                    <span className="flex items-center gap-1">
                      <span>@{user.username}</span>
                    </span>
                  )}
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
                      Joined {joinDate}
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
                  onClick={() => setActivePage?.("profile")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-cyan-500/50 transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>
            </div>

            <div className="hidden md:flex flex-wrap gap-2 mt-3">
              {badges.map((b) => (
                <span key={b.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${b.bg} ${b.color} text-xs font-medium`}>
                  <b.icon className="w-3.5 h-3.5" />
                  {b.label}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">Profile Completion</span>
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
            { icon: Users, label: "Referrals", value: user?.referral_code ? "Active" : "0", color: "text-blue-400", bg: "bg-blue-500/10" },
            { icon: Award, label: "Badges", value: `${badges.length}`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
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
      </div>
    </motion.div>
  );
}
