import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import {
  Package, TrendingUp, Users, User, Headset, ShoppingCart, Store,
  Send, ArrowLeftRight, ShieldCheck, Trophy,
  Activity, Download, Upload,
} from "lucide-react"

const items = [
  [
    { id: "deposit", label: "Deposit", icon: Download, color: "text-cyan-400", border: "border-cyan-500/30", page: "deposit" },
    { id: "withdraw", label: "Withdraw", icon: Upload, color: "text-purple-400", border: "border-purple-500/30", page: "withdraw" },
    { id: "transfer", label: "Transfer", icon: ArrowLeftRight, color: "text-blue-400", border: "border-blue-500/30", page: "transfer" },

  ],
  [
    { id: "packages", label: "Packages", icon: Package, color: "text-blue-400", border: "border-blue-500/30", page: "packages" },
    { id: "investments", label: "My Investments", icon: TrendingUp, color: "text-green-400", border: "border-green-500/30", page: "investments" },
    { id: "market", label: "Market", icon: Activity, color: "text-purple-400", border: "border-purple-500/30", page: "market" },
    { id: "referral", label: "Referral", icon: Users, color: "text-amber-400", border: "border-amber-500/30", page: "referral" },
  ],
  [
    { id: "profile", label: "Profile", icon: User, color: "text-blue-400", border: "border-blue-500/30", page: "profile" },
    { id: "support", label: "Support", icon: Headset, color: "text-rose-400", border: "border-rose-500/30", page: "support", external: "https://t.me/+aIajLcllDPBlOTE0" },
    { id: "marketplace", label: "Marketplace", icon: ShoppingCart, color: "text-green-400", border: "border-green-500/30", page: "marketplace" },
    { id: "seller", label: "Seller", icon: Store, color: "text-orange-400", border: "border-orange-500/30", page: "seller" },
  ],
  [
    { id: "send-funds", label: "Send Funds", icon: Send, color: "text-blue-400", border: "border-blue-500/30", page: "send-funds" },
  ],
  [
    { id: "kyc", label: "KYC", icon: ShieldCheck, color: "text-green-400", border: "border-green-500/30", page: "kyc" },
    { id: "matching-bonus", label: "Matching Bonus", icon: Trophy, color: "text-yellow-400", border: "border-yellow-500/30", page: "matching-bonus" },

  ],
]

export function QuickShortcuts({ setActivePage }) {
  const { t } = useTranslation()

  const handleClick = (item) => {
    if (item.soon) return
    if (item.external) { window.open(item.external, "_blank"); return }
    if (item.page) setActivePage(item.page)
  }

  return (
    <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.06] p-3">
      <div className="grid grid-cols-4 gap-1.5">
        {items.flat().map((item, idx) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.025 }}
            onClick={() => handleClick(item)}
            disabled={item.soon}
            className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all active:scale-95 ${
              item.soon
                ? "opacity-40 cursor-not-allowed border border-white/[0.06]"
                : "bg-white/[0.04] hover:bg-white/[0.08] border hover:brightness-110 " + (item.border || "border-white/[0.06]")
            }`}
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-[9px] text-gray-400 font-medium leading-tight text-center">{item.label}</span>
            {item.soon && (
              <span className="text-[7px] px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 absolute -top-1 -right-1">
                Soon
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
