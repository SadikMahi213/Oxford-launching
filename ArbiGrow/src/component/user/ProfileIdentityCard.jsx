import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { BadgeCheck, IdCard, ShieldCheck, CalendarDays, Crown, Camera, Check, X } from "lucide-react"
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
}

export default function ProfileIdentityCard() {
  const { user, setUser } = useUserStore()
  const [currentRank, setCurrentRank] = useState(null)
  const initials = getInitials(user?.full_name)
  const joinDate = formatDate(user?.created_at)
  const userId = user?.id ? `financial@${user.id}` : "-"
  const memberId = user?.referral_code ? `#MEM-${user.referral_code}` : userId
  const kycRaw = user?.kyc_status
  const hasKYC = kycRaw === "approved"
  const getKycStatus = () => {
    if (kycRaw === "approved") return "Verified"
    if (kycRaw === "rejected") return "Rejected"
    if (kycRaw === "pending") return "Pending Verification"
    return "Not Verified"
  }
  const kycStatus = getKycStatus()

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
      } catch {
        // rank fetch is non-critical
      }
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
        if (!fetchRes.ok) throw new Error(res.data.detail || "Upload failed")
        setPhotoMsg("Profile image uploaded")
      } else if (!photoUrl.trim()) {
        setPhotoLoading(false)
        return
      } else {
        res = await api.post("v1/user/profile-image", { profile_image_url: photoUrl.trim() }, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setPhotoMsg("Photo saved")
      }
      setPhotoLoaded(false)
      setUser({ profile_image_url: res.data.profile_image_url })
      setShowPhotoInput(false)
      setPhotoUrl("")
      setPhotoFile(null)
      setPhotoLoading(false)
      return
    } catch (err) {
      setPhotoMsg(err.response?.data?.detail || err.message || "Failed to save photo")
    } finally {
      setPhotoLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
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
                <button
                  onClick={() => { setShowPhotoInput(!showPhotoInput); setPhotoUrl(""); setPhotoMsg(""); setPhotoFile(null); setPhotoMode("url") }}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cyan-500 border-2 border-black/60 flex items-center justify-center hover:bg-cyan-400 transition-colors"
                  title="Set profile photo"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <div className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-black/60 flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold text-white truncate font-['Inter']">
                      {user?.full_name || "User"}
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      @{user?.username || "username"}
                    </p>
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
                        URL
                      </button>
                      <button
                        onClick={() => setPhotoMode("file")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "file" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}
                      >
                        Upload
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {photoMode === "url" ? (
                        <input
                          type="text"
                          value={photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          placeholder="Paste image URL..."
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
                      <p className={`mt-1 text-xs ${photoMsg === "Photo saved" || photoMsg === "Profile image uploaded" ? "text-green-400" : "text-red-400"}`}>
                        {photoMsg}
                      </p>
                    )}
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                  <InfoBox label="User ID" value={userId} icon={IdCard} accent="bg-cyan-500/15 text-cyan-400" />
                  <InfoBox
                    label="KYC Status"
                    value={kycStatus}
                    icon={ShieldCheck}
                    accent={kycRaw === "approved" ? "bg-emerald-500/15 text-emerald-400" : kycRaw === "pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}
                  />
                </div>

                <div className="mt-2.5">
                  <InfoBox label="Member ID" value={memberId} icon={Crown} accent="bg-purple-500/15 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Crown className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Position</p>
                  <p className="text-sm font-semibold text-white">{currentRank?.name || "Member"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <CalendarDays className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Since</p>
                  <p className="text-sm font-semibold text-white">{joinDate || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
