import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Menu, Bell, LogOut, Fingerprint, Crown, Award,
  Calendar, Download, Upload, ArrowLeftRight, Clock, Package,
  TrendingUp, Activity, Users, User, Headset, ShoppingCart, Store,
  Send, Repeat, Ribbon, ShieldCheck, Trophy, Home, LayoutGrid,
  BarChart3, X, ChevronDown, ChevronUp, Sparkles, DollarSign,
} from "lucide-react";
import useUserStore from "../../store/userStore";
import VerifiedBadge from "../common/VerifiedBadge";
import profilePlaceholder from "../../assets/banner.jpeg";
import { getActiveAnnouncement } from "../../api/user.api";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const QUICK_ACTIONS = [
  { label: "Deposit", icon: Download, color: "text-cyan-400", page: "deposit" },
  { label: "Withdraw", icon: Upload, color: "text-purple-400", page: "withdraw" },
  { label: "Transfer", icon: ArrowLeftRight, color: "text-blue-400", page: "transfer" },
  { label: "History", icon: Clock, color: "text-orange-400", page: "transactions" },
  { label: "Packages", icon: Package, color: "text-blue-400", page: "packages" },
  { label: "My Investments", icon: TrendingUp, color: "text-emerald-400", page: "investments" },
  { label: "Market", icon: Activity, color: "text-purple-400", page: "market" },
  { label: "Referral", icon: Users, color: "text-amber-400", page: "referral" },
  { label: "Profile", icon: User, color: "text-blue-400", page: "profile" },
  { label: "Support", icon: Headset, color: "text-pink-400", page: "support" },
  { label: "Marketplace", icon: ShoppingCart, color: "text-emerald-400", page: "marketplace" },
  { label: "Seller", icon: Store, color: "text-orange-400", page: "seller" },
  { label: "Send Funds", icon: Send, color: "text-blue-400", page: "send-funds" },
  { label: "Transfers", icon: ArrowLeftRight, color: "text-purple-400", page: "transfer-history" },
  { label: "MB Transfer", icon: Ribbon, color: "text-purple-400", page: "matching-bonus-transfer" },
  { label: "Wallet Transfer", icon: Repeat, color: "text-blue-400", page: "transfer" },
  { label: "KYC", icon: ShieldCheck, color: "text-emerald-400", page: "kyc" },
  { label: "Matching Bonus", icon: Trophy, color: "text-yellow-400", page: "matching-bonus" },
  { label: "Deposit", icon: Download, color: "text-emerald-400", page: "deposit" },
  { label: "Withdraw", icon: Upload, color: "text-orange-400", page: "withdraw" },
];

const BOTTOM_TABS = [
  { id: "overview", icon: Home, label: "Dashboard" },
  { id: "market", icon: BarChart3, label: "Market" },
  { id: "referral", icon: Users, label: "Team" },
  { id: "notifications", icon: Bell, label: "Notification" },
  { id: "menu", icon: LayoutGrid, label: "Menu" },
];

const NOTIF_COUNT = 3;

