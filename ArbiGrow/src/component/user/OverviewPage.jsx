import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import {
  Wallet,
  Coins,
  Download,
  Upload,
  Users,
  TrendingUp,
  Pickaxe,
  User,
  MessageCircle,
  Headset,
  ShoppingCart,
  Store,
  Send,
  Clock,
  ShieldCheck,
  Award,
  GitBranch,
} from "lucide-react";
import { useNavigate } from "react-router";
import useUserStore from "../../store/userStore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMyDeposits,
  getMyWithdrawals,
  refreshUserStore,
  startMining,
  claimMining,
  getMiningStatus,
  getMyEarningsHistory,
  getMatchingWallet,
  getMyMatchingBonuses,
  getNetworkAnalytics,
  getReferralNetwork,
} from "../../api/user.api.js";
import { QuickShortcuts } from "./overview/QuickShortcuts.jsx";
import { MarketsCrawl } from "./overview/MarketsCrawl.jsx";
import LiveActivityFeed from "../live-feed/LiveActivityFeed.jsx";
import ProfileIdentityCard from "./ProfileIdentityCard.jsx";

const OverviewPage = ({ setActivePage }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const MINING_CYCLE_MS = 24 * 60 * 60 * 1000;
  const { user, setUser, logout } = useUserStore();
  const [isTokenInfoOpen, setIsTokenInfoOpen] = useState(false);
  const [walletHistoryModal, setWalletHistoryModal] = useState(null);
  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [totalApprovedDeposits, setTotalApprovedDeposits] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [isMiningActionLoading, setIsMiningActionLoading] = useState(false);
  const [miningActionError, setMiningActionError] = useState("");
  const [simulatedMiningBalance, setSimulatedMiningBalance] = useState(null);
  const [dailyCap, setDailyCap] = useState(20);
  const miningBaseRef = useRef(0);
  const miningStartRef = useRef(0);
  const capRef = useRef(20);
  const [matchingBonus, setMatchingBonus] = useState(0);
  const [matchingBonusHistory, setMatchingBonusHistory] = useState([]);
  const [networkAnalytics, setNetworkAnalytics] = useState({ totalNetworkMembers: 0, activeMembers: 0, inactiveMembers: 0 });
  const [networkAnalyticsLoading, setNetworkAnalyticsLoading] = useState(true);
  const [referralLevels, setReferralLevels] = useState([]);
  const isMiningActive = user?.is_mining && user?.mining_started_at;

  const syncUserFromServer = useCallback(async () => {
    const userResponse = await refreshUserStore();
    if (userResponse?.status === 200 && userResponse?.data?.user) {
      setUser({ ...userResponse.data.user, kyc_status: userResponse.data.kyc_status });
    }
    return userResponse;
  }, [setUser]);

  const handleUnauthorized = useCallback(
    (error) => {
      if (error?.response?.status !== 401) return false;

      logout();
      window.location.href = "/login";
      return true;
    },
    [logout],
  );

  // console.log("global user store from OverviewPage", user);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const [, depositsResponse, withdrawalsResponse, earningsResponse] =
          await Promise.all([
            syncUserFromServer(),
            getMyDeposits(),
            getMyWithdrawals(),
            getMyEarningsHistory(),
          ]);

        const deposits = depositsResponse?.data?.data || [];
        const withdrawals = withdrawalsResponse?.data?.data || [];
        const earnings = earningsResponse?.data?.data || [];
        const approvedTotal = deposits.reduce((sum, deposit) => {
          const isApproved =
            String(deposit?.status || "").toLowerCase() === "approved";
          const amount = Number(deposit?.amount || 0);
          return isApproved ? sum + (Number.isNaN(amount) ? 0 : amount) : sum;
        }, 0);

        setDepositHistory(deposits);
        setWithdrawalHistory(withdrawals);
        setEarningsHistory(earnings);
        setTotalApprovedDeposits(approvedTotal);
      } catch (error) {
        if (handleUnauthorized(error)) return;
        console.error("Failed to refresh user:", error);
      }
    };

    loadUser();
  }, [handleUnauthorized, setUser, syncUserFromServer]);

  useEffect(() => {
    const loadMatchingWallet = async () => {
      try {
        const res = await getMatchingWallet();
        setMatchingBonus(Number(res?.data?.total_matching_bonus || 0));
      } catch (e) { /* ignore */ }
    };
    loadMatchingWallet();
  }, []);

  useEffect(() => {
    const loadNetworkAnalytics = async () => {
      try {
        const res = await getNetworkAnalytics();
        const data = res?.data || {};
        setNetworkAnalytics({
          totalNetworkMembers: Number(data.total_network_members || 0),
          activeMembers: Number(data.active_members || 0),
          inactiveMembers: Number(data.inactive_members || 0),
        });
      } catch (e) { /* ignore */ }
      setNetworkAnalyticsLoading(false);
    };
    loadNetworkAnalytics();
  }, []);

  useEffect(() => {
    const loadReferralData = async () => {
      try {
        const res = await getReferralNetwork();
        const payload = res?.data || {};
        const levelsFromApi = Array.isArray(payload.levels) ? payload.levels : [];
        setReferralLevels(levelsFromApi.map(l => ({
          level: l.level,
          commissionRate: l.commission_rate || `${l.level}%`,
          totalEarnings: Number(l.total_earnings || 0),
          users: l.users || [],
        })));
      } catch (e) { /* ignore */ }
    };
    loadReferralData();
  }, []);

  useEffect(() => {
    if (!user?.is_mining || !user?.mining_started_at) {
      setRemainingTime(null);
      return;
    }

    const start = new Date(user.mining_started_at).getTime();
    const end = start + MINING_CYCLE_MS;

    const updateTimer = () => {
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setRemainingTime(0);
        return;
      }

      setRemainingTime(diff);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [MINING_CYCLE_MS, user?.is_mining, user?.mining_started_at]);

  useEffect(() => {
    if (!isMiningActive || !user?.mining_started_at) {
      setSimulatedMiningBalance(null);
      return;
    }
    miningBaseRef.current = Number(user.arbx_mining_wallet) || 0;
    miningStartRef.current = new Date(user.mining_started_at).getTime();
    capRef.current = dailyCap;
    const initElapsed = (Date.now() - miningStartRef.current) / 1000;
    const initEarned = Math.min((capRef.current / 86400) * initElapsed, capRef.current);
    setSimulatedMiningBalance(Math.max(0, initEarned));

    getMiningStatus().then((res) => {
      if (res?.data?.daily_cap) {
        const nc = Number(res.data.daily_cap);
        setDailyCap(nc);
        capRef.current = nc;
      }
    }).catch(() => {});

    const interval = setInterval(() => {
      const elapsed = (Date.now() - miningStartRef.current) / 1000;
      const earned = Math.min((capRef.current / 86400) * elapsed, capRef.current);
      setSimulatedMiningBalance(earned);
    }, 50);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMiningActive, user?.mining_started_at]);

  const formatTime = (ms) => {
    if (!ms) return "00:00:00";

    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAmount = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return value;
    return amount % 1 === 0 ? String(amount) : amount.toFixed(2);
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "approved":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "pending":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "rejected":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const walletLabelMap = {
    main_wallet: t('overview.wallets.main'),
    arbx_wallet: t('overview.wallets.ofa'),
    deposit_wallet: t('overview.wallets.deposit'),
    withdraw_wallet: t('overview.wallets.withdraw'),
    referral_wallet: t('overview.wallets.referral'),
    generation_wallet: t('overview.wallets.generation'),
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
    } catch {
      // status check failed, proceed with start-mining
    }

    try {
      const response = await startMining();
      const miningStartedAt =
        response?.data?.mining_started_at || new Date().toISOString();

      setUser({
        is_mining: true,
        mining_started_at: miningStartedAt,
      });
      setRemainingTime(MINING_CYCLE_MS);

      syncUserFromServer().catch(() => null);
    } catch (err) {
      if (handleUnauthorized(err)) return;
      const detail = err?.response?.data?.detail || "Failed to start mining.";
      setMiningActionError(detail);
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
        arbx_mining_wallet:
          response?.data?.arbx_mining_wallet ?? user?.arbx_mining_wallet,
      });
      setRemainingTime(null);

      syncUserFromServer().catch(() => null);
    } catch (err) {
      if (handleUnauthorized(err)) return;
      const detail = err?.response?.data?.detail || "Failed to claim reward.";
      setMiningActionError(detail);
      console.error(err?.response?.data || err);
    } finally {
      setIsMiningActionLoading(false);
    }
  };

  const canClaim =
    isMiningActive && remainingTime !== null && remainingTime <= 0;
  const isTimerRunning = isMiningActive && !canClaim;
  const loadMatchingBonusHistory = async () => {
    try {
      const res = await getMyMatchingBonuses({ page: 1, limit: 200 });
      const data = Array.isArray(res?.data) ? res.data : [];
      setMatchingBonusHistory(data);
    } catch (e) { /* ignore */ }
  };

  const historyItems =
    walletHistoryModal === "deposit"
      ? depositHistory
      : walletHistoryModal === "withdrawal"
        ? withdrawalHistory
        : walletHistoryModal === "matching"
          ? matchingBonusHistory
          : earningsHistory.filter((e) => e.wallet_type === walletHistoryModal);

  const handleWalletCardClick = (wallet) => {
    if (wallet.historyType === "deposit") {
      setWalletHistoryModal("deposit");
    }
    if (wallet.historyType === "withdrawal") {
      setWalletHistoryModal("withdrawal");
    }
    if (wallet.historyType === "referral") {
      setWalletHistoryModal("referral");
    }
    if (wallet.historyType === "generation") {
      setWalletHistoryModal("generation");
    }
  };
  const shortcuts = [
    {
      id: "deposit",
      label: t('overview.shortcuts.deposit'),
      icon: Download,
      onClick: () => setActivePage("deposit"),
    },
    {
      id: "packages",
      label: t('overview.shortcuts.packages'),
      icon: Coins,
      onClick: () => setActivePage("packages"),
    },
    {
      id: "investments",
      label: t('overview.shortcuts.investments'),
      icon: Wallet,
      onClick: () => setActivePage("investments"),
    },
    {
      id: "withdraw",
      label: t('overview.shortcuts.withdraw'),
      icon: Upload,
      onClick: () => setActivePage("withdraw"),
    },
    {
      id: "market",
      label: t('overview.shortcuts.market'),
      icon: TrendingUp,
      onClick: () => setActivePage("market"),
    },
    {
      id: "referral",
      label: t('overview.shortcuts.referral'),
      icon: Users,
      onClick: () => setActivePage("referral"),
    },

    // NEW
    {
      id: "profile",
      label: t('overview.shortcuts.profile'),
      icon: User,
      onClick: () => setActivePage("profile"),
    },
    {
      id: "support",
      label: t('overview.shortcuts.support'),
      icon: Headset,
      onClick: () => window.open("https://t.me/+aIajLcllDPBlOTE0", "_blank"),
    },
    {
      id: "marketplace",
      label: t('overview.shortcuts.marketplace'),
      icon: ShoppingCart,
      onClick: () => setActivePage("marketplace"),
    },
    {
      id: "seller",
      label: t('overview.shortcuts.seller'),
      icon: Store,
      onClick: () => setActivePage("seller"),
    },
    {
      id: "send-funds",
      label: t('overview.shortcuts.sendFunds'),
      icon: Send,
      onClick: () => setActivePage("send-funds"),
    },
    {
      id: "transfer-history",
      label: t('overview.shortcuts.transfers'),
      icon: Clock,
      onClick: () => setActivePage("transfer-history"),
    },
    {
      id: "matching-bonus-transfer",
      label: t('overview.shortcuts.mbTransfer'),
      icon: Award,
      onClick: () => setActivePage("matching-bonus-transfer"),
    },
    {
      id: "kyc",
      label: t('overview.shortcuts.kyc'),
      icon: ShieldCheck,
      onClick: () => navigate("/verification-page"),
    },
  ];


  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Market Prices Bar */}
      {/* <div className="rounded-xl bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-blue-600/10 border border-white/10 p-4 overflow-x-auto">
        <div className="flex gap-6 md:gap-8 justify-center items-center min-w-max">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-orange-400 font-bold text-sm">₿</span>
            </div>
            <div>
              <div className="text-xs text-gray-400">BTC</div>
              <div className="font-bold text-white">
                ${mockMarketPrices.btc.price.toLocaleString()}
              </div>
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${mockMarketPrices.btc.change >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {mockMarketPrices.btc.change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(mockMarketPrices.btc.change)}%
            </div>
          </div>

          <div className="h-8 w-px bg-white/10"></div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-purple-400 font-bold text-sm">Ξ</span>
            </div>
            <div>
              <div className="text-xs text-gray-400">ETH</div>
              <div className="font-bold text-white">
                ${mockMarketPrices.eth.price.toLocaleString()}
              </div>
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${mockMarketPrices.eth.change >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {mockMarketPrices.eth.change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(mockMarketPrices.eth.change)}%
            </div>
          </div>

          <div className="h-8 w-px bg-white/10"></div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 font-bold text-sm">ARB</span>
            </div>
            <div>
              <div className="text-xs text-gray-400">ARB</div>
              <div className="font-bold text-white">
                ${mockMarketPrices.arb.price.toFixed(2)}
              </div>
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${mockMarketPrices.arb.change >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {mockMarketPrices.arb.change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(mockMarketPrices.arb.change)}%
            </div>
          </div>
        </div>
      </div> */}

      {/* Profile Identity Card */}
      <ProfileIdentityCard />

      {/* Quick Shortcuts */}
      <QuickShortcuts shortcuts={shortcuts} />

      {/* Markets Crawl */}
      <MarketsCrawl />

      {/* USDT Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            label: t('overview.wallets.main'),
            balance: Number(user?.main_wallet ?? 0),
            description: t('overview.wallets.main_desc'),
            icon: Wallet,
            currency: "USDT",
          },
          {
            label: t('overview.wallets.ofa'),
            balance: Number(user?.arbx_wallet ?? 0),
            description: t('overview.wallets.ofa_desc'),
            icon: Coins,
            currency: "OFA token",
            hasInfo: true,
          },
          {
            label: t('overview.wallets.deposit'),
            balance:
              totalApprovedDeposits !== null
                ? totalApprovedDeposits
                : Number(user?.deposit_wallet ?? 0),
            description: t('overview.wallets.deposit_desc'),
            icon: Download,
            currency: "USDT",
            historyType: "deposit",
          },
          {
            label: t('overview.wallets.withdraw'),
            balance: Number(user?.withdraw_wallet ?? 0),
            description: t('overview.wallets.withdraw_desc'),
            icon: Upload,
            currency: "USDT",
            historyType: "withdrawal",
          },
          {
            label: t('overview.wallets.referral'),
            balance: Number(user?.referral_wallet ?? 0),
            description: t('overview.wallets.referral_desc'),
            icon: Users,
            currency: "USDT",
            historyType: "referral",
          },
          {
            label: t('overview.wallets.generation'),
            balance: Number(user?.generation_wallet ?? 0),
            description: t('overview.wallets.generation_desc'),
            icon: TrendingUp,
            currency: "USDT",
            historyType: "generation",
          },
        ].map((wallet, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => handleWalletCardClick(wallet)}
            className={`p-5 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-300 ${
              wallet.historyType ? "cursor-pointer" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-cyan-600/20 flex items-center justify-center">
                <wallet.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex items-center gap-2">
                {wallet.currency === "OFA token" && isTimerRunning && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-semibold text-yellow-300"
                    title="Mining is active"
                  >
                    <Pickaxe className="h-3 w-3" />
                  </span>
                )}
                <div className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {wallet.currency}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-400 mb-1">{wallet.label}</div>
            <div className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              {wallet.currency === "USDT" ? (
                <>${wallet.balance.toFixed(2)}</>
              ) : (
                <>
                  <Coins className="w-5 h-5 text-blue-400" />
                  {wallet.balance.toFixed(7)}
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {wallet.hasInfo ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsTokenInfoOpen(true);
                  }}
                  className="text-cyan-300 hover:text-cyan-200 transition-colors"
                  aria-label={t('overview.wallets.openTokenInfo')}
                >
                  {wallet.description}
                </button>
              ) : wallet.historyType ? (
                  <span className="text-cyan-300">{t('overview.wallets.clickHistory')}</span>
              ) : (
                wallet.description
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Matching Bonus Wallet */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-purple-600/15 to-pink-600/10 backdrop-blur-xl border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 group relative overflow-hidden"
      >
        <div className="absolute -top-6 -right-6 w-16 h-16 bg-purple-500/10 rounded-full blur-xl"></div>
        <div className="relative flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center">
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {t('overview.wallets.matching')}
          </div>
        </div>
        <div className="text-xl md:text-2xl font-bold text-white mb-0.5">
          ${matchingBonus.toFixed(2)}
        </div>
        <div className="text-xs text-purple-300/70 mb-3">{t('overview.wallets.matching_desc')}</div>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); loadMatchingBonusHistory(); setWalletHistoryModal("matching"); }}
            className="flex-1 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-medium transition-all"
          >
            {t('overview.wallets.viewHistory')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setActivePage?.("matching-bonus-transfer"); }}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-white text-xs font-medium transition-all"
          >
            {t('overview.wallets.transfer')}
          </button>
        </div>
      </motion.div>

      {/* Token Information Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isTokenInfoOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 flex items-center justify-center"
                onClick={() => setIsTokenInfoOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  onClick={(event) => event.stopPropagation()}
                  className="w-full max-w-3xl rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#151d45] to-[#10183a] border border-white/10 p-4 sm:p-5 md:p-8 max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] overflow-y-auto"
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                      {t('overview.tokenInfo.title')}
                    </h3>
                    {/* <button
                      type="button"
                      onClick={() => setIsTokenInfoOpen(false)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:border-cyan-400/60 transition-colors flex items-center justify-center shrink-0"
                      aria-label="Close token information popup"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button> */}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 border-b border-white/10 pb-4 sm:pb-5">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">
                        {t('overview.tokenInfo.name')}
                      </div>
                      <div className="text-white font-semibold">
                        {t('overview.tokenInfo.nameVal')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">
                        {t('overview.tokenInfo.symbol')}
                      </div>
                      <div className="text-white font-semibold">{t('overview.tokenInfo.symbolVal')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t('overview.tokenInfo.network')}</div>
                      <div className="text-white font-semibold">
                        {t('overview.tokenInfo.networkVal')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">
                        {t('overview.tokenInfo.supply')}
                      </div>
                      <div className="text-white font-semibold">
                        {t('overview.tokenInfo.supplyVal')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-4 sm:pt-5 mb-5 sm:mb-6">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t('overview.tokenInfo.utility')}</div>
                      <div className="text-white">
                        {t('overview.tokenInfo.utilityVal')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">
                        {t('overview.tokenInfo.listed')}
                      </div>
                      <div className="text-white">
                        {t('overview.tokenInfo.listedVal')}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTokenInfoOpen(false)}
                    className="w-full sm:w-auto px-6 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:text-white hover:bg-cyan-500/30 transition-colors"
                  >
                    {t('overview.tokenInfo.close')}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Wallet History Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {walletHistoryModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 flex items-center justify-center"
                onClick={() => setWalletHistoryModal(null)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  onClick={(event) => event.stopPropagation()}
                  className="w-full max-w-5xl rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#151d45] to-[#10183a] border border-white/10 p-4 sm:p-5 md:p-8 max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] overflow-y-auto"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                      {walletHistoryModal === "deposit"
                        ? t('overview.historyTypes.deposit')
                        : walletHistoryModal === "withdrawal"
                          ? t('overview.historyTypes.withdrawal')
                          : walletHistoryModal === "referral"
                            ? t('overview.historyTypes.referral')
                            : walletHistoryModal === "matching"
                              ? t('overview.historyTypes.matching')
                              : t('overview.historyTypes.generation')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setWalletHistoryModal(null)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:border-cyan-400/60 transition-colors"
                    >
                      {t('overview.history.close')}
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="p-4 text-left text-sm text-gray-400">
                              {t('overview.history.date')}
                            </th>
                            <th className="p-4 text-left text-sm text-gray-400">
                              {t('overview.history.amount')}
                            </th>
                            {walletHistoryModal === "deposit" ? (
                              <>
                                <th className="p-4 text-left text-sm text-gray-400">
                                  {t('overview.history.network')}
                                </th>
                                <th className="p-4 text-left text-sm text-gray-400">
                                  {t('overview.history.txid')}
                                </th>
                              </>
                            ) : walletHistoryModal === "withdrawal" ? (
                              <>
                                <th className="p-4 text-left text-sm text-gray-400">
                                  {t('overview.history.sourceWallet')}
                                </th>
                                <th className="p-4 text-left text-sm text-gray-400">
                                  {t('overview.history.destination')}
                                </th>
                              </>
                            ) : walletHistoryModal === "matching" ? (
                              <>
                                <th className="p-4 text-left text-sm text-gray-400">
                                  {t('overview.history.rank')}
                                </th>
                                <th className="p-4 text-left text-sm text-gray-400">
                                  {t('overview.history.rate')}
                                </th>
                              </>
                            ) : (
                              <>
                                <th className="p-4 text-left text-sm text-gray-400">
                                  {t('overview.history.fromUser')}
                                </th>
                                <th className="p-4 text-left text-sm text-gray-400">
                                  {t('overview.history.level')}
                                </th>
                              </>
                            )}
                            <th className="p-4 text-left text-sm text-gray-400">
                              {t('overview.history.status')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyItems.length === 0 && (
                            <tr>
                              <td
                                colSpan="5"
                                className="p-6 text-center text-gray-400"
                              >
                                {t('overview.history.noHistory', { type: t(`overview.historyTypes.${walletHistoryModal}`) })}
                              </td>
                            </tr>
                          )}

                          {historyItems.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-white/5 hover:bg-white/5"
                            >
                              <td className="p-4 text-gray-400">
                                {formatDate(item.created_at)}
                              </td>
                              <td className="p-4 font-semibold text-white">
                                {walletHistoryModal === "matching"
                                  ? `+${parseFloat(item.bonus_amount || 0).toFixed(2)} USDT`
                                  : `${formatAmount(item.amount)} USDT`}
                              </td>

                              {walletHistoryModal === "deposit" ? (
                                <>
                                  <td className="p-4 text-gray-400">
                                    {item.network_name || "-"}
                                  </td>
                                  <td className="p-4 text-gray-400 font-mono text-xs">
                                    {item.txid || "-"}
                                  </td>
                                </>
                              ) : walletHistoryModal === "withdrawal" ? (
                                <>
                                  <td className="p-4 text-gray-400">
                                    {walletLabelMap[item.source_wallet] ||
                                      item.source_wallet ||
                                      "-"}
                                  </td>
                                  <td className="p-4 text-gray-400 font-mono text-xs break-all">
                                    {item.destination_address || "-"}
                                  </td>
                                </>
                              ) : walletHistoryModal === "matching" ? (
                                <>
                                  <td className="p-4 text-gray-400">
                                    {item.rank_name || `Rank #${item.rank_id}`}
                                  </td>
                                  <td className="p-4 text-gray-400">
                                    {parseFloat(item.bonus_percent || 0)}%
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-4 text-gray-400">
                                    {item.from_username || "-"}
                                  </td>
                                  <td className="p-4 text-gray-400">
                                    Level {item.level}
                                  </td>
                                </>
                              )}

                              <td className="p-4">
                                <span
                                  className={`rounded-full border px-2 py-1 text-xs ${
                                    walletHistoryModal === "deposit" ||
                                    walletHistoryModal === "withdrawal"
                                      ? getStatusColor(item.status)
                                      : "text-green-400 bg-green-500/10 border-green-500/30"
                                  }`}
                                >
                                  {walletHistoryModal === "deposit" ||
                                  walletHistoryModal === "withdrawal"
                                    ? item.status
                                    : t('overview.history.received')}
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
          document.body,
        )}

      {/* ARBX Description */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-3">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t('overview.ofaDesc.title')}
          </span>
        </h3>
        <p className="text-gray-300 mb-3">
          {t('overview.ofaDesc.body', { balance: Number(user.arbx_wallet).toFixed(7) })}
        </p>
        <p className="text-gray-300">
          {t('overview.ofaDesc.convert')}{" "}
          {t('overview.ofaDesc.external')}{" "}
          <span className="text-cyan-400 font-semibold">
            {t('overview.ofaDesc.grow')}
          </span>
        </p>
      </motion.div>

      {/* ── Network Analytics ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 md:p-6"
      >
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          {t('overview.networkAnalytics.title')}
        </h2>
        {networkAnalyticsLoading ? (
          <div className="text-gray-400 text-sm">{t('overview.networkAnalytics.loading')}</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/30 text-center">
              <div className="text-xl md:text-2xl font-bold text-cyan-400">{networkAnalytics.totalNetworkMembers}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5">{t('overview.networkAnalytics.total')}</div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-600/10 to-emerald-600/10 border border-green-500/30 text-center">
              <div className="text-xl md:text-2xl font-bold text-green-400">{networkAnalytics.activeMembers}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5">{t('overview.networkAnalytics.active')}</div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-600/10 to-orange-600/10 border border-amber-500/30 text-center">
              <div className="text-xl md:text-2xl font-bold text-amber-400">{networkAnalytics.inactiveMembers}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5">{t('overview.networkAnalytics.inactive')}</div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Level Performance ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 md:p-6"
      >
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          {t('overview.teamPerformance.title')}
        </h2>

        {referralLevels.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-cyan-600/15 to-blue-600/10 border border-cyan-500/20 flex items-center justify-between">
            <span className="text-sm text-gray-300">{t('overview.teamPerformance.netEarnings')}</span>
            <span className="text-xl font-bold text-white">
              ${referralLevels.reduce((sum, lvl) => sum + (lvl.totalEarnings || 0), 0).toFixed(2)}
            </span>
          </div>
        )}

        {referralLevels.length === 0 ? (
          <div className="text-gray-400 text-sm">{t('overview.teamPerformance.loading')}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {referralLevels.map((lvl) => {
              const colors = [
                { bg: "from-blue-600/15 to-cyan-600/10", border: "border-blue-500/30", text: "text-blue-400" },
                { bg: "from-cyan-600/15 to-teal-600/10", border: "border-cyan-500/30", text: "text-cyan-400" },
                { bg: "from-purple-600/15 to-violet-600/10", border: "border-purple-500/30", text: "text-purple-400" },
                { bg: "from-pink-600/15 to-rose-600/10", border: "border-pink-500/30", text: "text-pink-400" },
                { bg: "from-amber-600/15 to-orange-600/10", border: "border-amber-500/30", text: "text-amber-400" },
              ][lvl.level - 1] || colors[0];
              return (
                <div
                  key={lvl.level}
                  onClick={() => setActivePage("referral")}
                  className={`p-3 md:p-4 rounded-xl bg-gradient-to-br ${colors.bg} backdrop-blur-xl border ${colors.border} cursor-pointer hover:scale-105 transition-all duration-300 text-center`}
                >
                  <div className={`text-xs font-semibold ${colors.text} mb-1`}>{t('overview.teamPerformance.level', { level: lvl.level })}</div>
                  <div className={`text-sm font-bold ${colors.text}`}>{lvl.commissionRate}</div>
                  <div className="text-white text-xs mt-1">${lvl.totalEarnings.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ARBX Mining Wallet */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-600/20 to-orange-600/20 flex items-center justify-center">
              <Pickaxe className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {t('overview.mining.title')}
              </h3>
              <div className="text-2xl font-bold text-yellow-400 font-mono tracking-wider">
                {isMiningActive && simulatedMiningBalance !== null
                  ? (() => {
                      const s = simulatedMiningBalance.toFixed(7);
                      return <>{s.slice(0, -3)}<span className="text-yellow-300/70 animate-pulse">{s.slice(-3)}</span></>;
                    })()
                  : Number(user.arbx_mining_wallet).toFixed(7)}{" "}
                <span className="text-sm font-sans">OFA token</span>
              </div>
              <div className="text-sm text-gray-400">
                {isTimerRunning && remainingTime !== null
                  ? t('overview.mining.remaining', { time: formatTime(remainingTime) })
                  : canClaim
                    ? t('overview.mining.complete')
                    : t('overview.mining.continuous')}
              </div>
            </div>
          </div>
          <button
            onClick={
              !isMiningActive
                ? handleStartMining
                : canClaim
                  ? handleClaimMining
                  : null
            }
            disabled={isMiningActionLoading || isTimerRunning}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${
              isMiningActionLoading || isTimerRunning
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-yellow-600 to-orange-600"
            }`}
          >
            <Pickaxe className="w-5 h-5" />

            {!isMiningActive &&
              (isMiningActionLoading ? t('overview.mining.starting') : t('overview.mining.start'))}

            {isTimerRunning && formatTime(remainingTime)}

            {canClaim &&
              (isMiningActionLoading ? t('overview.mining.claiming') : t('overview.mining.claim'))}
          </button>
        </div>
        {miningActionError && (
          <p className="mt-3 text-sm text-red-400">{miningActionError}</p>
        )}
      </motion.div>

      {/* Mining Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-gradient-to-r from-yellow-600/10 via-orange-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-6"
      >
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Pickaxe className="w-5 h-5 text-yellow-400" />
          {t('overview.mining.howTitle')}
        </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="space-y-2">
              <p>{t('overview.mining.step1')}</p>
              <p>{t('overview.mining.step2')}</p>
              <p>{t('overview.mining.step3')}</p>
            </div>
            <div className="space-y-2">
              <p>{t('overview.mining.step4')}</p>
              <p>{t('overview.mining.step5')}</p>
              <p>{t('overview.mining.step6')}</p>
            </div>
          </div>
      </motion.div>

      {/* Global Live Activity Feed */}
      <LiveActivityFeed />
    </div>
  );
};

export default OverviewPage;
