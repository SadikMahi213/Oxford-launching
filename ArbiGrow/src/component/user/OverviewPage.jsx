import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import {
  Wallet, Coins, Download, Upload, Users, TrendingUp, Pickaxe,
  User,   Headset, ShoppingCart, Store, Send,
  Clock, ShieldCheck, Award, GitBranch, Trophy, ArrowLeftRight,
  Gem, ChevronRight, ChevronDown, UserCheck, UserX, BarChart3,
  CalendarDays, RefreshCw, PieChart, Activity,
} from "lucide-react";
import { useNavigate } from "react-router";
import useUserStore from "../../store/userStore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMyDeposits, getMyWithdrawals, refreshUserStore,
  startMining, claimMining, getMiningStatus,
  getMyEarningsHistory, getMatchingWallet, getMyMatchingBonuses,
  getNetworkAnalytics, getReferralNetwork,
} from "../../api/user.api.js";
import { MarketsCrawl } from "./overview/MarketsCrawl.jsx";
import { QuickShortcuts } from "./overview/QuickShortcuts.jsx";
import OFACryptocurrency from "./overview/OFACryptocurrency.jsx";
import LiveActivityFeed from "../live-feed/LiveActivityFeed.jsx";

import ProfileIdentityCard from "./ProfileIdentityCard.jsx";