export default function CyberDashboard({ setActivePage, onLogout, onToggleSidebar }) {
  const { user } = useUserStore();
  const [currentTab, setCurrentTab] = useState("overview");
  const [announcement, setAnnouncement] = useState(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const initials = getInitials(user?.full_name);
  const joinDate = formatDate(user?.created_at);
  const userId = user?.user_no || "-";
  const memberId = user?.member_id || userId;
  const displayUrl = user?.profile_image_url;
  const notifCount = user?.unread_notifications ?? NOTIF_COUNT;

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    if (tabId === "notifications") {
      if (announcement) setShowAnnouncement(true);
      return;
    }
    if (tabId === "menu") {
      if (onToggleSidebar) onToggleSidebar();
      return;
    }
    if (tabId !== "overview" && setActivePage) {
      setActivePage(tabId);
    }
  };

  const handleQuickAction = (page) => {
    if (setActivePage) setActivePage(page);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getActiveAnnouncement();
        const data = res?.data?.data || null;
        setAnnouncement(data);
      } catch {}
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#0d1137] to-[#0a0e27] text-white pb-20 relative overflow-x-hidden">
      {/* Background grid + glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px]" />
        {/* Floating node dots */}
        <div className="absolute top-[15%] left-[10%] w-2 h-2 bg-cyan-400/30 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.3)]" />
        <div className="absolute top-[30%] right-[15%] w-1.5 h-1.5 bg-purple-400/30 rounded-full shadow-[0_0_6px_rgba(168,85,247,0.3)]" />
        <div className="absolute top-[60%] left-[20%] w-2 h-2 bg-blue-400/20 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.2)]" />
        <div className="absolute bottom-[30%] right-[10%] w-1.5 h-1.5 bg-cyan-400/20 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.2)]" />
        <div className="absolute top-[45%] left-[5%] w-1 h-1 bg-purple-400/20 rounded-full" />
        <div className="absolute bottom-[20%] right-[25%] w-1 h-1 bg-blue-400/20 rounded-full" />
      </div>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="relative z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="w-10 h-10 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] flex items-center justify-center hover:border-cyan-500/40 transition-all"
            >
              <Menu className="w-5 h-5 text-white/80" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">FINANCIAL ADS</h1>
              <p className="text-[9px] text-cyan-400/70 uppercase tracking-[0.15em]">BUILD YOUR FUTURE</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-bold text-amber-300 tracking-wider">PREMIUM</span>
            </div>
            <button
              onClick={() => setShowAnnouncement(true)}
              className="relative w-10 h-10 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] flex items-center justify-center hover:border-cyan-500/40 transition-all"
            >
              <Bell className="w-5 h-5 text-white/80" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-lg shadow-red-500/40">
                  {notifCount}
                </span>
              )}
            </button>
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] flex items-center justify-center hover:border-red-500/40 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5 text-red-400/80" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Profile Identity ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative z-10 px-4 mb-4"
      >
        <div className="flex flex-col items-center py-5 rounded-2xl border border-white/[0.06] shadow-[0_0_30px_rgba(59,130,246,0.05)]"
          style={{
            backgroundImage: `linear-gradient(rgba(10,14,39,0.85), rgba(10,14,39,0.85)), url(${profilePlaceholder})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[3px] shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${profilePlaceholder})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {displayUrl ? (
                  <img src={displayUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">{initials}</span>
                )}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-[#0d1137] flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <VerifiedBadge size="xs" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white mb-1">MD. Bakhtiar Hossen</h2>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <VerifiedBadge size="xs" />
            <span className="text-xs font-medium text-emerald-300">Verified User</span>
          </div>
        </div>
      </motion.div>

      {/* ── User Info Grid 2x2 ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 px-4 mb-5"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(59,130,246,0.03)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">USER ID</span>
            </div>
            <p className="text-sm font-bold text-cyan-400 font-mono">#{userId}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:border-purple-500/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.03)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">MEMBER ID</span>
            </div>
            <p className="text-sm font-bold text-purple-400 font-mono">{memberId}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:border-amber-500/30 transition-all shadow-[0_0_15px_rgba(251,191,36,0.03)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/20 flex items-center justify-center">
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">POSITION</span>
            </div>
            <p className="text-sm font-bold text-amber-300">Star Diamond</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(34,211,238,0.03)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">SINCE</span>
            </div>
            <p className="text-sm font-bold text-cyan-300">{joinDate}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions Grid ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 px-4"
      >
        <div className="grid grid-cols-4 gap-2.5">
          {QUICK_ACTIONS.map((action, idx) => (
            <motion.button
              key={`${action.page}-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.02 * idx }}
              onClick={() => handleQuickAction(action.page)}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                <action.icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <span className={`text-[9px] font-medium ${action.color} text-center leading-tight`}>
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Bottom Navigation ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gradient-to-b from-[#0d1137]/95 to-[#0a0e27]/95 backdrop-blur-2xl border-t border-white/[0.06] shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-around px-2 py-1.5">
            {BOTTOM_TABS.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                    isActive
                      ? "text-cyan-400"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="bottomTabGlow"
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                    />
                  )}
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" : ""}`} />
                    {tab.id === "notifications" && notifCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-[8px] font-bold text-white flex items-center justify-center px-1 shadow-lg shadow-red-500/40">
                        {notifCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-medium ${isActive ? "text-cyan-400" : "text-gray-500"}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Announcement Modal ────────────────────────── */}
      {showAnnouncement && announcement && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAnnouncement(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-sm p-5 rounded-2xl bg-gradient-to-b from-[#1a1a3a] to-[#0f0f2d] border border-white/[0.08] shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{announcement.title || "Announcement"}</h3>
              <button
                onClick={() => setShowAnnouncement(false)}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {announcement.message || ""}
            </p>
            <button
              onClick={() => setShowAnnouncement(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
