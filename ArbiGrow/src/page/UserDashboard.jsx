import { useState, useEffect, Suspense, startTransition } from "react";
import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet, TrendingUp, TrendingDown, Search, Filter,
  ChevronLeft, ChevronRight, ChevronDown, DollarSign,
  Package, FileText, ShieldCheck, Users, UserCircle,
  Download, Upload, Home, X, Menu, Keyboard, Eye, Lock,
  Copy, Check, Link as LinkIcon, GitBranch, Trophy, Star,
  Award, MessageCircle, ShoppingCart, Store, ArrowLeftRight,
  Repeat, LogOut, Building2,
} from "lucide-react";
import arbxCardImg from "../assets/Card-design.png";
import Logo from "../assets/oxford.png";
import USDTRain from "../component/USDTRain.jsx";
import { mockMarketPrices, mockUserData } from "../constants/mockdata.js";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore.js";
import {
  getReferralNetwork, getMyDeposits, getMyWithdrawals,
  getMyEarningsHistory, getMyProfitHistory, getActiveAnnouncement,
  getTransferHistory, getMyInvestments, getMyMatchingBonuses,
  getMyCaptchaEarnings, getMyMiningHistory, getMyAdViewHistory,
  getMyInvoiceHistory, getVendorWithdraws, getEcommerceWalletTransactions,
  getMyWalletTransactions, refreshUserStore,
} from "../api/user.api.js";

const LazyReferralPage = React.lazy(() => import("../component/user/ReferralPage.jsx"));
const LazyReferralBonusHistory = React.lazy(() => import("../component/user/ReferralBonusHistory.jsx"));
const LazyGenerationBonusHistory = React.lazy(() => import("../component/user/GenerationBonusHistory.jsx"));
const LazyMatchingBonusInfo = React.lazy(() => import("../component/user/MatchingBonusInfo.jsx"));
const LazyBankingSetup = React.lazy(() => import("../component/user/BankingSetup.jsx"));
const LazyVerificationPage = React.lazy(() => import("./VerificationPage.jsx"));
const LazyVerificationPending = React.lazy(() => import("./VerificationPending.jsx"));
const LazyProfilePage = React.lazy(() => import("../component/user/ProfilePage.jsx"));
const LazyTransactionHistoryPage = React.lazy(() => import("../component/user/TransactionHistoryPage.jsx"));
const LazyLedgerPage = React.lazy(() => import("../component/user/LedgerPage.jsx"));
const LazyWalletLedgerPage = React.lazy(() => import("../component/user/WalletLedgerPage.jsx"));
const LazyDepositPage = React.lazy(() => import("../component/user/DepositUSDT.jsx"));
const LazyWithdrawPage = React.lazy(() => import("../component/user/WithdrawUSDT.jsx"));
const LazyMyInvestments = React.lazy(() => import("../component/user/MyInvestments.jsx").then(m => ({ default: m.MyInvestments })));
const LazyDailyTasks = React.lazy(() => import("../component/user/DailyTasks.jsx"));
const LazyAdsView = React.lazy(() => import("../component/user/AdsView.jsx"));
const LazyTierSection = React.lazy(() => import("../component/package/TierSection.jsx"));
const LazyPackageModal = React.lazy(() => import("../component/package/PackageModal.jsx"));
const LazyMarket = React.lazy(() => import("../component/user/Market.jsx").then(m => ({ default: m.Market })));
const LazyMarketplacePage = React.lazy(() => import("../component/user/MarketplacePage.jsx"));
const LazySellerDashboard = React.lazy(() => import("../component/user/SellerDashboard.jsx"));
const LazyInvoicePage = React.lazy(() => import("../component/user/InvoicePage.jsx"));
const LazyWalletTransfer = React.lazy(() => import("../component/user/WalletTransfer.jsx"));
const LazyConvertOFA = React.lazy(() => import("../component/user/ConvertOFA.jsx"));
const LazySendFunds = React.lazy(() => import("../component/user/SendFunds.jsx"));
const LazyMatchingBonusTransfer = React.lazy(() => import("../component/user/MatchingBonusTransfer.jsx"));
const LazyTransferHistory = React.lazy(() => import("../component/user/TransferHistory.jsx"));
const LazyOverviewPage = React.lazy(() => import("../component/user/OverviewPage.jsx"));
const LazyAnnouncementModal = React.lazy(() => import("../component/user/AnnouncementModal.jsx").then(m => ({ default: m.AnnouncementModal })));
const LazyWhatsAppButton = React.lazy(() => import("../component/user/WhatsAppButton.jsx"));
const LazyShareReferralButton = React.lazy(() => import("../component/user/ShareReferralButton.jsx"));

