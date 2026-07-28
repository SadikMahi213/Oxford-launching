import { motion } from "motion/react"
import { ShieldCheck, Crown, Star, Lock, BadgeCheck, Shield, Gem } from "lucide-react"

const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 3,
  duration: 2 + Math.random() * 3,
  size: 4 + Math.random() * 6,
  color: ["#fbbf24", "#f59e0b", "#eab308", "#fef08a", "#fde047"][Math.floor(Math.random() * 5)],
}))

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {confettiPieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.6, backgroundColor: p.color }}
          initial={{ y: -20, rotate: 0, opacity: 0 }}
          animate={{ y: "100vh", rotate: 720, opacity: [0, 1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  )
}

export default function KycSuccessCard({ user }) {
  const userName = user?.full_name || user?.name || "User"

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Background ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-20 w-[300px] h-[300px] bg-purple-500/8 rounded-full blur-[80px]" />
      </div>

      <Confetti />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative p-6 md:p-10 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/[0.08] overflow-hidden"
      >
        <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/15 to-pink-500/15 rounded-3xl blur-xl opacity-50" />

        {/* ===== Avatar Section ===== */}
        <div className="relative text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 120 }}
            className="relative inline-flex mx-auto mb-4"
          >
            {/* Neon ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-[3px] animate-pulse">
              <div className="w-full h-full rounded-full bg-[#0a0e27]" />
            </div>
            <div className="absolute -inset-2 rounded-full bg-blue-500/20 blur-xl" />
            <div className="absolute -inset-1 rounded-full bg-purple-500/20 blur-lg" />

            {/* Avatar */}
            <div className="relative w-20 h-20 rounded-full border-2 border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden">
              {user?.profile_image_url ? (
                <img src={user.profile_image_url} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400/30 to-purple-500/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-300">{userName.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Verified Badge top-right */}
            <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center border-2 border-[#0a0e27] shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              <BadgeCheck className="w-4 h-4 text-white" />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] text-cyan-400 font-semibold whitespace-nowrap">VERIFIED</span>
            </div>
          </motion.div>

          {/* ===== Congratulatory Typography ===== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Laurel wreaths + title */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-yellow-500 shrink-0">
                <path d="M12 2C12 2 8 6 8 10C8 13.3 10 16 12 18C14 16 16 13.3 16 10C16 6 12 2 12 2Z" fill="currentColor" opacity="0.6"/>
                <path d="M12 2C12 2 16 6 16 10C16 13.3 14 16 12 18" fill="currentColor" opacity="0.4"/>
                <path d="M8 10C6 9 4 8 2 9C0 10 0 14 2 15C4 16 6 15 8 14" fill="currentColor" opacity="0.5"/>
                <path d="M16 10C18 9 20 8 22 9C24 10 24 14 22 15C20 16 18 15 16 14" fill="currentColor" opacity="0.5"/>
              </svg>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Congratulations!
              </h1>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-yellow-500 shrink-0 scale-x-[-1]">
                <path d="M12 2C12 2 8 6 8 10C8 13.3 10 16 12 18C14 16 16 13.3 16 10C16 6 12 2 12 2Z" fill="currentColor" opacity="0.6"/>
                <path d="M12 2C12 2 16 6 16 10C16 13.3 14 16 12 18" fill="currentColor" opacity="0.4"/>
                <path d="M8 10C6 9 4 8 2 9C0 10 0 14 2 15C4 16 6 15 8 14" fill="currentColor" opacity="0.5"/>
                <path d="M16 10C18 9 20 8 22 9C24 10 24 14 22 15C20 16 18 15 16 14" fill="currentColor" opacity="0.5"/>
              </svg>
            </div>
            <p className="text-lg text-yellow-400 font-semibold">{userName}</p>
            <p className="text-white text-lg font-bold mt-1">You're Officially Verified</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {[0, 1, 2].map((i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
          </motion.div>
        </div>

        {/* ===== KYC Status Notification Card ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="p-4 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-blue-400/30 mb-5 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-sm text-gray-200">
            Your <span className="text-cyan-400 font-bold">$10</span> KYC Verification has been successfully approved.
          </p>
        </motion.div>

        {/* ===== Three Trust Cards ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5"
        >
          {[
            { icon: Lock, color: "text-purple-400", bg: "bg-purple-500/15", title: "Trusted", desc: "Stronger trust for a secure experience" },
            { icon: Shield, color: "text-blue-400", bg: "bg-blue-500/15", title: "Secure", desc: "Your account is now more protected" },
            { icon: Gem, color: "text-purple-400", bg: "bg-purple-500/15", title: "Exclusive", desc: "Access premium features and exclusive benefits" },
          ].map((card) => (
            <div key={card.title} className="p-4 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] text-center">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mx-auto mb-2`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <h4 className="text-sm font-bold text-cyan-300 mb-0.5">{card.title}</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* ===== Verified Members Club Footer ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-blue-900/30 border border-blue-500/30 flex items-center gap-4 mb-5"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-yellow-400">Welcome to the Verified Members Club.</h3>
            <p className="text-xs text-gray-300 mt-0.5">Thank you for being a part of our trusted community.</p>
          </div>
        </motion.div>

        {/* ===== Bottom Footer ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="flex items-center justify-center gap-2 text-xs text-gray-500"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Your security is our priority. Thank you for verifying your account.</span>
        </motion.div>
      </motion.div>
    </div>
  )
}
