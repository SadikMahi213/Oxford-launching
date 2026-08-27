import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Loader2,
  Wallet,
  DollarSign,
  Landmark,
  Banknote,
  Users,
  GitMerge,
  Coins,
  ShieldCheck,
  MonitorPlay,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { getWalletBalances } from "../../api/user.api.js";

const WALLET_ICON = {
  main_wallet: DollarSign,
  deposit_wallet: Landmark,
  withdraw_wallet: Banknote,
  referral_wallet: Users,
  generation_wallet: GitMerge,
  captcha_wallet: ShieldCheck,
  ad_view_wallet: MonitorPlay,
  ecommerce_wallet: ShoppingBag,
  matching_bonus_wallet: Trophy,
  arbx_wallet: Coins,
};

const WALLET_THEME = {
  main_wallet:     { grad: "from-blue-400 to-indigo-600", glow: "bg-blue-500/20" },
  deposit_wallet:  { grad: "from-emerald-400 to-teal-600", glow: "bg-emerald-500/20" },
  withdraw_wallet: { grad: "from-rose-400 to-red-600",   glow: "bg-rose-500/20" },
  referral_wallet: { grad: "from-fuchsia-400 to-pink-600", glow: "bg-fuchsia-500/20" },
  generation_wallet:{ grad: "from-violet-400 to-purple-600", glow: "bg-violet-500/20" },
  captcha_wallet:  { grad: "from-indigo-400 to-blue-500",  glow: "bg-indigo-500/20" },
  ad_view_wallet:  { grad: "from-cyan-400 to-sky-600",   glow: "bg-cyan-500/20" },
  ecommerce_wallet:{ grad: "from-orange-400 to-amber-500", glow: "bg-orange-500/20" },
  matching_bonus_wallet:{ grad: "from-amber-400 to-yellow-500", glow: "bg-amber-500/20" },
  arbx_wallet:     { grad: "from-emerald-400 to-green-600", glow: "bg-emerald-500/20" },
};

const WALLET_ORDER = [
  "main_wallet",
  "deposit_wallet",
  "withdraw_wallet",
  "referral_wallet",
  "generation_wallet",
  "matching_bonus_wallet",
  "arbx_wallet",
  "captcha_wallet",
  "ad_view_wallet",
  "ecommerce_wallet",
];

const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const s = n.toFixed(6).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
};

const formatFiat = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function WalletCard({ icon: Icon, title, value, unit, subtitle, theme }) {
  return (
    <div className="relative rounded-2xl bg-[#0B132B] border border-white/10 p-4 flex flex-col gap-3 overflow-hidden shadow-xl shadow-black/30 transition-all duration-200 hover:border-white/20 hover:shadow-2xl">
      <div className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full ${theme.glow} blur-3xl`} />
      <div className={`pointer-events-none absolute -left-4 -bottom-6 h-16 w-16 rounded-full ${theme.glow} blur-2xl opacity-50`} />
      <div className="relative flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${theme.grad} shadow-lg shadow-black/30 ring-1 ring-white/10`}>
          <Icon size={20} className="text-white drop-shadow-sm" />
        </div>
        {title && title.trim() && (
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-200 leading-tight line-clamp-2">
              {title}
            </div>
          </div>
        )}
      </div>
      <div className="relative mt-auto">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-white tracking-tight truncate">{value}</span>
          {unit && <span className="text-[11px] font-semibold text-gray-400 shrink-0">{unit}</span>}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-[10px] text-gray-500 leading-none">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

const WalletLedgerPage = ({ setActivePage }) => {
  const { t } = useTranslation();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWalletBalances();
      const data = res?.data || {};
      const list = Array.isArray(data.wallets) ? data.wallets : [];
      const ordered = [...WALLET_ORDER]
        .map((key) => list.find((w) => w.key === key))
        .filter(Boolean);
      setWallets(ordered);
    } catch (err) {
      console.error("WalletLedger load failed", err);
      setError(t("ledger.loadError", "Unable to load wallet balances."));
      setWallets([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const usdtTotal = wallets.reduce(
    (sum, w) =>
      sum + (w.currency === "USDT" ? Number(w.balance) || 0 : 0),
    0
  );

  return (
    <div className="relative min-h-full bg-[#060B1A] text-white pb-6">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between gap-3 px-3 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setActivePage?.("overview")}
            className="h-9 w-9 shrink-0 rounded-full bg-[#0B132B] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-white leading-tight truncate">{t("ledger.walletTitle", "Ledger")}</h2>
            <p className="text-[11px] text-gray-400 truncate">{t("ledger.walletSubtitle", "Your balances across every wallet")}</p>
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 border-b border-white/10">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">{t("ledger.walletTitle", "Ledger")}</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{t("ledger.walletSubtitle", "Your balances across every wallet")}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 sm:p-4 text-sm text-red-300 bg-red-500/10 border-b border-red-500/20">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          {t("ledger.loading", "Loading…")}
        </div>
      ) : (
        <div className="p-3 sm:p-6">
          {/* Total balance highlight */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-5 sm:mb-7 rounded-2xl bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-white/[0.02] border border-white/10 p-4 sm:p-5 shadow-xl shadow-blue-900/10">
            <div className="text-[11px] sm:text-xs font-medium text-gray-400">{t("ledger.totalUsdt", "Total USDT Balance")}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">${formatFiat(usdtTotal)}</span>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500">USDT</span>
            </div>
          </motion.div>

          {/* Wallet cards */}
          {wallets.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
              {wallets.map((w, idx) => {
                const Icon = WALLET_ICON[w.key] || Wallet;
                const theme = WALLET_THEME[w.key] || { grad: "from-slate-400 to-slate-600", glow: "bg-slate-500/20" };
                const isOfa = w.currency === "OFA";
                return (
                  <motion.div
                    key={w.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    <WalletCard
                      icon={Icon}
                      title={t(`ledger.balance.${w.key}`, w.key)}
                      value={isOfa ? formatAmount(w.balance) : `$${formatFiat(Number(w.balance) || 0)}`}
                      unit={isOfa ? "OFA" : "USDT"}
                      subtitle={undefined}
                      theme={theme}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}


    </div>
  );
};

export default WalletLedgerPage;