const UserLoading = () => (
  <div className="flex items-center justify-center p-8 min-h-[400px]">
    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
  </div>
);
// Mock data for market prices

const EMPTY_REFERRAL_LEVELS = [
  { level: 1, commissionRate: "10%", totalEarnings: 0, users: [] },
  { level: 2, commissionRate: "9%", totalEarnings: 0, users: [] },
  { level: 3, commissionRate: "8%", totalEarnings: 0, users: [] },
  { level: 4, commissionRate: "7%", totalEarnings: 0, users: [] },
  { level: 5, commissionRate: "5%", totalEarnings: 0, users: [] },
];
const HOLD_ALLOWED_PAGES = new Set([
  "overview",
  "deposit",
  "invoices",
  "profile",
  "terms",
  "privacy",
]);

export function UserDashboard() {
  const { t } = useTranslation();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [investmentsRefreshKey, setInvestmentsRefreshKey] = useState(0);
  const [activePage, setActivePage] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCoinRain, setShowCoinRain] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedReferralLevel, setSelectedReferralLevel] = useState(1);
  const [referralLevels, setReferralLevels] = useState(EMPTY_REFERRAL_LEVELS);
  const [referralTotals, setReferralTotals] = useState({
    totalReferrals: 0,
    totalActiveReferrals: 0,
  });
  //  const [user, setuUsers] = useState();
  const navigate = useNavigate();
  const transactionsPerPage = 50;
  const { user } = useUserStore();
  const { logout, setUser } = useUserStore();
  const isAccountOnHold =
    String(user?.account_status || "").toLowerCase() === "on_hold";

  useEffect(() => {
    // console.log("userrr", user);
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadActiveAnnouncement = async () => {
      if (!user?.id) return;

      try {
        const response = await getActiveAnnouncement();
        const nextAnnouncement = response?.data?.data || null;
        if (!isMounted) return;

        setActiveAnnouncement(nextAnnouncement);
        if (!nextAnnouncement) {
          setIsAnnouncementOpen(false);
          return;
        }
        setIsAnnouncementOpen(true);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load active announcement:", error);
      }
    };

    loadActiveAnnouncement();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await refreshUserStore();
        if (res?.data?.user) setUser(res.data.user);
      } catch {
        // ignore
      }
    }, 30000);
    return () => clearInterval(poll);
  }, [setUser]);

  const handleCloseAnnouncement = () => {
    setIsAnnouncementOpen(false);
  };

  useEffect(() => {
    if (isAccountOnHold && !HOLD_ALLOWED_PAGES.has(activePage)) {
      setActivePage("deposit");
    }
  }, [activePage, isAccountOnHold]);

  const safeSetActivePage = (pageId) => {
    if (isAccountOnHold && !HOLD_ALLOWED_PAGES.has(pageId)) {
      return;
    }
    startTransition(() => {
      setActivePage(pageId);
    });
  };

  useEffect(() => {
    const loadReferralNetwork = async () => {
      try {
        const res = await getReferralNetwork();
        const payload = res?.data || {};
        const levelsFromApi = Array.isArray(payload.levels)
          ? payload.levels
          : [];

        const mappedByLevel = levelsFromApi.reduce((acc, levelRow) => {
          const levelNo = Number(levelRow.level);
          acc[levelNo] = {
            level: levelNo,
            commissionRate: levelRow.commission_rate || `${levelNo}%`,
            totalEarnings: Number(levelRow.total_earnings || 0),
            users: Array.isArray(levelRow.users)
              ? levelRow.users.map((member) => ({
                  id: `l${levelNo}-${member.id}`,
                  name: member.name,
                  username: member.username,
                  level: Number(member.level || levelNo),
                  joinDate: member.join_date || "-",
                  totalEarnings: Number(member.total_earnings || 0),
                  referredBy: member.referred_by || "",
                  directReferrals: Number(member.direct_referrals || 0),
                  status: member.status || "",
                }))
              : [],
          };
          return acc;
        }, {});

        const normalizedLevels = [1, 2, 3, 4, 5].map(
          (levelNo) =>
            mappedByLevel[levelNo] || EMPTY_REFERRAL_LEVELS[levelNo - 1],
        );

        setReferralLevels(normalizedLevels);
        setReferralTotals({
          totalReferrals: Number(payload.total_referrals || 0),
          totalActiveReferrals: Number(payload.total_active_referrals || 0),
          totalTeamMembers: Number(payload.total_team_members || 0),
          bonusEligibleMembers: Number(payload.bonus_eligible_members || 0),
          nonBonusMembers: Number(payload.non_bonus_members || 0),
        });
      } catch (error) {
        setReferralLevels(EMPTY_REFERRAL_LEVELS);
        setReferralTotals({
          totalReferrals: 0,
          totalActiveReferrals: 0,
        });
      }
    };

    if (activePage === "referral") {
      loadReferralNetwork();
    }
  }, [activePage]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ── Transaction helpers ──────────────────────────────────────
  const _fmtAmount = (
    val,
    { minimumFractionDigits = 2, maximumFractionDigits = 2 } = {},
  ) => {
    const amount = Number(val ?? 0);
    if (Number.isNaN(amount)) return "0.00";

    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  };
  const _fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "-");
  const _fmtWallet = (key) =>
    (key || "")
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const _hash36 = (value, length = 6) => {
    const seed = String(value ?? "");
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36).toUpperCase().padStart(length, "0").slice(-length);
  };
  const _genTransactionId = (prefix, nativeId, createdAt, extra = "") => {
    const timePart = Number.isFinite(new Date(createdAt).getTime())
      ? new Date(createdAt).getTime().toString(36).toUpperCase().slice(-6)
      : _hash36(createdAt, 6);
    const idPart = _hash36(`${prefix}-${nativeId}`, 5);
    const randomPart = _hash36(`${nativeId}|${createdAt}|${extra}|OXFORDADS`, 6);
    return `TXN-${prefix}-${timePart}${idPart}${randomPart}`;
  };
  const _mapStatus = (s) => {
    const v = (s || "").toLowerCase();
    if (v === "active") return "Active";
    if (v === "approved" || v === "completed") return "Completed";
    if (v === "rejected" || v === "failed") return "Rejected";
    if (v === "processing") return "Processing";
    return "Pending";
  };
  const _normalizeTransactions = (deps, wdws, pfts, transfers, investments, invoices, vendor_withdraws, ecom_txs, wallet_txs) => {
    const rows = [];
    deps.forEach((d) =>
      rows.push({
        id: `dep_${d.id}`,
        transactionId: _genTransactionId("DEP", d.id, d.created_at, d.txid),
        date: _fmtDate(d.created_at),
        type: "Deposit",
        typeLabel: t("dashboard.type_deposit"),
        wallet: "Deposit Wallet",
        walletLabel: t("dashboard.wallet_deposit"),
        amount: _fmtAmount(d.amount),
        amountDirection: "credit",
        currency: "USDT",
        status: _mapStatus(d.status),
        statusLabel: t("dashboard.status_" + _mapStatus(d.status).toLowerCase()),
        _ts: new Date(d.created_at).getTime(),
      }),
    );
    wdws.forEach((w) =>
      rows.push({
        id: `wdw_${w.id}`,
        transactionId: _genTransactionId(
          "WDW",
          w.id,
          w.created_at,
          w.destination_address,
        ),
        date: _fmtDate(w.created_at),
        type: "Withdrawal",
        typeLabel: t("dashboard.type_withdrawal"),
        wallet: _fmtWallet(w.source_wallet),
        walletLabel: t("dashboard.wallet_" + (w.source_wallet || "main").split("_")[0]),
        amount: _fmtAmount(w.amount),
        amountDirection: "debit",
        currency: "USDT",
        status: _mapStatus(w.status),
        statusLabel: t("dashboard.status_" + _mapStatus(w.status).toLowerCase()),
        _ts: new Date(w.created_at).getTime(),
      }),
    );
    pfts.forEach((p) =>
      rows.push({
        id: `pft_${p.id}`,
        transactionId: _genTransactionId(
          "PFT",
          p.id,
          p.created_at,
          p.package_name,
        ),
        date: _fmtDate(p.created_at),
        type: "Profit Credit",
        typeLabel: t("dashboard.type_profit_credit"),
        wallet: "Main Wallet",
        walletLabel: t("dashboard.wallet_main"),
        amount: _fmtAmount(p.amount, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 14,
        }),
        amountDirection: "credit",
        currency: "USDT",
        status: "Completed",
        statusLabel: t("dashboard.status_completed"),
        _ts: new Date(p.created_at).getTime(),
      }),
    );
    (transfers?.sent || []).forEach((trf) =>
      rows.push({
        id: `trf_s_${trf.id}`,
        transactionId: _genTransactionId("TRF", trf.id, trf.created_at, "sent"),
        date: _fmtDate(trf.created_at),
        type: `Transfer to @${trf.receiver_name || "user"}`,
        typeLabel: t("transactions.filter_transfer"),
        wallet: "Main Wallet",
        walletLabel: t("dashboard.wallet_main"),
        amount: _fmtAmount(trf.amount),
        amountDirection: "debit",
        currency: "USDT",
        status: _mapStatus(trf.status),
        statusLabel: t("dashboard.status_" + _mapStatus(trf.status).toLowerCase()),
        _ts: new Date(trf.created_at).getTime(),
      }),
    );
    (transfers?.received || []).forEach((trf) =>
      rows.push({
        id: `trf_r_${trf.id}`,
        transactionId: _genTransactionId("TRF", trf.id, trf.created_at, "recv"),
        date: _fmtDate(trf.created_at),
        type: `Transfer from @${trf.sender_name || "user"}`,
        typeLabel: t("transactions.filter_transfer"),
        wallet: "Main Wallet",
        walletLabel: t("dashboard.wallet_main"),
        amount: _fmtAmount(trf.amount),
        amountDirection: "credit",
        currency: "USDT",
        status: _mapStatus(trf.status),
        statusLabel: t("dashboard.status_" + _mapStatus(trf.status).toLowerCase()),
        _ts: new Date(trf.created_at).getTime(),
      }),
    );
    investments.forEach((inv) => {
      const mapped = _mapStatus(inv.status);
      rows.push({
        id: `inv_${inv.id}`,
        transactionId: _genTransactionId("INV", inv.id, inv.created_at, inv.package_name),
        date: _fmtDate(inv.created_at),
        type: "Investment",
        typeLabel: t("dashboard.type_investment"),
        wallet: "Main Wallet",
        walletLabel: t("dashboard.wallet_main"),
        amount: _fmtAmount(inv.invested_amount),
        amountDirection: "debit",
        currency: "USDT",
        status: mapped,
        statusLabel: t(`dashboard.status_${mapped.toLowerCase()}`, mapped),
        _ts: new Date(inv.created_at).getTime(),
      });
    });
    invoices.forEach((inv) =>
      rows.push({
        id: `inv_${inv.id}`,
        transactionId: inv.transaction_id || _genTransactionId("INV", inv.id, inv.created_at, inv.invoice_number),
        date: _fmtDate(inv.created_at),
        type: `Invoice (${inv.invoice_type})`,
        typeLabel: t("dashboard.type_invoice"),
        wallet: "-",
        walletLabel: "-",
        amount: inv.amount ? _fmtAmount(inv.amount) : "-",
        amountDirection: "-",
        currency: inv.currency || "USDT",
        status: _mapStatus(inv.status),
        statusLabel: t("dashboard.status_" + _mapStatus(inv.status).toLowerCase()),
        _ts: new Date(inv.created_at).getTime(),
      }),
    );
    vendor_withdraws.forEach((vw) =>
      rows.push({
        id: `vw_${vw.id}`,
        transactionId: _genTransactionId("VW", vw.id, vw.created_at, ""),
        date: _fmtDate(vw.created_at),
        type: "Vendor Withdraw",
        typeLabel: t("dashboard.type_vendor_withdraw"),
        wallet: "Ecommerce Wallet",
        walletLabel: t("dashboard.wallet_ecommerce"),
        amount: _fmtAmount(vw.amount),
        amountDirection: "debit",
        currency: "USDT",
        status: _mapStatus(vw.status),
        statusLabel: t("dashboard.status_" + _mapStatus(vw.status).toLowerCase()),
        _ts: new Date(vw.created_at).getTime(),
      }),
    );
    ecom_txs.forEach((tx) =>
      rows.push({
        id: `ecom_${tx.id}`,
        transactionId: _genTransactionId("ECOM", tx.id, tx.created_at, tx.type),
        date: _fmtDate(tx.created_at),
        type: tx.type === "credit" ? "Ecommerce Credit" : "Ecommerce Debit",
        typeLabel: t("dashboard.type_ecommerce"),
        wallet: "Ecommerce Wallet",
        walletLabel: t("dashboard.wallet_ecommerce"),
        amount: _fmtAmount(tx.amount),
        amountDirection: tx.type === "credit" ? "credit" : "debit",
        currency: "USDT",
        status: "Completed",
        statusLabel: t("dashboard.status_completed"),
        _ts: new Date(tx.created_at).getTime(),
      }),
    );
    wallet_txs.forEach((wtx) => {
      const isRefund =
        wtx.type === "kyc_fee_refund" || wtx.type === "kyc_fee_reset_refund";
      if (!isRefund && wtx.type !== "kyc_fee_hold") return;
      rows.push({
        id: `kyt_${wtx.id}`,
        transactionId: _genTransactionId("KYC", wtx.id, wtx.created_at, wtx.type),
        date: _fmtDate(wtx.created_at),
        type: isRefund ? "KYC Refund" : "KYC Fee",
        typeLabel: isRefund
          ? t("dashboard.type_kyc_refund")
          : t("dashboard.type_kyc_fee"),
        wallet: "Deposit Wallet",
        walletLabel: t("dashboard.wallet_deposit"),
        amount: _fmtAmount(wtx.amount),
        amountDirection: isRefund ? "credit" : "debit",
        currency: wtx.currency || "USDT",
        status: "Completed",
        statusLabel: t("dashboard.status_completed"),
        _ts: new Date(wtx.created_at).getTime(),
      });
    });
    return rows.sort((a, b) => b._ts - a._ts);
  };

  const _safeFetch = (fn, fallback) =>
    fn().then((r) => r).catch(() => ({ data: fallback }));

  useEffect(() => {
    if (activePage !== "transactions" || transactionsLoaded) return;
    const load = async () => {
      setTransactionsLoading(true);
      try {
        const [depRes, wdwRes, pftRes, trfRes, invRes, bonusRes, captchaRes, mineRes, adRes, invoiceRes, vendorRes, ecomRes, wtxRes] = await Promise.all([
          _safeFetch(getMyDeposits, { data: [] }),
          _safeFetch(getMyWithdrawals, { data: [] }),
          _safeFetch(getMyProfitHistory, { data: [] }),
          _safeFetch(getTransferHistory, {}),
          _safeFetch(getMyInvestments, []),
          _safeFetch(getMyMatchingBonuses, []),
          _safeFetch(getMyCaptchaEarnings, { data: [] }),
          _safeFetch(getMyMiningHistory, { data: [] }),
          _safeFetch(getMyAdViewHistory, { data: [] }),
          _safeFetch(getMyInvoiceHistory, { data: { invoices: [] } }),
          _safeFetch(getVendorWithdraws, { data: { withdraws: [] } }),
          _safeFetch(getEcommerceWalletTransactions, { data: [] }),
          _safeFetch(getMyWalletTransactions, { data: [] }),
        ]);
        const _arr = (v) => (Array.isArray(v) ? v : []);
        const deps = depRes?.data?.data;
        const wdws = wdwRes?.data?.data;
        const pfts = pftRes?.data?.data;
        const transfers = trfRes?.data || {};
        const investments = invRes?.data;
        const matching_bonuses = bonusRes?.data;
        const captcha_earnings = captchaRes?.data?.data;
        const mining_logs = mineRes?.data?.data;
        const ad_views = adRes?.data?.data;
        const invoices = invoiceRes?.data?.invoices;
        const vendor_withdraws = vendorRes?.data?.withdraws;
        const ecom_txs = ecomRes?.data?.data;
        const wallet_txs = wtxRes?.data?.data;
        setTransactions(_normalizeTransactions(
          _arr(deps), _arr(wdws), _arr(pfts),
          transfers && typeof transfers === "object" ? transfers : {},
          _arr(investments), _arr(invoices), _arr(vendor_withdraws), _arr(ecom_txs), _arr(wallet_txs),
        ));
        setTransactionsLoaded(true);
      } catch (err) {
        console.error("Transactions load failed", err);
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };
    load();
  }, [activePage, transactionsLoaded]);

  const userPages = [
    {
      id: "overview",
      label: t("userDashboard.sidebar.overview"),
      icon: Home,
      description: t("userDashboard.sidebar.overview_desc"),
    },
    {
      id: "deposit",
      label: t("userDashboard.sidebar.deposit"),
      icon: Download,
      description: t("userDashboard.sidebar.deposit_desc"),
    },
    {
      id: "invoices",
      label: t("userDashboard.sidebar.invoices"),
      icon: FileText,
      description: t("userDashboard.sidebar.invoices_desc"),
    },
    {
      id: "packages",
      label: t("userDashboard.sidebar.packages"),
      icon: Package,
      description: t("userDashboard.sidebar.packages_desc"),
    },
    {
      id: "investments",
      label: t("userDashboard.sidebar.investments"),
      icon: TrendingUp,
      description: t("userDashboard.sidebar.investments_desc"),
    },
    {
      id: "tasks",
      label: t("userDashboard.sidebar.captcha"),
      icon: Keyboard,
    },
    {
      id: "ads",
      label: t("userDashboard.sidebar.adView"),
      icon: Eye,
      description: t("userDashboard.sidebar.adView_desc"),
    },
    {
      id: "withdraw",
      label: t("userDashboard.sidebar.withdraw"),
      icon: Upload,
      description: t("userDashboard.sidebar.withdraw_desc"),
    },
    {
      id: "transactions",
      label: t("userDashboard.sidebar.transactions"),
      icon: FileText,
      description: t("userDashboard.sidebar.transactions_desc"),
    },
    {
      id: "earning_history",
      label: t("userDashboard.sidebar.earningHistory"),
      icon: TrendingUp,
      description: t("userDashboard.sidebar.earningHistory_desc"),
    },
    {
      id: "wallet_ledger",
      label: t("userDashboard.sidebar.ledger"),
      icon: Wallet,
      description: t("userDashboard.sidebar.ledger_desc"),
    },
    {
      id: "referral",
      label: t("userDashboard.sidebar.referral"),
      icon: Users,
      description: t("userDashboard.sidebar.referral_desc"),
    },
    {
      id: "referral-bonuses",
      label: t("userDashboard.sidebar.referralBonuses"),
      icon: Users,
      description: t("userDashboard.sidebar.referralBonuses_desc"),
    },
    {
      id: "generation-bonuses",
      label: t("userDashboard.sidebar.genBonuses"),
      icon: GitBranch,
      description: t("userDashboard.sidebar.genBonuses_desc"),
    },
    ...(user?.kyc_status === "approved"
      ? [{
          id: "matching-bonus",
          label: t("userDashboard.sidebar.matchingBonus"),
          icon: Trophy,
          description: t("userDashboard.sidebar.matchingBonus_desc"),
        }]
      : []),
    {
      id: "transfer",
      label: t("userDashboard.sidebar.walletTransfer"),
      icon: ArrowLeftRight,
      description: t("userDashboard.sidebar.walletTransfer_desc"),
    },
    {
      id: "convert",
      label: t("userDashboard.sidebar.convertOFA"),
      icon: Repeat,
      description: t("userDashboard.sidebar.convertOFA_desc"),
    },
    {
      id: "market",
      label: t("userDashboard.sidebar.market"),
      icon: TrendingUp,
      description: t("userDashboard.sidebar.market_desc"),
    },
    {
      id: "marketplace",
      label: t("userDashboard.sidebar.marketplace"),
      icon: ShoppingCart,
      description: t("userDashboard.sidebar.marketplace_desc"),
    },
    {
      id: "seller",
      label: t("userDashboard.sidebar.seller"),
      icon: Store,
      description: t("userDashboard.sidebar.seller_desc"),
    },
    {
      id: "banking",
      label: t("userDashboard.sidebar.banking"),
      icon: Building2,
      description: t("userDashboard.sidebar.banking_desc"),
    },
    {
      id: "kyc",
      label: t("userDashboard.sidebar.kyc"),
      icon: ShieldCheck,
      description: t("userDashboard.sidebar.kyc_desc"),
    },
    {
      id: "profile",
      label: t("userDashboard.sidebar.profile"),
      icon: UserCircle,
      description: t("userDashboard.sidebar.profile_desc"),
    },
    {
      id: "terms",
      label: t("userDashboard.sidebar.terms"),
      icon: FileText,
      description: t("userDashboard.sidebar.terms_desc"),
    },
    {
      id: "privacy",
      label: t("userDashboard.sidebar.privacy"),
      icon: Lock,
      description: t("userDashboard.sidebar.privacy_desc"),
    },
  ];

  // Filter transactions
  const filteredTransactions =
    transactionFilter === "All"
      ? transactions
      : transactions.filter((t) =>
          t.type.toLowerCase().includes(transactionFilter.toLowerCase()),
        );

  // Pagination
  const totalPages = Math.ceil(
    filteredTransactions.length / transactionsPerPage,
  );
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "Pending":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "Processing":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "Rejected":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const handleCopyLink = () => {
    const copiedLink = `${import.meta.env.VITE_FRONTEND_URL}/register?ref_code=${user.username}`;
    navigator.clipboard.writeText(copiedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ── Referral helpers ──────────────────────────────────────────
  const totalReferrals =
    referralTotals.totalReferrals ||
    referralLevels.reduce((s, l) => s + l.users.length, 0);
  const totalActiveReferrals = referralTotals.totalActiveReferrals;

  const levelColors = {
    1: {
      bg: "from-blue-600/15 to-cyan-600/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      dot: "bg-blue-500",
    },
    2: {
      bg: "from-cyan-600/15 to-teal-600/10",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      dot: "bg-cyan-500",
    },
    3: {
      bg: "from-purple-600/15 to-violet-600/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      dot: "bg-purple-500",
    },
    4: {
      bg: "from-pink-600/15 to-rose-600/10",
      border: "border-pink-500/30",
      text: "text-pink-400",
      dot: "bg-pink-500",
    },
    5: {
      bg: "from-amber-600/15 to-orange-600/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      dot: "bg-amber-500",
    },
  };

  const renderPageContent = () => {
    // Referral Page
    if (activePage === "referral") {
      const activeLevel =
        referralLevels.find((l) => l.level === selectedReferralLevel) ||
        EMPTY_REFERRAL_LEVELS[0];
      const lc = levelColors[selectedReferralLevel];

      return (
        <LazyReferralPage
          totalReferrals={totalReferrals}
          fixedReferralData={referralLevels}
          levelColors={levelColors}
          selectedReferralLevel={selectedReferralLevel}
          setSelectedReferralLevel={setSelectedReferralLevel}
          handleCopyLink={handleCopyLink}
          copiedLink={copiedLink}
          activeLevel={activeLevel}
          lc={lc}
          totalTeamMembers={referralTotals.totalTeamMembers}
          bonusEligibleMembers={referralTotals.bonusEligibleMembers}
          nonBonusMembers={referralTotals.nonBonusMembers}
        />
      );
    }

    if (activePage === "referral-bonuses") {
      return <LazyReferralBonusHistory setActivePage={safeSetActivePage} />;
    }

    if (activePage === "generation-bonuses") {
      return <LazyGenerationBonusHistory setActivePage={safeSetActivePage} />;
    }

    if (activePage === "matching-bonus") {
      return <LazyMatchingBonusInfo setActivePage={safeSetActivePage} />;
    }

    if (activePage === "banking") {
      return <LazyBankingSetup />;
    }

    if (activePage === "kyc") {
      return <LazyVerificationPage embedded onSuccess={() => safeSetActivePage("kyc-pending")} />;
    }

    if (activePage === "kyc-pending") {
      return (
        <div className="p-4 md:p-6">
          <LazyVerificationPending embedded onEdit={() => safeSetActivePage("kyc")} />
        </div>
      );
    }

    // Profile Page
    if (activePage === "profile") {
      return <LazyProfilePage mockUserData={mockUserData} />;
    }
    if (activePage === "transactions") {
      return (
        <LazyTransactionHistoryPage
          currentTransactions={currentTransactions}
          transactionFilter={transactionFilter}
          setTransactionFilter={setTransactionFilter}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          filteredTransactions={filteredTransactions}
          startIndex={startIndex}
          endIndex={endIndex}
          getStatusColor={getStatusColor}
          isLoading={transactionsLoading}
        />
      );
    }
    if (activePage === "earning_history") {
      return <LazyLedgerPage setActivePage={safeSetActivePage} earningOnly />;
    }
    if (activePage === "wallet_ledger") {
      return <LazyWalletLedgerPage setActivePage={safeSetActivePage} />;
    }
    if (activePage === "deposit") {
      return <LazyDepositPage />;
    }
    if (activePage === "withdraw") {
      return <LazyWithdrawPage />;
    }
    //investment
    if (activePage === "investments") {
      return (
        <LazyMyInvestments
          refreshKey={investmentsRefreshKey}
          onNavigateToPackages={() => safeSetActivePage("packages")}
        />
      );
    }
    //tasks
    if (activePage === "tasks") {
      return <LazyDailyTasks />;
    }
    if (activePage === "ads") {
      return <LazyAdsView />;
    }
    //packege moddal
    if (activePage === "packages") {
      return (
        <>
          <LazyTierSection onSelect={setSelectedPackage} />

          <LazyPackageModal
            selectedPackage={selectedPackage}
            setSelectedPackage={setSelectedPackage}
            onPurchased={() => {
              setInvestmentsRefreshKey((prev) => prev + 1);
              safeSetActivePage("investments");
            }}
          />
        </>
      );
    }
    // market page
    if (activePage === "market") {
      return <LazyMarket />;
    }

    if (activePage === "marketplace") {
      return <LazyMarketplacePage />;
    }

    if (activePage === "seller") {
      return <LazySellerDashboard />;
    }

    if (activePage === "invoices") {
      return <LazyInvoicePage />;
    }

    if (activePage === "transfer") {
      return <LazyWalletTransfer />;
    }

    if (activePage === "convert") {
      return <LazyConvertOFA />;
    }

    if (activePage === "send-funds") {
      return <LazySendFunds setActivePage={setActivePage} />;
    }

    if (activePage === "matching-bonus-transfer") {
      return <LazyMatchingBonusTransfer setActivePage={setActivePage} />;
    }

    if (activePage === "transfer-history") {
      return <LazyTransferHistory setActivePage={setActivePage} />;
    }

    if (activePage !== "overview") {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("userDashboard.comingSoon")}</h2>
            <p className="text-gray-400">{t("userDashboard.inDevelopment")}</p>
          </div>
        </div>
      );
    }

    if (activePage === "overview") {
      return (
        <Suspense fallback={<UserLoading />}><LazyOverviewPage
          mockUserData={mockUserData}
          mockMarketPrices={mockMarketPrices}
          arbxCardImg={arbxCardImg}
          transactionFilter={transactionFilter}
          setTransactionFilter={setTransactionFilter}
          currentTransactions={currentTransactions}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          filteredTransactions={filteredTransactions}
          getStatusColor={getStatusColor}
          setActivePage={safeSetActivePage}
        /></Suspense>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#0d1137] to-[#0a0e27] text-white">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* USDT Rain Animation — replaces JPG coin rain */}
      <USDTRain enabled={showCoinRain} />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="lg:hidden fixed top-6 left-6 z-[60] p-3 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-2xl border border-white/10 hover:border-cyan-500/30 transition-all"
      >
        {mobileSidebarOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: mobileSidebarOpen || window.innerWidth >= 1024 ? 0 : -300,
          width: sidebarCollapsed ? 80 : 280,
        }}
        className={`fixed top-0 left-0 bottom-0 z-50 bg-gradient-to-b from-[#0a0e27] via-[#0d1137] to-[#0a0e27] border-r border-white/10 backdrop-blur-xl ${
          mobileSidebarOpen ? "block" : "hidden lg:block"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div
            className="p-6 border-b border-white/10"
            onClick={() => navigate("/")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b flex items-center justify-center shadow-lg flex-shrink-0">
                <div className="w-10 h-10  rounded-full flex items-center justify-center">
                  <img
                    src={Logo}
                    alt="Oxford Financial Ads Logo"
                    className="w-10 h-10 object-contain"
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-white rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </div>
              {!sidebarCollapsed && (
                <div>
                  <div className="font-bold text-white">Oxford Financial Ads</div>
                  <div className="text-[10px] text-cyan-400/80 uppercase tracking-wider">
                    {t("userDashboard.header")}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          {/* {!sidebarCollapsed && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {mockUserData.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{mockUserData.fullName}</div>
                  <div className="text-xs text-gray-400 truncate">@{mockUserData.username}</div>
                </div>
              </div>
            </div>
          )} */}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {userPages.map((page) => (
              <button
                key={page.id}
                onClick={() => {
                  if (page.id === "terms") {
                    navigate("/terms-conditions");
                    return;
                  }

                  if (page.id === "privacy") {
                    navigate("/privacy-policy");
                    return;
                  }


                  if (page.id === "kyc") {
                    safeSetActivePage("kyc");
                    return;
                  }
                  if (isAccountOnHold && !HOLD_ALLOWED_PAGES.has(page.id)) {
                    return;
                  }

                  safeSetActivePage(page.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  activePage === page.id
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                    : isAccountOnHold && !HOLD_ALLOWED_PAGES.has(page.id)
                      ? "text-gray-600 cursor-not-allowed opacity-50"
                    : page.comingSoon
                      ? "text-gray-600 cursor-default"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <page.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium flex items-center gap-2">
                      {page.label}
                      {page.comingSoon && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          {t("userDashboard.sidebar.soon")}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs ${activePage === page.id ? "text-white/70" : "text-gray-500"}`}
                    >
                      {page.description}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* Collapse Button */}
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/10 space-y-3">
            <div className="mb-3">
              <a
                href="https://t.me/+aIajLcllDPBlOTE0"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <button className="w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <MessageCircle className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-gray-300">
                    {t("nav.chat")}{" "}
                    <span className="text-green-400">{t("nav.online")}</span>
                  </span>
                </button>
              </a>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl 
               bg-red-500/10 hover:bg-red-500/20 
               text-red-400 hover:text-red-300 
               transition-all duration-300"
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span className="text-sm">{t("nav.logout")}</span>}
            </button>

            {/* Collapse Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex w-full items-center justify-center gap-2 px-4 py-2 
               rounded-xl bg-white/5 hover:bg-white/10 
               transition-all duration-300 
               text-gray-400 hover:text-white"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm">{t("common.collapse")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div
        className={`relative z-10 transition-all duration-300 pt-4`}
        style={{
          marginLeft:
            window.innerWidth >= 1024
              ? sidebarCollapsed
                ? "80px"
                : "280px"
              : "0",
        }}
      >
        {isAccountOnHold && (
          <div className="mx-4 mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {t("userDashboard.accountOnHold")}
            {user?.account_issue ? ` Issue: ${user.account_issue}` : ""}
          </div>
        )}
        <Suspense fallback={<UserLoading />}>{renderPageContent()}</Suspense>
      </div>

      <Suspense fallback={null}>
        <LazyAnnouncementModal
          open={isAnnouncementOpen}
          announcement={activeAnnouncement}
          onClose={handleCloseAnnouncement}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LazyWhatsAppButton />
      </Suspense>
    </div>
  );
}
export default UserDashboard;
