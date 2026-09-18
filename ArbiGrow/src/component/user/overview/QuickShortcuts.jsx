import { useState } from "react"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import {
  Package, TrendingUp, Users, User, Headset, ShoppingCart, Store,
  Send, ArrowLeftRight, ShieldCheck, Trophy,
  Activity, Download, Upload, Globe, Repeat, Rocket, X,
} from "lucide-react"

const items = [
  [
    { id: "deposit", labelKey: "overview.shortcuts.deposit", icon: Download, color: "text-cyan-400", border: "border-cyan-500/30", page: "deposit" },
    { id: "withdraw", labelKey: "overview.shortcuts.withdraw", icon: Upload, color: "text-purple-400", border: "border-purple-500/30", page: "withdraw" },
    { id: "transfer", labelKey: "overview.shortcuts.transfers", icon: ArrowLeftRight, color: "text-blue-400", border: "border-blue-500/30", page: "transfer" },

  ],
  [
    { id: "packages", labelKey: "overview.shortcuts.packages", icon: Package, color: "text-blue-400", border: "border-blue-500/30", page: "packages" },
    { id: "investments", labelKey: "overview.shortcuts.investments", icon: TrendingUp, color: "text-green-400", border: "border-green-500/30", page: "investments" },
    { id: "market", labelKey: "overview.shortcuts.market", icon: Activity, color: "text-purple-400", border: "border-purple-500/30", page: "market" },
    { id: "referral", labelKey: "overview.shortcuts.referral", icon: Users, color: "text-amber-400", border: "border-amber-500/30", page: "referral" },
  ],
  [
    { id: "profile", labelKey: "overview.shortcuts.profile", icon: User, color: "text-blue-400", border: "border-blue-500/30", page: "profile" },
    { id: "support", labelKey: "overview.shortcuts.support", icon: Headset, color: "text-rose-400", border: "border-rose-500/30", page: "support", external: "https://t.me/+aIajLcllDPBlOTE0" },
    { id: "marketplace", labelKey: "overview.shortcuts.marketplace", icon: ShoppingCart, color: "text-green-400", border: "border-green-500/30", page: "marketplace" },
    { id: "seller", labelKey: "overview.shortcuts.seller", icon: Store, color: "text-orange-400", border: "border-orange-500/30", page: "seller" },
  ],
  [
    { id: "send-funds", labelKey: "overview.shortcuts.sendFunds", icon: Send, color: "text-blue-400", border: "border-blue-500/30", page: "send-funds" },
    { id: "p2p", labelKey: "quickShortcuts.p2p", icon: Repeat, color: "text-violet-400", border: "border-violet-500/30", soon: true },
    { id: "international-currency", labelKey: "quickShortcuts.internationalCurrency", icon: Globe, color: "text-sky-400", border: "border-sky-500/30", soon: true },
  ],
  [
    { id: "kyc", labelKey: "overview.shortcuts.kyc", icon: ShieldCheck, color: "text-green-400", border: "border-green-500/30", page: "kyc" },
    { id: "matching-bonus", labelKey: "overview.shortcuts.matchingBonusPlan", icon: Trophy, color: "text-yellow-400", border: "border-yellow-500/30", page: "matching-bonus" },

  ],
]

export function QuickShortcuts({ setActivePage }) {
  const { t } = useTranslation()
  const [comingSoonModal, setComingSoonModal] = useState(null)

  const handleClick = (item) => {
    if (item.soon) { setComingSoonModal(item.labelKey); return }
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
            <span className="text-[9px] text-gray-400 font-medium leading-tight text-center">{t(item.labelKey)}</span>
            {item.soon && (
              <span className="text-[7px] px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 absolute -top-1 -right-1">
                {t("quickShortcuts.soon")}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {comingSoonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setComingSoonModal(null)}>
          <div className="bg-gray-900 border border-white/[0.06] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{t("quickShortcuts.comingSoon")}</h3>
              </div>
              <button onClick={() => setComingSoonModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6">{t("quickShortcuts.comingSoonDesc")}</p>
            <button
              onClick={() => setComingSoonModal(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium hover:brightness-110 transition-all"
            >
              {t("quickShortcuts.gotIt")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
