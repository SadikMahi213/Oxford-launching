import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Fingerprint, Crown, Award, Calendar, Camera, Check, X } from "lucide-react";
import VerifiedBadge from "../common/VerifiedBadge";
import profilePlaceholder from "../../assets/banner.jpeg";
import useUserStore from "../../store/userStore";
import { getUserRankInfo } from "../../api/user.api";
import api from "../../api/axiosInstance";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function CyberProfileCard() {
  const { user, setUser } = useUserStore();
  const [currentRank, setCurrentRank] = useState(null);
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoMode, setPhotoMode] = useState("url");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");

  const initials = getInitials(user?.full_name);
  const joinDate = formatDate(user?.created_at);
  const userId = user?.user_no || "-";
  const memberId = user?.member_id || userId;
  const displayUrl = user?.profile_image_url;
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const showInitials = !displayUrl || !photoLoaded;
  const kycRaw = user?.kyc_status;
  const hasKYC = kycRaw === "approved";

  useEffect(() => {
    let cancelled = false;
    const fetchRank = async () => {
      try {
        const res = await getUserRankInfo();
        if (!cancelled && res?.data?.current_rank) {
          setCurrentRank(res.data.current_rank);
        }
      } catch {}
    };
    fetchRank();
    return () => { cancelled = true; };
  }, []);

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
        if (!fetchRes.ok) throw new Error(res.data.detail || "Upload failed");
        setPhotoMsg("Profile image uploaded");
      } else if (!photoUrl.trim()) {
        setPhotoLoading(false);
        return;
      } else {
        res = await api.post("v1/user/profile-image", { profile_image_url: photoUrl.trim() }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPhotoMsg("Photo saved");
      }
      setPhotoLoaded(false);
      setUser({ profile_image_url: res.data.profile_image_url });
      setShowPhotoInput(false);
      setPhotoUrl("");
      setPhotoFile(null);
      setPhotoLoading(false);
      return;
    } catch (err) {
      setPhotoMsg(err.response?.data?.detail || err.message || "Failed to save photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Profile Identity Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="relative overflow-hidden flex flex-col items-center py-5 rounded-2xl border border-white/[0.08] shadow-[0_0_40px_rgba(59,130,246,0.08)]"
          style={{
            backgroundImage: `linear-gradient(rgba(10,14,39,0.85), rgba(10,14,39,0.85)), url(${profilePlaceholder})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-gradient-to-br from-cyan-400/25 via-blue-500/15 to-transparent rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-br from-purple-500/25 via-pink-500/10 to-transparent rounded-full blur-[100px]" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[3px] shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${profilePlaceholder})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onLoad={() => setPhotoLoaded(true)}
                    onError={(e) => { e.target.style.display = "none"; setPhotoLoaded(false); }}
                  />
                ) : null}
                <span className={`text-3xl font-bold text-white ${showInitials ? "" : "hidden"}`}>{initials}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setShowPhotoInput(!showPhotoInput); setPhotoUrl(""); setPhotoMsg(""); setPhotoFile(null); setPhotoMode("url"); }}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <Camera className="w-3 h-3 text-gray-300" />
            </button>
            {hasKYC && (
              <div className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-[#0d1137] flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <VerifiedBadge size="xs" />
              </div>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mb-1">{user?.full_name}</h2>
          {hasKYC && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <VerifiedBadge size="xs" />
              <span className="text-xs font-medium text-emerald-300">Verified</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Photo Input */}
      {showPhotoInput && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="px-4">
          <div className="p-4 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setPhotoMode("url")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${photoMode === "url" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}>
                URL
              </button>
              <button onClick={() => setPhotoMode("file")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${photoMode === "file" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}>
                Upload
              </button>
            </div>
            <div className="flex items-center gap-2">
              {photoMode === "url" ? (
                <input type="text" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Image URL..." className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50" />
              ) : (
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setPhotoFile(e.target.files[0] || null)} className="flex-1 text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30" />
              )}
              <button onClick={handleSavePhoto} disabled={photoLoading || (photoMode === "url" ? !photoUrl.trim() : !photoFile)} className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-500/30 disabled:opacity-50">
                {photoLoading ? <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 text-cyan-400" />}
              </button>
              <button onClick={() => { setShowPhotoInput(false); setPhotoMsg(""); }} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {photoMsg && <p className={`mt-2 text-xs ${photoMsg === "Profile image uploaded" || photoMsg === "Photo saved" ? "text-green-400" : "text-red-400"}`}>{photoMsg}</p>}
          </div>
        </motion.div>
      )}

      {/* User Info 2x2 Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(59,130,246,0.03)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">USER ID</span>
            </div>
            <p className="text-sm font-bold text-cyan-400 font-mono">#{userId}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:border-purple-500/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.03)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">MEMBER ID</span>
            </div>
            <p className="text-sm font-bold text-purple-400 font-mono">{memberId}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:border-amber-500/30 transition-all shadow-[0_0_15px_rgba(251,191,36,0.03)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/20 flex items-center justify-center">
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">POSITION</span>
            </div>
            <p className="text-sm font-bold text-amber-300">{currentRank?.name || "Member"}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(34,211,238,0.03)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">SINCE</span>
            </div>
            <p className="text-sm font-bold text-cyan-300">{joinDate}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
