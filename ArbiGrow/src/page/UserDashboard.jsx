import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Package,
  FileText,
  Users,
  UserCircle,
  Download,
  Upload,
  Home,
  X,
  Menu,
  Keyboard,
  Eye,
  Lock,
  Copy,
  Check,
  Link as LinkIcon,
  GitBranch,
  Star,
  Award,
  MessageCircle,
  ShoppingCart,
  Store,
  ArrowLeftRight,
  Repeat,
} from "lucide-react";
import arbxCardImg from "../assets/Card-design.png";
import arbxCoinImg from "../assets/Coin.png";
import Logo from "../assets/Arbigrow-Logo.png";
import { mockMarketPrices, mockUserData } from "../constants/mockdata.js";
import { useNavigate } from "react-router";
import ReferralPage from "../component/user/ReferralPage.jsx";
import ProfilePage from "../component/user/ProfilePage.jsx";
import OverviewPage from "../component/user/OverviewPage.jsx";
import useUserStore from "../store/userStore.js";
import { LogOut } from "lucide-react";
import TransactionHistoryPage from "../component/user/TransactionHistoryPage.jsx";
import {
  getReferralNetwork,
  getMyDeposits,
  getMyWithdrawals,
  getMyEarningsHistory,
  getMyProfitHistory,
  getActiveAnnouncement,
} from "../api/user.api.js";
import DepositPage from "../component/user/DepositUSDT.jsx";
import WithdrawPage from "../component/user/WithdrawUSDT.jsx";
import TierSection from "../component/package/TierSection.jsx";
import PackageModal from "../component/package/PackageModal.jsx";
import { MyInvestments } from "../component/user/MyInvestments.jsx";
import { Market } from "../component/user/Market.jsx";
import { AnnouncementModal } from "../component/user/AnnouncementModal.jsx";
import MarketplacePage from "../component/user/MarketplacePage.jsx";
import SellerDashboard from "../component/user/SellerDashboard.jsx";
import WalletTransfer from "../component/user/WalletTransfer.jsx";
import DailyTasks from "../component/user/DailyTasks.jsx";
import AdsView from "../component/user/AdsView.jsx";
import ConvertOFA from "../component/user/ConvertOFA.jsx";
// Mock data for market prices

const EMPTY_REFERRAL_LEVELS = [
  { level: 1, commissionRate: "10%", totalEarnings: 0, users: [] },
  { level: 2, commissionRate: "8%", totalEarnings: 0, users: [] },
  { level: 3, commissionRate: "7%", totalEarnings: 0, users: [] },
  { level: 4, commissionRate: "6%", totalEarnings: 0, users: [] },
  { level: 5, commissionRate: "5%", totalEarnings: 0, users: [] },
];
const HOLD_ALLOWED_PAGES = new Set([
  "overview",
  "deposit",
  "profile",
  "terms",
  "privacy",
  "whitepaper",
]);

