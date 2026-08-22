import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Loader2,
  Wallet,
  Home,
  User,
  DollarSign,
  Landmark,
  Banknote,
  Users,
  GitMerge,
  Coins,
  Pickaxe,
  ShieldCheck,
  MonitorPlay,
  ShoppingBag,
  Trophy,
  Globe,
} from "lucide-react";
import { getWalletBalances } from "../../api/user.api.js";

const WALLET_ICON = {
  main_wallet: Wallet,
  deposit_wallet: Landmark,
  withdraw_wallet: Banknote,
  referral_wallet: Users,
  generation_wallet: GitMerge,
  arbx_wallet: Coins,
  arbx_mining_wallet: Pickaxe,
  captcha_wallet: ShieldCheck,
  ad_view_wallet: MonitorPlay,
  ecommerce_wallet: ShoppingBag,
  matching_bonus_wallet: Trophy,
  ofa_balance: Globe,
};

// Stable display order for wallet cards.
const WALLET_ORDER = [
  "main_wallet",
  "deposit_wallet",
  "withdraw_wallet",
  "referral_wallet",
  "generation_wallet",
  "matching_bonus_wallet",
  "arbx_wallet",
  "arbx_mining_wallet",
  "captcha_wallet",
  "ad_view_wallet",
  "ecommerce_wallet",
  "ofa_balance",
];

const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const s = n.toFixed(6).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
};

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
      // Preserve a stable display order; unknown keys appended at the end.
      const ordered = [...WALLET_ORDER]
        .map((key) => list.find((w) => w.key === key))
        .filter(Boolean);
      const seen = new Set(ordered.map((w) => w.key));
      list.forEach((w) => {
        if (!seen.has(w.key)) ordered.push(w);
      });
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

  const usdtTotal = wallets
    .filter((w) => w.currency !== "OFA")
    .reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

  return (
    <div className="relative min-h-full bg-[#060B1A] text-white pb-24 md:pb-0">
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
          <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600/20 to-white/[0.02] border border-white/10 p-4 sm:p-5">
            <div className="text-[11px] sm:text-xs font-medium text-gray-400">{t("ledger.totalUsdt", "Total USDT Balance")}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-3xl font-bold text-white">${formatAmount(usdtTotal)}</span>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500">USDT</span>
            </div>
          </div>

          {/* Wallet cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
            {wallets.map((w) => {
              const Icon = WALLET_ICON[w.key] || Wallet;
              const isOfa = w.currency === "OFA";
              const amount = formatAmount(w.balance);
              return (
                <div
                  key={w.key}
                  className="relative rounded-xl sm:rounded-2xl bg-[#0B132B] border border-white/10 p-3 sm:p-4 flex flex-col gap-2 overflow-hidden"
                >
                  <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-blue-500/20 blur-2xl" />
                  <div className="relative flex items-center gap-2">
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/10 bg-white/5">
                      <Icon size={18} className="text-blue-300" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] sm:text-xs font-semibold text-white leading-tight line-clamp-2">
                        {t(`ledger.balance.${w.key}`, w.key)}
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-baseline gap-1 mt-auto">
                    <span className="text-base sm:text-xl font-bold text-white truncate">
                      {isOfa ? amount : `$${amount}`}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500">{w.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile only */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0B132B] border-t border-white/10 px-2 py-2 flex items-center justify-around">
        <button onClick={() => setActivePage?.("overview")} className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400 hover:text-white transition-colors">
          <Home size={18} aria-hidden="true" />
          <span className="text-[10px] leading-none">Dashboard</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-3 py-1 text-blue-400">
          <Wallet size={18} aria-hidden="true" />
          <span className="text-[10px] font-semibold leading-none">Ledger</span>
        </button>
        <button onClick={() => setActivePage?.("deposit")} className="flex flex-col items-center justify-center -mt-4">
          <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/30 border-2 border-[#0B132B]">
            <DollarSign size={20} className="text-white" aria-hidden="true" />
          </div>
        </button>
        <button onClick={() => setActivePage?.("transfer")} className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400 hover:text-white transition-colors">
          <Wallet size={18} aria-hidden="true" />
          <span className="text-[10px] leading-none">Wallet</span>
        </button>
        <button onClick={() => setActivePage?.("profile")} className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400 hover:text-white transition-colors">
          <User size={18} aria-hidden="true" />
          <span className="text-[10px] leading-none">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default WalletLedgerPage;
