import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { CalendarDays, Crown, Camera, Check, X, CreditCard, Award, IdCard, Clock, XCircle } from "lucide-react"
import profilePlaceholder from "../../assets/banner.jpeg"
import verifiedBadge from "../../assets/verified-badge.jpeg"
import useUserStore from "../../store/userStore"
import { getUserRankInfo } from "../../api/user.api.js"
import api from "../../api/axiosInstance.js"

function getInitials(name) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export default function ProfileIdentityCard() {
  const { t } = useTranslation()
  const { user, setUser } = useUserStore()
  const [currentRank, setCurrentRank] = useState(null)
  const initials = getInitials(user?.full_name)
  const joinDate = formatDate(user?.created_at)
  const userId = user?.user_no || "-"
  const memberId = user?.member_id || userId
  const kycRaw = user?.kyc_status
  const getKycStatus = () => {
    if (kycRaw === "approved") return t("profileCard.verified")
    if (kycRaw === "rejected") return t("profileCard.rejected")
    if (kycRaw === "pending") return t("profileCard.pendingVerification")
    return t("profileCard.notVerified")
  }

  const displayUrl = user?.profile_image_url
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const showInitials = !displayUrl || !photoLoaded

  const [showPhotoInput, setShowPhotoInput] = useState(false)
  const [photoUrl, setPhotoUrl] = useState("")
  const [photoFile, setPhotoFile] = useState(null)
  const [photoMode, setPhotoMode] = useState("url")
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoMsg, setPhotoMsg] = useState("")

  useEffect(() => {
    let cancelled = false
    const fetchRank = async () => {
      try {
        const res = await getUserRankInfo()
        if (!cancelled && res?.data?.current_rank) {
          setCurrentRank(res.data.current_rank)
        }
      } catch {}
    }
    fetchRank()
    return () => { cancelled = true }
  }, [])

  const handleSavePhoto = async () => {
    setPhotoLoading(true)
    setPhotoMsg("")
    try {
      const token = useUserStore.getState().token
      let res
      if (photoMode === "file" && photoFile) {
        const formData = new FormData()
        formData.append("file", photoFile)
        const fetchRes = await fetch("/api/v1/user/profile-image/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        res = { data: await fetchRes.json() }
        if (!fetchRes.ok) throw new Error(res.data.detail || t("profileIdentity.uploadFailed"))
        setPhotoMsg(t("profileIdentity.profileImageUploaded"))
      } else if (!photoUrl.trim()) {
        setPhotoLoading(false)
        return
      } else {
        res = await api.post("v1/user/profile-image", { profile_image_url: photoUrl.trim() }, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setPhotoMsg(t("profileIdentity.photoSaved"))
      }
      setPhotoLoaded(false)
      setUser({ profile_image_url: res.data.profile_image_url })
      setShowPhotoInput(false)
      setPhotoUrl("")
      setPhotoFile(null)
      setPhotoLoading(false)
      return
    } catch (err) {
      setPhotoMsg(err.response?.data?.detail || err.message || t("profileIdentity.failedSavePhoto"))
    } finally {
      setPhotoLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-purple-500/25 shadow-[0_0_30px_-5px_rgba(139,92,246,0.15)]"
      style={{
        backgroundImage: `linear-gradient(rgba(10,14,34,0.65), rgba(10,14,34,0.65)), url(${profilePlaceholder})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#a78bfa" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="1.5" fill="#a78bfa" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx="200" cy="100" r="80" fill="none" stroke="#60a5fa" strokeWidth="0.3" opacity="0.5" />
        <circle cx="200" cy="100" r="50" fill="none" stroke="#a78bfa" strokeWidth="0.3" opacity="0.3" />
      </svg>
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="relative p-5 flex flex-col items-center">
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-600/30 flex items-center justify-center shadow-[0_0_20px_-3px_rgba(139,92,246,0.4)] ring-[2.5px] ring-purple-400/50 overflow-hidden">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={user?.full_name}
                className="w-full h-full object-cover"
                onLoad={() => setPhotoLoaded(true)}
                onError={(e) => { e.target.style.display = "none"; setPhotoLoaded(false) }}
              />
            ) : null}
            <span className={`text-xl font-bold text-white ${showInitials ? "" : "hidden"}`}>{initials}</span>
          </div>
          {kycRaw === "approved" && (
            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.6)]">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
          <button
            type="button"
            onClick={() => { setShowPhotoInput(!showPhotoInput); setPhotoUrl(""); setPhotoMsg(""); setPhotoFile(null); setPhotoMode("url") }}
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Camera className="w-2.5 h-2.5 text-gray-300" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-bold text-white">{user?.full_name || t("profileIdentity.user")}</h2>
          {kycRaw === "approved" && <img src={verifiedBadge} alt={t("profileIdentity.verified")} className="w-5 h-5 md:w-4 md:h-4 object-contain shrink-0 rounded-full bg-white self-center" />}
        </div>
        <p className={`text-xs mb-4 font-medium ${
          kycRaw === "approved"
            ? "text-emerald-400"
            : kycRaw === "pending"
            ? "text-yellow-400"
            : kycRaw === "rejected"
            ? "text-red-400"
            : "text-gray-400"
        }`}>
          {getKycStatus()}
        </p>

        {kycRaw === "rejected" && user?.kyc_note && (
          <div className="w-full mb-4 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[10px] font-semibold text-red-300 mb-0.5">{t("profile.rejectionReason")}</p>
            <p className="text-xs text-red-200/90">{user.kyc_note}</p>
          </div>
        )}

        {kycRaw === "pending" && (
          <div className="w-full mb-4 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] font-semibold text-yellow-400">{getKycStatus()}</span>
          </div>
        )}

        {showPhotoInput && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="w-full mb-4">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setPhotoMode("url")} className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "url" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}>
                {t("profileIdentity.url")}
              </button>
              <button onClick={() => setPhotoMode("file")} className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "file" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}>
                {t("profileIdentity.upload")}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {photoMode === "url" ? (
                <input type="text" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder={t("profileIdentity.urlPlaceholder")} className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50" />
              ) : (
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setPhotoFile(e.target.files[0] || null)} className="flex-1 text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30" />
              )}
              <button onClick={handleSavePhoto} disabled={photoLoading || (photoMode === "url" ? !photoUrl.trim() : !photoFile)} className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-500/30 disabled:opacity-50">
                {photoLoading ? <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 text-cyan-400" />}
              </button>
              <button onClick={() => { setShowPhotoInput(false); setPhotoMsg("") }} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {photoMsg && <p className={`mt-1 text-xs ${photoMsg === t("profileIdentity.photoSaved") || photoMsg === t("profileIdentity.profileImageUploaded") ? "text-green-400" : "text-red-400"}`}>{photoMsg}</p>}
          </motion.div>
        )}

        <div className="w-full grid grid-cols-2 gap-2.5">
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <IdCard className="w-3.5 h-3.5 text-cyan-400" />
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.userID")}</p>
            </div>
            <p className="text-sm font-bold text-cyan-400 truncate">#{userId}</p>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Crown className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.memberId")}</p>
            </div>
            <p className="text-sm font-bold text-purple-400 truncate">{memberId}</p>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.position")}</p>
            </div>
            <p className="text-sm font-bold text-white truncate">{user?.kyc_status === "approved" ? (currentRank?.name || t("profileCard.member")) : t("profileCard.member")}</p>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.since")}</p>
            </div>
            <p className="text-sm font-bold text-white">{joinDate || "-"}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
