import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
<<<<<<< HEAD
import { CalendarDays, Crown, Camera, Check, X, CreditCard, Award, IdCard, Clock, XCircle } from "lucide-react"
import profilePlaceholder from "../../assets/banner.jpeg"
import verifiedBadge from "../../assets/verified-badge.jpeg"
=======
import { BadgeCheck, IdCard, ShieldCheck, CalendarDays, Crown, Camera, Check, X } from "lucide-react"
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
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
<<<<<<< HEAD
  return `${day}/${month}/${year}`
=======
  return `${day}-${month}-${year}`
}

function InfoBox({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-md">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value || "-"}</p>
      </div>
    </div>
  )
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
}

export default function ProfileIdentityCard() {
  const { t } = useTranslation()
  const { user, setUser } = useUserStore()
  const [currentRank, setCurrentRank] = useState(null)
  const initials = getInitials(user?.full_name)
  const joinDate = formatDate(user?.created_at)
  const userId = user?.user_no || "-"
<<<<<<< HEAD
  const memberId = user?.member_id || userId
  const kycRaw = user?.kyc_status
=======
  const memberId = user?.referral_code ? `#MEM-${user.referral_code}` : userId
  const kycRaw = user?.kyc_status
  const hasKYC = kycRaw === "approved"
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
  const getKycStatus = () => {
    if (kycRaw === "approved") return t("profileCard.verified")
    if (kycRaw === "rejected") return t("profileCard.rejected")
    if (kycRaw === "pending") return t("profileCard.pendingVerification")
    return t("profileCard.notVerified")
  }
<<<<<<< HEAD
=======
  const kycStatus = getKycStatus()
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0

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
<<<<<<< HEAD
      } catch {}
=======
      } catch {
        // rank fetch is non-critical
      }
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
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
<<<<<<< HEAD
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
            <p className="text-sm font-bold text-cyan-400 break-words md:truncate">#{userId}</p>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Crown className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.memberId")}</p>
            </div>
            <p className="text-sm font-bold text-purple-400 break-words md:truncate">{memberId}</p>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.position")}</p>
            </div>
            <p className="text-sm font-bold text-white break-words md:truncate">{user?.kyc_status === "approved" ? (currentRank?.name || t("profileCard.member")) : t("profileCard.member")}</p>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.since")}</p>
            </div>
            <p className="text-sm font-bold text-white">{joinDate || "-"}</p>
=======
      className="relative rounded-2xl overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80)" }}
      />

      <div className="relative p-[2px] rounded-2xl bg-gradient-to-br from-cyan-400/30 via-transparent to-cyan-400/10">
        <div className="relative rounded-2xl bg-black/10 backdrop-blur-md border border-white/[0.08] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />

          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

          <div className="relative p-5 md:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/30 overflow-hidden">
                  {displayUrl ? (
                    <img
                      src={displayUrl}
                      alt={user?.full_name}
                      className="w-full h-full object-cover"
                      onLoad={() => setPhotoLoaded(true)}
                      onError={(e) => { e.target.style.display = "none"; setPhotoLoaded(false) }}
                    />
                  ) : null}
                  <span className={`text-3xl md:text-4xl font-bold text-white ${showInitials ? "" : "hidden"}`}>
                    {initials}
                  </span>
                </div>
                {hasKYC && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-2 border-black/60 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <BadgeCheck className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold text-white truncate font-['Inter']">
                      {user?.full_name || t("profileIdentity.user")}
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      @{user?.username || "username"}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowPhotoInput(!showPhotoInput); setPhotoUrl(""); setPhotoMsg(""); setPhotoFile(null); setPhotoMode("url") }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-cyan-500/50 transition-all flex-shrink-0"
                    title={t("profileIdentity.setPhoto")}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("profileIdentity.setPhoto")}</span>
                  </button>
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
                        {t("profileIdentity.url")}
                      </button>
                      <button
                        onClick={() => setPhotoMode("file")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "file" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}
                      >
                        {t("profileIdentity.upload")}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {photoMode === "url" ? (
                        <input
                          type="text"
                          value={photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          placeholder={t("profileIdentity.urlPlaceholder")}
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
                      <p className={`mt-1 text-xs ${photoMsg === t("profileIdentity.photoSaved") || photoMsg === t("profileIdentity.profileImageUploaded") ? "text-green-400" : "text-red-400"}`}>
                        {photoMsg}
                      </p>
                    )}
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                  <InfoBox label={t("profileIdentity.userID")} value={userId} icon={IdCard} accent="bg-cyan-500/15 text-cyan-400" />
                  <InfoBox
                    label={t("profileIdentity.kycStatus")}
                    value={kycStatus}
                    icon={ShieldCheck}
                    accent={kycRaw === "approved" ? "bg-emerald-500/15 text-emerald-400" : kycRaw === "pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}
                  />
                </div>

                <div className="mt-2.5">
                  <InfoBox label={t("profileIdentity.memberId")} value={memberId} icon={Crown} accent="bg-purple-500/15 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Crown className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.position")}</p>
                  <p className="text-sm font-semibold text-white">{currentRank?.name || t("profileCard.member")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <CalendarDays className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t("profileIdentity.since")}</p>
                  <p className="text-sm font-semibold text-white">{joinDate || "-"}</p>
                </div>
              </div>
            </div>
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
          </div>
        </div>
      </div>
    </motion.div>
  )
}
