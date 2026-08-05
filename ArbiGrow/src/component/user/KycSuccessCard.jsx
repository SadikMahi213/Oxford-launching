import { motion } from "motion/react"
import { ShieldCheck, Crown, Star } from "lucide-react"
import { useTranslation } from "react-i18next"

function PadlockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 sm:w-[17px] h-3.5 sm:h-[17px]" fill="#a855f7">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 sm:w-[17px] h-3.5 sm:h-[17px]" fill="#38bdf8">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
  )
}

function DiamondIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 sm:w-[17px] h-3.5 sm:h-[17px]" fill="#a855f7">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 sm:w-[22px] h-4 sm:h-[22px]" fill="#00e1ff">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>
  )
}

export default function KycSuccessCard({ user }) {
  const { t } = useTranslation()
  const userName = user?.full_name || user?.name || t("kycSuccess.userFallback")

  return (
    <div className="relative w-full max-w-[410px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative p-4 sm:p-6 rounded-[32px] border border-[rgba(0,162,255,0.35)] shadow-[0_0_50px_rgba(0,110,255,0.25),inset_0_0_20px_rgba(112,0,255,0.15)] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #070921, #020308)" }}
      >
        {/* Ambient glow */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(217,0,255,0.4) 0%, rgba(0,149,255,0.25) 50%, transparent 75%)" }} />

        <div className="relative z-10">
          {/* ===== Avatar + Verified Badge ===== */}
          <div className="relative flex justify-center items-center mb-3 sm:mb-[18px] mt-1 sm:mt-[5px]">
            {/* Neon ring */}
            <div className="w-[120px] h-[120px] sm:w-[165px] sm:h-[165px] rounded-full p-[3px] shadow-[0_0_30px_rgba(217,0,255,0.5),inset_0_0_15px_rgba(0,136,255,0.5)]" style={{ background: "linear-gradient(135deg, #e000ff, #0088ff)" }}>
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0b112c]">
                {user?.profile_image_url ? (
                  <img src={user.profile_image_url} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400/30 to-purple-500/30">
                    <span className="text-2xl sm:text-3xl font-bold text-blue-300">{userName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Verified Member Badge top-right */}
            <div className="absolute top-0 right-0 flex flex-col items-center px-3 py-1.5 rounded-full border border-[#00e1ff] shadow-[0_0_15px_rgba(0,225,255,0.4)]" style={{ background: "rgba(10,18,48,0.85)" }}>
              <span className="text-sm font-bold text-[#00e1ff]">✓</span>
              <span className="text-[8.5px] font-extrabold text-[#00e1ff] tracking-widest">{t("kycSuccess.verifiedMember")}</span>
            </div>
          </div>

          {/* ===== Congratulatory Section ===== */}
          <div className="text-center mb-3 sm:mb-[18px]">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-[22px] sm:text-[26px] font-extrabold text-[#ffd700] mb-[2px]" style={{ textShadow: "0 0 12px rgba(255,215,0,0.5)" }}
            >
              {t("kycSuccess.congratulations")}
            </motion.h1>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-base sm:text-[20px] font-bold text-white my-[2px] sm:my-[3px] tracking-[0.4px]"
            >
              {userName}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-[13px] sm:text-[15px] font-medium text-[#e2e8f0] mb-1 sm:mb-2"
            >
              {t("kycSuccess.officiallyVerified")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="text-sm sm:text-[16px] tracking-[4px] text-[#ffd700]" style={{ textShadow: "0 0 8px rgba(255,215,0,0.7)" }}
            >
              ★ ★ ★
            </motion.div>
          </div>

          {/* ===== KYC Status Notification ===== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-3 sm:gap-[14px] p-3 sm:p-[14px_16px] mb-2 sm:mb-3 rounded-2xl border border-[rgba(0,149,255,0.3)] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]" style={{ background: "rgba(13,23,53,0.5)", backdropFilter: "blur(14px)" }}
          >
            <div className="w-8 sm:w-[42px] h-8 sm:h-[42px] rounded-xl border border-[#0088ff] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,136,255,0.4)]" style={{ background: "rgba(0,123,255,0.2)" }}>
              <ShieldCheckIcon />
            </div>
            <p className="text-xs sm:text-[13px] text-[#f1f5f9] leading-snug sm:leading-relaxed" dangerouslySetInnerHTML={{ __html: t("kycSuccess.kycApproved", { fee: "10" }) }} />
          </motion.div>

          {/* ===== Three Trust Cards ===== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="grid grid-cols-3 gap-1.5 sm:gap-[10px] mb-2 sm:mb-3"
          >
            {[
              { icon: <PadlockIcon />, color: "rgba(139,92,246,0.4)", title: t("kycSuccess.trusted"), desc: t("kycSuccess.trustedDesc") },
              { icon: <ShieldIcon />, color: "rgba(56,189,248,0.4)", title: t("kycSuccess.secure"), desc: t("kycSuccess.secureDesc") },
              { icon: <DiamondIcon />, color: "rgba(139,92,246,0.4)", title: t("kycSuccess.exclusive"), desc: t("kycSuccess.exclusiveDesc") },
            ].map((card) => (
              <div key={card.title} className="p-2 sm:p-3 rounded-xl text-center flex flex-col items-center border" style={{ background: "rgba(13,23,53,0.4)", backdropFilter: "blur(10px)", borderColor: card.color }}>
                <div className="w-6 sm:w-[34px] h-6 sm:h-[34px] rounded-xl flex items-center justify-center mb-1 sm:mb-[6px]" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
                  {card.icon}
                </div>
                <h4 className="text-[10px] sm:text-[11.5px] font-semibold text-[#38bdf8] mb-[2px] sm:mb-[3px]">{card.title}</h4>
                <p className="text-[8px] sm:text-[9px] text-[#94a3b8] leading-tight">{card.desc}</p>
              </div>
            ))}
          </motion.div>

          {/* ===== Club Banner ===== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex items-center gap-3 sm:gap-[14px] p-3 sm:p-[14px_16px] mb-2 sm:mb-[14px] rounded-2xl border border-[rgba(255,215,0,0.35)] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]" style={{ background: "linear-gradient(135deg, rgba(13,23,53,0.75), rgba(30,20,70,0.65))", backdropFilter: "blur(14px)" }}
          >
            <span className="text-xl sm:text-[26px] shrink-0" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.6))" }}>👑</span>
            <div>
              <h3 className="text-xs sm:text-[13.5px] font-bold text-[#ffd700] mb-[2px]">{t("kycSuccess.clubWelcome")}</h3>
              <p className="text-[9px] sm:text-[10px] text-[#cbd5e1]">{t("kycSuccess.clubThanks")}</p>
            </div>
          </motion.div>

          {/* ===== Bottom Security Note ===== */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="text-center text-[10px] text-[#64748b] tracking-[0.2px]"
          >
            🔒 {t("kycSuccess.securityNote")}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
