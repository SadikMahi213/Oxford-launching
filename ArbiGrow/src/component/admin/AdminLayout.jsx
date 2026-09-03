import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  X,
  Menu,
  LogOut,
  Wallet,
  Upload,
  Percent,
  Network,
  Package,
  Activity,
  Megaphone,
  Store,
  Settings,
  Video,
  User,
  Eye,
  Bell,
  ShieldAlert,
  Medal,
  Trophy,
  DollarSign,
  IdCard,
  Building2,
  ArrowDownFromLine,
  AlertTriangle,
} from "lucide-react";
import logo from "../../assets/oxford.png";
import useUserStore from "../../store/userStore";
import NotificationBell from "./notifications/NotificationBell";
import PopupNotification from "./notifications/PopupNotification";

export default function AdminLayout({
  children,
  activePage,
  setActivePage,
  navigate,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const adminPages = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Overview & Analytics",
    },
    {
      id: "self-analytics",
      label: "Visitor Analytics",
      icon: Eye,
      description: "Self-hosted tracking",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      description: "Real-time admin alerts",
    },
    {
      id: "security",
      label: "Login Security",
      icon: ShieldAlert,
      description: "Blocked accounts & logs",
    },
    {
      id: "task-errors",
      label: "Task Errors",
      icon: AlertTriangle,
      description: "Error detection & suspensions",
    },
    {
      id: "users",
      label: "User Management",
      icon: Users,
      description: "Manage all users",
    },
    {
      id: "kyc-requests",
      label: "KYC Requests",
      icon: IdCard,
      description: "Pending KYC verifications",
    },
    {
      id: "kyc-package",
      label: "KYC Package",
      icon: Package,
      description: "Configure KYC verification package",
    },
    {
      id: "bank-info",
      label: "Banking Info",
      icon: Building2,
      description: "Review user bank details",
    },
    {
      id: "deposits",
      label: "Deposit Requests",
      icon: Wallet,
      description: "Manage deposits",
    },
    {
      id: "withdrawals",
      label: "Withdrawal Requests",
      icon: Upload,
      description: "Manage withdrawals",
    },
    {
      id: "networks",
      label: "Deposit Networks",
      icon: Network,
      description: "Manage networks",
    },
    {
      id: "withdrawal-methods",
      label: "Withdrawal Methods",
      icon: ArrowDownFromLine,
      description: "Manage withdrawal methods",
    },
    {
      id: "packages",
      label: "Packages",
      icon: Package,
      description: "Manage packages",
    },
    {
      id: "investments",
      label: "Investments",
      icon: Package,
      description: "Manage investments",
    },
    {
      id: "ads",
      label: "Ads Management",
      icon: Video,
      description: "YouTube ads for earn",
    },
  {
  id: "statistics",
  label: "Platform Statistics",
  icon: Activity,
  description: "Update statistics",
  },
    {
      id: "announcements",
      label: "Announcements",
      icon: Megaphone,
      description: "Popup announcements",
    },
    {
      id: "ranks",
      label: "Rank Management",
      icon: Medal,
      description: "Manage 21-rank matching bonus system",
    },
    {
      id: "rank-history",
      label: "Rank History",
      icon: Trophy,
      description: "User rank achievement history",
    },
    {
      id: "bonus-history",
      label: "Bonus Ledger",
      icon: DollarSign,
      description: "Matching bonus payout ledger",
    },
    {
      id: "roi",
      label: "ROI Management",
      icon: Percent,
      description: "Set global ROI",
    },
    {
      id: "ecommerce",
      label: "Ecommerce",
      icon: Store,
      description: "Manage marketplace",
    },
    {
      id: "commission-config",
      label: "Commission Config",
      icon: Percent,
      description: "Referral and generation bonus",
    },
    {
      id: "settings",
      label: "System Settings",
      icon: Settings,
      description: "Override weekend rules",
    },
    {
      id: "profile",
      label: "My Profile",
      icon: User,
      description: "Manage your profile",
    },
  ];

  const logout = useUserStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#0d1137] to-[#0a0e27] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <button
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-[60] p-2.5 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-2xl border border-white/10 hover:border-cyan-500/30 transition-all"
      >
        {mobileSidebarOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>

      <div className="fixed top-3 right-3 z-[60]">
        <NotificationBell />
      </div>

      <PopupNotification />

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

      <motion.aside
        initial={false}
        animate={{
          x: mobileSidebarOpen || window.innerWidth >= 1024 ? 0 : -300,
          width: sidebarCollapsed ? 72 : 280,
        }}
        className={`fixed top-0 left-0 bottom-0 z-50 bg-gradient-to-b from-[#0a0e27] via-[#0d1137] to-[#0a0e27] border-r border-white/10 backdrop-blur-xl ${
          sidebarCollapsed ? "w-[72px]" : "w-[85vw] max-w-[280px]"
        } ${mobileSidebarOpen ? "block" : "hidden lg:block"}`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/50">
                <img
                  src={logo}
                  alt="Oxford Financial Ads Logo"
                  className="w-full h-full object-cover"
                />
              </div>

              {!sidebarCollapsed && (
                <div>
                  <div className="font-bold text-white">Oxford Financial Ads</div>
                  <div className="text-[10px] text-cyan-400/80 uppercase tracking-wider">
                    Admin Panel
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {adminPages.map((page) => (
              <button
                key={page.id}
                onClick={() => {
                  setActivePage(page.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  activePage === page.id
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <page.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium">{page.label}</div>
                    <div
                      className={`text-xs ${
                        activePage === page.id
                          ? "text-white/70"
                          : "text-gray-500"
                      }`}
                    >
                      {page.description}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-3">
           {/*  */}
           
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all duration-300"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">Logout</span>
              )}
            </button>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex w-full items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 text-gray-400 hover:text-white"
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

      <div
        className="relative z-10 transition-all duration-300 pt-20 lg:pl-72"
        style={{
          paddingLeft:
            window.innerWidth >= 1024 && sidebarCollapsed
              ? "72px"
              : "",
        }}
      >
        {children}
      </div>
    </div>
  );
}