export function UserDashboard() {
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
  const { logout } = useUserStore();
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
    setActivePage(pageId);
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
    if (v === "approved" || v === "completed") return "Completed";
    if (v === "rejected" || v === "failed") return "Rejected";
    if (v === "processing") return "Processing";
    return "Pending";
  };
  const _normalizeTransactions = (deps, wdws, ears, pfts) => {
    const rows = [];
    deps.forEach((d) =>
      rows.push({
        id: `dep_${d.id}`,
        transactionId: _genTransactionId("DEP", d.id, d.created_at, d.txid),
        date: _fmtDate(d.created_at),
        type: "Deposit",
        wallet: "Deposit Wallet",
        amount: _fmtAmount(d.amount),
        amountDirection: "credit",
        currency: "USDT",
        status: _mapStatus(d.status),
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
        wallet: _fmtWallet(w.source_wallet),
        amount: _fmtAmount(w.amount),
        amountDirection: "debit",
        currency: "USDT",
        status: _mapStatus(w.status),
        _ts: new Date(w.created_at).getTime(),
      }),
    );
    ears.forEach((e) =>
      rows.push({
        id: `ear_${e.id}`,
        transactionId: _genTransactionId("EAR", e.id, e.created_at, e.type),
        date: _fmtDate(e.created_at),
        type:
          e.wallet_type === "referral" ? "Referral Bonus" : "Generation Bonus",
        wallet:
          e.wallet_type === "referral"
            ? "Referral Wallet"
            : "Generation Wallet",
        amount: _fmtAmount(e.amount, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 14,
        }),
        amountDirection: "credit",
        currency: "USDT",
        status: "Completed",
        _ts: new Date(e.created_at).getTime(),
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
        wallet: "Main Wallet",
        amount: _fmtAmount(p.amount, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 14,
        }),
        amountDirection: "credit",
        currency: "USDT",
        status: "Completed",
        _ts: new Date(p.created_at).getTime(),
      }),
    );
    return rows.sort((a, b) => b._ts - a._ts);
  };

  useEffect(() => {
    if (activePage !== "transactions" || transactionsLoaded) return;
    const load = async () => {
      setTransactionsLoading(true);
      try {
        const [depRes, wdwRes, earRes, pftRes] = await Promise.all([
          getMyDeposits(),
          getMyWithdrawals(),
          getMyEarningsHistory(),
          getMyProfitHistory(),
        ]);
        const deps = depRes?.data?.data || [];
        const wdws = wdwRes?.data?.data || [];
        const ears = earRes?.data?.data || [];
        const pfts = pftRes?.data?.data || [];
        setTransactions(_normalizeTransactions(deps, wdws, ears, pfts));
        setTransactionsLoaded(true);
      } catch (err) {
        console.error("Failed to load transactions:", err);
      } finally {
        setTransactionsLoading(false);
      }
    };
    load();
  }, [activePage, transactionsLoaded]);

  const userPages = [
    {
      id: "overview",
      label: "Overview",
      icon: Home,
      description: "Dashboard & Wallets",
    },
    {
      id: "deposit",
      label: "Deposit",
      icon: Download,
      description: "Add funds",
    },
    {
      id: "packages",
      label: "Packages",
      icon: Package,
      description: "Investment plans",
    },
    {
      id: "investments",
      label: "My Investments",
      icon: TrendingUp,
      description: "Active investments",
    },
    {
      id: "tasks",
      label: "Captcha Typing",
      icon: Keyboard,
    },
    {
      id: "ads",
      label: "Ad View",
      icon: Eye,
      description: "Watch & earn USDT",
    },
    {
      id: "withdraw",
      label: "Withdraw",
      icon: Upload,
      description: "Withdraw funds",
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: FileText,
      description: "Transaction history",
    },
    {
      id: "referral",
      label: "Referral",
      icon: Users,
      description: "Invite & earn",
    },
    {
      id: "transfer",
      label: "Wallet Transfer",
      icon: ArrowLeftRight,
      description: "Transfer between wallets",
    },
    {
      id: "convert",
      label: "Convert OFA",
      icon: Repeat,
      description: "OFA to USDT swap",
    },
    {
      id: "market",
      label: "Market",
      icon: TrendingUp,
      description: "Crypto market overview",
    },
    {
      id: "marketplace",
      label: "Marketplace",
      icon: ShoppingCart,
      description: "Buy products",
    },
    {
      id: "seller",
      label: "Seller Dashboard",
      icon: Store,
      description: "Manage your store",
    },
    {
      id: "profile",
      label: "Profile",
      icon: UserCircle,
      description: "Account settings",
    },
    {
      id: "terms",
      label: "Terms & Conditions",
      icon: FileText,
      description: "Platform terms",
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      icon: Lock,
      description: "Data & privacy",
    },
    {
      id: "whitepaper",
      label: "Technical Whitepaper",
      icon: Award,
      description: "Project documentation",
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
    const copiedLink = `${import.meta.env.VITE_FRONTNED_URL}/register?ref_code=${user.username}`;
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
        <ReferralPage
          totalReferrals={totalReferrals}
          fixedReferralData={referralLevels}
          levelColors={levelColors}
          selectedReferralLevel={selectedReferralLevel}
          setSelectedReferralLevel={setSelectedReferralLevel}
          handleCopyLink={handleCopyLink}
          copiedLink={copiedLink}
          activeLevel={activeLevel}
          lc={lc}
        />
      );
    }

    // Profile Page
    if (activePage === "profile") {
      return <ProfilePage mockUserData={mockUserData} />;
    }
    if (activePage === "transactions") {
      return (
        <TransactionHistoryPage
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
    if (activePage === "deposit") {
      return <DepositPage />;
    }
    if (activePage === "withdraw") {
      return <WithdrawPage />;
    }
    //investment
    if (activePage === "investments") {
      return (
        <MyInvestments
          refreshKey={investmentsRefreshKey}
          onNavigateToPackages={() => safeSetActivePage("packages")}
        />
      );
    }
    //tasks
    if (activePage === "tasks") {
      return <DailyTasks />;
    }
    if (activePage === "ads") {
      return <AdsView />;
    }
    //packege moddal
    if (activePage === "packages") {
      return (
        <>
          <TierSection onSelect={setSelectedPackage} />

          <PackageModal
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
      return <Market />;
    }

    if (activePage === "marketplace") {
      return <MarketplacePage />;
    }

    if (activePage === "seller") {
      return <SellerDashboard />;
    }

    if (activePage === "transfer") {
      return <WalletTransfer />;
    }

    if (activePage === "convert") {
      return <ConvertOFA />;
    }

    if (activePage !== "overview") {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
            <p className="text-gray-400">This page is under development</p>
          </div>
        </div>
      );
    }

    if (activePage === "overview") {
      return (
        <OverviewPage
          mockUserData={mockUserData}
          mockMarketPrices={mockMarketPrices}
          arbxCardImg={arbxCardImg}
          arbxCoinImg={arbxCoinImg}
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
        />
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

      {/* Coin Rain Animation */}
      <AnimatePresence>
        {showCoinRain && (
          <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.img
                key={i}
                src={arbxCoinImg}
                alt="Coin"
                initial={{
                  y: -100,
                  x: `${Math.random() * 100}vw`,
                  rotate: 0,
                  opacity: 0.8,
                }}
                animate={{
                  y: "110vh",
                  rotate: 360 * 3,
                  opacity: 0,
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.03,
                  ease: "linear",
                }}
                className="absolute w-8 h-8 md:w-12 md:h-12"
              />
            ))}
          </div>
        )}
      </AnimatePresence>

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
                    User Portal
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

                  if (page.id === "whitepaper") {
                    window.open("/technical-whitepaper.pdf", "_blank");
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
                          Soon
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
                href="https://t.me/ArbigrowOfficial"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <button className="w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <MessageCircle className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-gray-300">
                    Chat with us.{" "}
                    <span className="text-green-400">We are online!</span>
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
              {!sidebarCollapsed && <span className="text-sm">Logout</span>}
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
                  <span className="text-sm">Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div
        className={`relative z-10 transition-all duration-300 pt-20`}
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
            Your account is currently on hold. You can only use deposits right now.
            {user?.account_issue ? ` Issue: ${user.account_issue}` : ""}
          </div>
        )}
        {renderPageContent()}
      </div>

      <AnnouncementModal
        open={isAnnouncementOpen}
        announcement={activeAnnouncement}
        onClose={handleCloseAnnouncement}
      />
    </div>
  );
}