const OverviewPage = ({ setActivePage }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const MINING_CYCLE_MS = 24 * 60 * 60 * 1000;
  const { user, setUser, logout } = useUserStore();

  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [matchingBonusHistory, setMatchingBonusHistory] = useState([]);
  const [isTokenInfoOpen, setIsTokenInfoOpen] = useState(false);
  const [walletHistoryModal, setWalletHistoryModal] = useState(null);
  const [isMiningActive, setIsMiningActive] = useState(false);
  const [isMiningActionLoading, setIsMiningActionLoading] = useState(false);
  const [miningActionError, setMiningActionError] = useState("");
  const [remainingTime, setRemainingTime] = useState(null);
  const [simulatedMiningBalance, setSimulatedMiningBalance] = useState(null);
  const [networkAnalytics, setNetworkAnalytics] = useState({ totalNetworkMembers: 0, activeMembers: 0, inactiveMembers: 0 });
  const [networkAnalyticsLoading, setNetworkAnalyticsLoading] = useState(true);
  const [referralLevels, setReferralLevels] = useState([]);
  const [matchingBonus, setMatchingBonus] = useState(0);
  const miningBaseRef = useRef(0);
  const miningStartRef = useRef(0);
  const capRef = useRef(0);

  const handleUnauthorized = useCallback(
    (error) => {
      if (error?.response?.status !== 401) return false;
      logout();
      navigate("/");
      return true;
    },
    [logout, navigate],
  );

  const syncUserFromServer = async () => {
    try {
      const userResponse = await refreshUserStore();
      if (userResponse?.data?.user) setUser({ ...userResponse.data.user, kyc_status: userResponse.data.kyc_status, doc_submitted: userResponse.data.doc_submitted, kyc_note: userResponse.data.kyc_note });
      return userResponse;
    } catch (err) {
      handleUnauthorized(err);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await syncUserFromServer();
        const [depositRes, withdrawalRes, earningsRes, matchingWalletRes, networkRes, referralRes] =
          await Promise.allSettled([
            getMyDeposits({ page: 1, limit: 200 }),
            getMyWithdrawals({ page: 1, limit: 200 }),
            getMyEarningsHistory({ page: 1, limit: 200 }),
            getMatchingWallet(),
            getNetworkAnalytics(),
            getReferralNetwork(),
          ]);

        if (depositRes.status === "fulfilled") {
          const data = Array.isArray(depositRes.value?.data?.data) ? depositRes.value.data.data : [];
          setDepositHistory(data);
        }
        if (withdrawalRes.status === "fulfilled") {
          const data = Array.isArray(withdrawalRes.value?.data?.data) ? withdrawalRes.value.data.data : [];
          setWithdrawalHistory(data);
        }
        if (earningsRes.status === "fulfilled") {
          const data = Array.isArray(earningsRes.value?.data?.data) ? earningsRes.value.data.data : [];
          setEarningsHistory(data);
        }
        if (matchingWalletRes.status === "fulfilled" && matchingWalletRes.value?.data) {
          setMatchingBonus(Number(matchingWalletRes.value.data.total_matching_bonus) || 0);
        }
        if (networkRes.status === "fulfilled" && networkRes.value?.data) {
          setNetworkAnalytics({
            totalNetworkMembers: Number(networkRes.value.data.total_network_members) || 0,
            activeMembers: Number(networkRes.value.data.active_members) || 0,
            inactiveMembers: Number(networkRes.value.data.inactive_members) || 0,
          });
          setNetworkAnalyticsLoading(false);
        } else {
          setNetworkAnalyticsLoading(false);
        }
        if (referralRes.status === "fulfilled" && Array.isArray(referralRes.value?.data?.levels)) {
          setReferralLevels(
            referralRes.value.data.levels.map((lvl) => ({
              level: lvl.level,
              commissionRate: lvl.commission_rate,
              totalEarnings: Number(lvl.total_earnings) || 0,
            })),
          );
        }
      } catch (err) {
        setNetworkAnalyticsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    // Restore from user data immediately (synchronous, from store)
    if (user?.is_mining && user?.mining_started_at) {
      setIsMiningActive(true);
      const startedAt = new Date(user.mining_started_at).getTime();
      const elapsed = Date.now() - startedAt;
      setRemainingTime(Math.max(0, MINING_CYCLE_MS - elapsed));
    } else {
      setIsMiningActive(false);
      setRemainingTime(null);
    }

    // Then fetch authoritative server state and override if available.
    // This handles re-login after logout, page refresh, or expired sessions
    // where the server has the true mining state but user data may be stale.
    let cancelled = false;
    getMiningStatus().then((res) => {
      if (cancelled || !res?.data) return;
      if (res.data.mining_active && res.data.mining_started_at) {
        setIsMiningActive(true);
        const serverTimeLeft = res.data.time_remaining_seconds;
        setRemainingTime(serverTimeLeft != null ? Math.max(0, serverTimeLeft * 1000) : MINING_CYCLE_MS);
        if (res.data.daily_cap) capRef.current = Number(res.data.daily_cap);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.is_mining, user?.mining_started_at, MINING_CYCLE_MS]);

  useEffect(() => {
    if (!isMiningActive || !user?.mining_started_at) {
      setSimulatedMiningBalance(null);
      return;
    }
    const dailyCap = Number(user?.mining_daily_cap) || capRef.current || 100;
    miningBaseRef.current = Number(user.arbx_mining_wallet) || 0;
    miningStartRef.current = new Date(user.mining_started_at).getTime();
    capRef.current = dailyCap;
    const initElapsed = (Date.now() - miningStartRef.current) / 1000;
    const initEarned = Math.min((capRef.current / 86400) * initElapsed, capRef.current);
    setSimulatedMiningBalance(Math.max(0, initEarned));

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - miningStartRef.current) / 1000;
      const earned = Math.min((capRef.current / 86400) * elapsed, capRef.current);
      setSimulatedMiningBalance(earned);
      setRemainingTime(Math.max(0, MINING_CYCLE_MS - (now - miningStartRef.current)));
    }, 100);

    return () => clearInterval(interval);
  }, [isMiningActive, user?.mining_started_at]);

  const formatTime = (ms) => {
    if (!ms) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const formatAmount = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return value;
    return amount % 1 === 0 ? String(amount) : amount.toFixed(2);
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "approved": return "text-green-400 bg-green-500/10 border-green-500/30";
      case "pending": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "rejected": return "text-red-400 bg-red-500/10 border-red-500/30";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const walletLabelMap = {
    main_wallet: t("overview.wallets.main"),
    arbx_wallet: t("overview.wallets.ofa"),
    deposit_wallet: t("overview.wallets.deposit"),
    withdraw_wallet: t("overview.wallets.withdraw"),
    referral_wallet: t("overview.wallets.referral"),
    generation_wallet: t("overview.wallets.generation"),
  };

  const handleStartMining = async () => {
    if (isMiningActionLoading) return;
    setMiningActionError("");
    setIsMiningActionLoading(true);
    try {
      const statusRes = await getMiningStatus();
      if (statusRes?.data?.mining_active && statusRes?.data?.mining_started_at) {
        setUser({
          is_mining: true,
          mining_started_at: statusRes.data.mining_started_at,
          arbx_mining_wallet: statusRes.data.arbx_mining_wallet ?? user.arbx_mining_wallet,
        });
        const timeLeft = statusRes.data.time_remaining_seconds;
        setRemainingTime(timeLeft != null ? timeLeft * 1000 : MINING_CYCLE_MS);
        setMiningActionError("");
        setIsMiningActionLoading(false);
        return;
      }
    } catch {}

    try {
      const response = await startMining();
      const miningStartedAt = response?.data?.mining_started_at || new Date().toISOString();
      setUser({ is_mining: true, mining_started_at: miningStartedAt });
      setRemainingTime(MINING_CYCLE_MS);
      syncUserFromServer().catch(() => null);
    } catch (err) {
      if (handleUnauthorized(err)) return;
      setMiningActionError(err?.response?.data?.detail || "Failed to start mining.");
      console.error(err?.response?.data || err);
    } finally {
      setIsMiningActionLoading(false);
    }
  };

  const handleClaimMining = async () => {
    if (isMiningActionLoading) return;
    setMiningActionError("");
    setIsMiningActionLoading(true);
    try {
      const response = await claimMining();
      setUser({
        is_mining: false,
        mining_started_at: null,
        arbx_mining_wallet: response?.data?.arbx_mining_wallet ?? user?.arbx_mining_wallet,
      });
      setRemainingTime(null);
      syncUserFromServer().catch(() => null);
    } catch (err) {
      if (handleUnauthorized(err)) return;
      setMiningActionError(err?.response?.data?.detail || "Failed to claim reward.");
      console.error(err?.response?.data || err);
    } finally {
      setIsMiningActionLoading(false);
    }
  };

  const canClaim = isMiningActive && remainingTime !== null && remainingTime <= 0;
  const isTimerRunning = isMiningActive && !canClaim;

  const loadMatchingBonusHistory = async () => {
    try {
      const res = await getMyMatchingBonuses({ page: 1, limit: 200 });
      setMatchingBonusHistory(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {}
  };

  const historyItems =
    walletHistoryModal === "deposit" ? depositHistory
    : walletHistoryModal === "withdrawal" ? withdrawalHistory
    : walletHistoryModal === "matching" ? matchingBonusHistory
    : earningsHistory.filter((e) => e.wallet_type === walletHistoryModal);

  const handleWalletCardClick = (wallet) => {
    if (wallet.historyType === "deposit") setWalletHistoryModal("deposit");
    if (wallet.historyType === "withdrawal") setWalletHistoryModal("withdrawal");
    if (wallet.historyType === "referral") setWalletHistoryModal("referral");
    if (wallet.historyType === "generation") setWalletHistoryModal("generation");
  };


  return (
    <div className="min-h-screen bg-[#0a0b1e] px-4 pb-28 space-y-4">
      {String(user?.account_status || "").toLowerCase() === "pending_payment" && (
        <div className="mx-4 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {t("overview.pendingPayment")}
        </div>
      )}
      <ProfileIdentityCard />
      <QuickShortcuts setActivePage={setActivePage} />
      <MarketsCrawl />

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t("overview.wallets.main"), balance: Number(user?.main_wallet ?? 0), icon: Wallet, currency: "USDT", gradient: "from-blue-600/50 via-blue-600/15 to-transparent", border: "border-blue-500/30", iconBg: "from-blue-500 to-cyan-300", iconBorder: "border-blue-400/40", shadowColor: "shadow-blue-600/25", accentColor: "text-blue-400", footerColor: "text-blue-400" },
          { label: t("overview.wallets.ofa"), balance: Number(user?.arbx_wallet ?? 0), icon: Coins, currency: t("overview.wallets.ofaToken"), gradient: "from-amber-600/50 via-amber-600/15 to-transparent", border: "border-amber-500/30", iconBg: "from-amber-500 to-yellow-300", iconBorder: "border-amber-400/40", shadowColor: "shadow-amber-600/25", accentColor: "text-amber-400", footerColor: "text-amber-400" },
          { label: t("overview.wallets.deposit"), balance: Number(user?.deposit_wallet ?? 0), icon: Download, currency: "USDT", gradient: "from-emerald-600/50 via-emerald-600/15 to-transparent", border: "border-emerald-500/30", iconBg: "from-emerald-500 to-teal-300", iconBorder: "border-emerald-400/40", shadowColor: "shadow-emerald-600/25", accentColor: "text-emerald-400", footerColor: "text-emerald-400", historyType: "deposit" },
          { label: t("overview.wallets.withdraw"), balance: Number(user?.withdraw_wallet ?? 0), icon: Upload, currency: "USDT", gradient: "from-purple-600/50 via-purple-600/15 to-transparent", border: "border-purple-500/30", iconBg: "from-purple-500 to-pink-300", iconBorder: "border-purple-400/40", shadowColor: "shadow-purple-600/25", accentColor: "text-purple-400", footerColor: "text-purple-400", historyType: "withdrawal" },
          { label: t("overview.wallets.referral"), balance: Number(user?.referral_wallet ?? 0), icon: Users, currency: "USDT", gradient: "from-cyan-600/50 via-cyan-600/15 to-transparent", border: "border-cyan-500/30", iconBg: "from-cyan-500 to-blue-300", iconBorder: "border-cyan-400/40", shadowColor: "shadow-cyan-600/25", accentColor: "text-cyan-400", footerColor: "text-cyan-400", historyType: "referral" },
          { label: t("overview.wallets.generation"), balance: Number(user?.generation_wallet ?? 0), icon: TrendingUp, currency: "USDT", gradient: "from-orange-600/50 via-orange-600/15 to-transparent", border: "border-orange-500/30", iconBg: "from-orange-500 to-red-300", iconBorder: "border-orange-400/40", shadowColor: "shadow-orange-600/25", accentColor: "text-orange-400", footerColor: "text-orange-400", historyType: "generation" },
        ].map((wallet, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => handleWalletCardClick(wallet)}
            className={`p-4 rounded-2xl bg-gradient-to-tl ${wallet.gradient} backdrop-blur-xl border ${wallet.border} hover:brightness-110 transition-all duration-300 relative overflow-hidden ${wallet.historyType ? "cursor-pointer" : ""}`}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${wallet.iconBg} flex items-center justify-center shadow-xl ${wallet.shadowColor} border ${wallet.iconBorder}`}>
                  <wallet.icon className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] ${wallet.accentColor} border border-white/[0.12] font-semibold`}>{wallet.currency}</div>
              </div>
              <div className="text-[11px] text-gray-500 mb-0.5">{wallet.label}</div>
              <div className="text-xl font-bold text-white mb-1">
                {wallet.currency === "USDT" ? <>${wallet.balance.toFixed(2)}</> : <>{wallet.balance.toFixed(7)}</>}
              </div>
              <div className="text-[11px] text-gray-500 mb-3">{t("overview.wallets.usable")}</div>
              <div className="mt-auto">
                <span className={`text-[10px] ${wallet.footerColor} font-semibold`}>{t("overview.wallets.clickHistory")}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-blue-900/50 via-blue-800/20 to-black/40 backdrop-blur-xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 relative overflow-hidden"
      >
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <path d="M150 100 Q250 60 350 100 T550 80 Q600 90 620 120 Q640 150 620 180 T580 220 Q560 250 540 280 T500 320 Q480 340 450 350 T350 370 Q300 380 250 360 T150 340 Q100 320 80 280 T90 220 Q95 180 120 150 T150 100Z" fill="currentColor" />
          <path d="M400 80 Q500 40 600 70 T750 120 Q780 150 770 190 Q755 230 720 260 T650 300 Q620 320 580 330 T480 340 Q440 345 410 330 T380 300 Q360 270 370 230 Q375 200 390 170 T420 130 Q430 100 400 80Z" fill="currentColor" />
          <path d="M50 200 Q100 160 180 170 T300 200 Q320 220 310 260 Q300 290 270 310 T180 330 Q130 335 90 310 Q60 290 50 260 Q40 230 50 200Z" fill="currentColor" />
          <path d="M500 130 Q550 110 600 120 T700 150 Q720 170 710 200 Q700 220 670 235 T580 250 Q550 252 530 240 Q510 225 505 200 Q500 175 500 130Z" fill="currentColor" />
        </svg>
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              <Award className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-white/[0.08] text-blue-300 border border-white/[0.12] font-semibold">{t("overview.wallets.matching")}</div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-white mb-0.5">${matchingBonus.toFixed(2)}</div>
          <div className="text-xs text-blue-300/60 mb-3">{t("overview.wallets.matching_desc")}</div>
          <div className="flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); loadMatchingBonusHistory(); setWalletHistoryModal("matching"); }} className="flex-1 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 backdrop-blur-md border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all hover:brightness-110">
              {t("overview.wallets.viewHistory")}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setActivePage?.("matching-bonus-transfer"); }} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 shadow-lg shadow-blue-600/25 text-white text-xs font-semibold transition-all">
              {t("overview.wallets.transfer")}
            </button>
          </div>
        </div>
      </motion.div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isTokenInfoOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 flex items-center justify-center" onClick={() => setIsTokenInfoOpen(false)}>
              <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#151d45] to-[#10183a] border border-white/10 p-4 sm:p-5 md:p-8 max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{t("overview.tokenInfo.title")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 border-b border-white/10 pb-4 sm:pb-5">
                  <div><div className="text-xs text-gray-400 mb-1">{t("overview.tokenInfo.name")}</div><div className="text-white font-semibold">{t("overview.tokenInfo.nameVal")}</div></div>
                  <div><div className="text-xs text-gray-400 mb-1">{t("overview.tokenInfo.symbol")}</div><div className="text-white font-semibold">{t("overview.tokenInfo.symbolVal")}</div></div>
                  <div><div className="text-xs text-gray-400 mb-1">{t("overview.tokenInfo.network")}</div><div className="text-white font-semibold">{t("overview.tokenInfo.networkVal")}</div></div>
                  <div><div className="text-xs text-gray-400 mb-1">{t("overview.tokenInfo.supply")}</div><div className="text-white font-semibold">{t("overview.tokenInfo.supplyVal")}</div></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-4 sm:pt-5 mb-5 sm:mb-6">
                  <div><div className="text-xs text-gray-400 mb-1">{t("overview.tokenInfo.utility")}</div><div className="text-white">{t("overview.tokenInfo.utilityVal")}</div></div>
                  <div><div className="text-xs text-gray-400 mb-1">{t("overview.tokenInfo.listed")}</div><div className="text-white">{t("overview.tokenInfo.listedVal")}</div></div>
                </div>
                <button type="button" onClick={() => setIsTokenInfoOpen(false)} className="w-full sm:w-auto px-6 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:text-white hover:bg-cyan-500/30 transition-colors">
                  {t("overview.tokenInfo.close")}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {walletHistoryModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 flex items-center justify-center" onClick={() => setWalletHistoryModal(null)}>
              <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#151d45] to-[#10183a] border border-white/10 p-4 sm:p-5 md:p-8 max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] overflow-y-auto">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                    {walletHistoryModal === "deposit" ? t("overview.historyTypes.deposit")
                    : walletHistoryModal === "withdrawal" ? t("overview.historyTypes.withdrawal")
                    : walletHistoryModal === "referral" ? t("overview.historyTypes.referral")
                    : walletHistoryModal === "matching" ? t("overview.historyTypes.matching")
                    : t("overview.historyTypes.generation")}
                  </h3>
                  <button type="button" onClick={() => setWalletHistoryModal(null)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:border-cyan-400/60 transition-colors">
                    {t("overview.history.close")}
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="p-4 text-left text-sm text-gray-400">{t("overview.history.date")}</th>
                          <th className="p-4 text-left text-sm text-gray-400">{t("overview.history.amount")}</th>
                          {walletHistoryModal === "deposit" ? (
                            <><th className="p-4 text-left text-sm text-gray-400">{t("overview.history.network")}</th><th className="p-4 text-left text-sm text-gray-400">{t("overview.history.txid")}</th></>
                          ) : walletHistoryModal === "withdrawal" ? (
                            <><th className="p-4 text-left text-sm text-gray-400">{t("overview.history.sourceWallet")}</th><th className="p-4 text-left text-sm text-gray-400">{t("overview.history.destination")}</th></>
                          ) : walletHistoryModal === "matching" ? (
                            <><th className="p-4 text-left text-sm text-gray-400">{t("overview.history.rank")}</th><th className="p-4 text-left text-sm text-gray-400">{t("overview.history.rate")}</th></>
                          ) : (
                            <><th className="p-4 text-left text-sm text-gray-400">{t("overview.history.fromUser")}</th><th className="p-4 text-left text-sm text-gray-400">{t("overview.history.level")}</th></>
                          )}
                          <th className="p-4 text-left text-sm text-gray-400">{t("overview.history.status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyItems.length === 0 && (
                          <tr><td colSpan="5" className="p-6 text-center text-gray-400">{t("overview.history.noHistory", { type: t("overview.historyTypes." + walletHistoryModal) })}</td></tr>
                        )}
                        {historyItems.map((item) => (
                          <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-4 text-gray-400">{formatDate(item.created_at)}</td>
                            <td className="p-4 font-semibold text-white">
                              {walletHistoryModal === "matching" ? `+${parseFloat(item.bonus_amount || 0).toFixed(2)} USDT` : `${formatAmount(item.amount)} USDT`}
                            </td>
                            {walletHistoryModal === "deposit" ? (
                              <><td className="p-4 text-gray-400">{item.network_name || "-"}</td><td className="p-4 text-gray-400 font-mono text-xs">{item.txid || "-"}</td></>
                            ) : walletHistoryModal === "withdrawal" ? (
                              <><td className="p-4 text-gray-400">{walletLabelMap[item.source_wallet] || item.source_wallet || "-"}</td><td className="p-4 text-gray-400 font-mono text-xs break-all">{item.destination_address || "-"}</td></>
                            ) : walletHistoryModal === "matching" ? (
                              <><td className="p-4 text-gray-400">{item.rank_name || `Rank #${item.rank_id}`}</td><td className="p-4 text-gray-400">{parseFloat(item.bonus_percent || 0)}%</td></>
                            ) : (
                              <><td className="p-4 text-gray-400">{item.from_username || "-"}</td><td className="p-4 text-gray-400">Level {item.level}</td></>
                            )}
                            <td className="p-4">
                              <span className={`rounded-full border px-2 py-1 text-xs ${walletHistoryModal === "deposit" || walletHistoryModal === "withdrawal" ? getStatusColor(item.status) : "text-green-400 bg-green-500/10 border-green-500/30"}`}>
                                {walletHistoryModal === "deposit" || walletHistoryModal === "withdrawal" ? item.status : t("overview.history.received")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-2xl p-5">
        <h3 className="text-xl font-bold text-white mb-3">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t("overview.ofaDesc.title")}</span>
        </h3>
        <p className="text-gray-300 mb-3">{t("overview.ofaDesc.body", { balance: Number(user.arbx_wallet).toFixed(7) })}</p>
        <p className="text-gray-300">{t("overview.ofaDesc.convert")} {t("overview.ofaDesc.external")} <span className="text-cyan-400 font-semibold">{t("overview.ofaDesc.grow")}</span></p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-[#0d1128] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm md:text-base font-bold text-white">{t("overview.networkAnalytics.title")}</h2>
          </div>
          <button className="text-xs text-gray-400 hover:text-white transition-colors font-medium">{t("overview.viewAll")} &gt;</button>
        </div>
        {networkAnalyticsLoading ? (
          <div className="p-4 text-gray-400 text-sm">{t("overview.networkAnalytics.loading")}</div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("overview.networkAnalytics.total"), value: networkAnalytics.totalNetworkMembers, icon: Users, color: "text-blue-400", bg: "from-blue-600/10 to-cyan-600/10", border: "border-blue-500/30", iconBg: "bg-blue-500/20" },
                { label: t("overview.networkAnalytics.active"), value: networkAnalytics.activeMembers, icon: UserCheck, color: "text-green-400", bg: "from-green-600/10 to-emerald-600/10", border: "border-green-500/30", iconBg: "bg-green-500/20" },
                { label: t("overview.networkAnalytics.inactive"), value: networkAnalytics.inactiveMembers, icon: UserX, color: "text-orange-400", bg: "from-orange-600/10 to-amber-600/10", border: "border-orange-500/30", iconBg: "bg-orange-500/20" },
              ].map((item, idx) => (
                <div key={item.label} className={`p-3 rounded-xl bg-gradient-to-br ${item.bg} border ${item.border} flex flex-col items-center gap-1.5 relative overflow-hidden`}>
                  <svg className="absolute bottom-0 left-0 w-full h-6 opacity-[0.08]" viewBox="0 0 120 20" preserveAspectRatio="none">
                    <path d="M0 10 Q30 0 60 10 T120 10 V20 H0 Z" fill={idx === 0 ? "#3b82f6" : idx === 1 ? "#22c55e" : "#f97316"} />
                  </svg>
                  <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center relative z-10`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className={`text-xl md:text-2xl font-bold ${item.color} relative z-10`}>{item.value}</div>
                  <div className="text-[10px] md:text-xs text-gray-400 relative z-10">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-[#0d1128] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm md:text-base font-bold text-white">{t("overview.teamPerformance.title")}</h2>
          </div>
          <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors font-medium">
            {t("overview.allLevels")} <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          {referralLevels.length > 0 && (
            <div className="p-4 md:p-5 rounded-xl bg-gradient-to-br from-[#0d1128] to-[#131b3d] border border-white/[0.08] flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] text-gray-400 mb-1">{t("overview.teamPerformance.netEarnings")}</div>
                <div className="text-xl md:text-2xl font-bold text-white">${referralLevels.reduce((sum, lvl) => sum + (lvl.totalEarnings || 0), 0).toFixed(2)}</div>
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400">{t("overview.teamPerformance.growth")}</span>
                </div>
              </div>
              <div className="flex items-end gap-[3px] h-16">
                {[35, 55, 40, 70, 50, 85, 60].map((h, i) => (
                  <div key={i} className="relative w-4 md:w-5 flex flex-col items-center justify-end">
                    <div className="w-full rounded-t-sm bg-gradient-to-t from-purple-600 to-pink-400" style={{ height: `${h * 0.5}px` }} />
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500/60 to-pink-500/60 blur-sm rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {referralLevels.length === 0 ? (
            <div className="text-gray-400 text-sm">{t("overview.teamPerformance.loading")}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {referralLevels.filter((l) => l.level <= 4).map((lvl) => {
                  const colors = [
                    { border: "border-blue-500/40", text: "text-blue-400", bg: "from-blue-600/10 to-blue-600/5" },
                    { border: "border-cyan-500/40", text: "text-cyan-400", bg: "from-cyan-600/10 to-cyan-600/5" },
                    { border: "border-purple-500/40", text: "text-purple-400", bg: "from-purple-600/10 to-purple-600/5" },
                    { border: "border-pink-500/40", text: "text-pink-400", bg: "from-pink-600/10 to-pink-600/5" },
                  ][lvl.level - 1] || colors[0];
                  return (
                    <div key={lvl.level} onClick={() => setActivePage("referral")} className={`p-3 md:p-4 rounded-xl bg-gradient-to-br ${colors.bg} backdrop-blur-md border ${colors.border} cursor-pointer hover:brightness-110 transition-all duration-300`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Gem className={`w-4 h-4 ${colors.text}`} />
                          <span className={`text-lg font-bold ${colors.text}`}>{lvl.level}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div className={`text-[11px] ${colors.text} font-semibold mb-1.5`}>{t("overview.teamPerformance.level", { level: lvl.level })}</div>
                      <div className={`text-sm font-bold ${colors.text}`}>{lvl.commissionRate}</div>
                      <div className="text-white text-xs mt-0.5">${lvl.totalEarnings.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
              {(() => { const l5 = referralLevels.find((l) => l.level === 5); return l5 ? (
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-600/10 to-yellow-600/5 backdrop-blur-md border border-amber-500/40 cursor-pointer hover:brightness-110 transition-all duration-300 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Gem className="w-4 h-4 text-amber-400" />
                        <span className="text-lg font-bold text-amber-400">{l5.level}</span>
                        <span className="text-[11px] text-amber-400 font-semibold ml-1">{t("overview.teamPerformance.level", { level: l5.level })}</span>
                      </div>
                      <div className="text-sm font-bold text-amber-400">{l5.commissionRate}</div>
                      <div className="text-white text-xs mt-0.5">${l5.totalEarnings.toFixed(2)}</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                </div>
              ) : null})()}
            </>
          )}
        </div>
      </motion.div>

      {/* ===== OFA Token Mining Wallet ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        {/* --- Header Card --- */}
        <div className="relative p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] overflow-hidden mb-4">
          {/* Top-right wallet icon */}
          <div className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white/70" />
          </div>

          <div className="flex flex-col md:flex-row items-start gap-5">
            {/* 3D Golden Pickaxe */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-yellow-500/30 to-orange-600/20 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.25)] border border-yellow-500/30">
                <Pickaxe className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              </div>
            </div>

            {/* Title & Balance */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{t("overview.mining.title")}</h3>
              <div className="text-[11px] text-gray-500 tracking-widest uppercase mt-0.5">{t("overview.mining.totalBalance")}</div>
              <div className="text-2xl font-bold text-yellow-400 font-mono tracking-wider mt-1.5">
                {isMiningActive && simulatedMiningBalance !== null
                  ? (() => { const s = simulatedMiningBalance.toFixed(8); return <>{s.slice(0, -3)}<span className="text-yellow-300/70 animate-pulse">{s.slice(-3)}</span></>; })()
                  : Number(user.arbx_mining_wallet || 0).toFixed(8)} <span className="text-xs font-sans text-yellow-400/80">{t("overview.wallets.ofaToken")}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{t("overview.mining.continuous")}</div>

              {/* Buttons Row */}
              <div className="flex items-center gap-2.5 mt-4">
                <button
                  onClick={!isMiningActive ? handleStartMining : canClaim ? handleClaimMining : null}
                  disabled={isMiningActionLoading || isTimerRunning}
                  className={`px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                    isMiningActionLoading || isTimerRunning
                      ? "bg-gray-600 cursor-not-allowed text-gray-300"
                      : "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]"
                  }`}
                >
                  <Pickaxe className="w-4 h-4" />
                  {!isMiningActive && (isMiningActionLoading ? t("overview.mining.starting") : t("overview.mining.start"))}
                  {isTimerRunning && formatTime(remainingTime)}
                  {canClaim && (isMiningActionLoading ? t("overview.mining.claiming") : t("overview.mining.claim"))}
                </button>
                <div className="w-9 h-9 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white/60" />
                </div>
              </div>
            </div>
          </div>

          {miningActionError && <p className="mt-3 text-sm text-red-400">{miningActionError}</p>}
        </div>

        {/* --- Stats Bar --- */}
        <div className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Current Cycle */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 tracking-widest">{t("overview.mining.currentCycle")}</div>
                <div className="text-sm font-bold text-white font-mono">
                  {isTimerRunning && remainingTime !== null ? formatTime(remainingTime) : "24:00:00"}
                </div>
                <div className="text-[10px] text-purple-300">{t("overview.mining.remainingLabel")}</div>
              </div>
            </div>
            {/* Mined Today */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 tracking-widest">{t("overview.mining.minedToday")}</div>
                <div className="text-sm font-bold text-white font-mono">
                  {isMiningActive && simulatedMiningBalance !== null ? simulatedMiningBalance.toFixed(8) : "0.00000000"}
                </div>
                <div className="text-[10px] text-blue-300">OFA</div>
              </div>
            </div>
            {/* Daily Cap */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 tracking-widest">{t("overview.mining.dailyCap")}</div>
                <div className="text-sm font-bold text-white font-mono">100.00000000</div>
                <div className="text-[10px] text-green-300">OFA</div>
              </div>
            </div>
            {/* Last Claim */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 tracking-widest">{t("overview.mining.lastClaim")}</div>
                <div className="text-sm font-bold text-white font-mono">--:--:--</div>
                <div className="text-[10px] text-orange-300">{t("overview.mining.notClaimed")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- How Mining Works + OFA Cryptocurrency row --- */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="relative p-5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.08)] lg:w-[62%]">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Pickaxe className="w-4 h-4 text-yellow-400" />
              {t("overview.mining.howTitle")}
            </h3>
            <div className="space-y-3">
              {[
                { num: "01", text: t("overview.mining.step1"), icon: <RefreshCw className="w-4 h-4 text-yellow-400" /> },
                { num: "02", text: t("overview.mining.step2"), icon: <PieChart className="w-4 h-4 text-yellow-400" /> },
                { num: "03", text: t("overview.mining.step3"), icon: <Wallet className="w-4 h-4 text-yellow-400" /> },
                { num: "04", text: t("overview.mining.step4"), icon: <RefreshCw className="w-4 h-4 text-yellow-400" /> },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <span className="text-[11px] font-bold text-yellow-500 w-5 flex-shrink-0 mt-0.5">{step.num}</span>
                  <p className="flex-1 text-xs text-gray-300 leading-relaxed">{step.text}</p>
                  <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                    {step.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-[38%]">
            <OFACryptocurrency />
          </div>
        </div>
      </motion.div>

      <LiveActivityFeed />
    </div>
  );
};

export default OverviewPage;


