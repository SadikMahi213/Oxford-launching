import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import AdminLayout from "../component/admin/AdminLayout.jsx";
import UserManagement from "../component/admin/UserManagement.jsx";
import KYCRequests from "../component/admin/KYCRequests.jsx";
import KycPackageManagement from "../component/admin/KycPackageManagement.jsx";
import BankInfoReview from "../component/admin/BankInfoReview.jsx";
import DashboardOverview from "../component/admin/DashboardOverview.jsx";
import useUserStore from "../store/userStore.js";
import DepositRequests from "../component/admin/DepositRequests.jsx";
import WithdrawalRequests from "../component/admin/WithdrawalRequests.jsx";
import DepositNetworks from "../component/admin/DepositNetworks.jsx";
import PackageManagement from "../component/admin/PackageManagement.jsx";
import { InvestmentsManagement } from "../component/admin/InvestmentsManagement.jsx";
import RoiManagement from "../component/admin/RoiManagement.jsx";
import { StatisticsManagement } from "../component/admin/statistics/StatisticsManagement.jsx";
import AnnouncementsManagement from "../component/admin/AnnouncementsManagement.jsx";
import AdminEcommerce from "../component/admin/AdminEcommerce.jsx";
import SystemConfigPanel from "../component/admin/SystemConfigPanel.jsx";
import AdManagement from "../component/admin/AdManagement.jsx";
import AdminReports from "../component/admin/AdminReports.jsx";
import AdminWhatsAppConfig from "../component/admin/AdminWhatsAppConfig.jsx";
import SelfAnalyticsDashboard from "../component/admin/self_analytics/SelfAnalyticsDashboard.jsx";
import NotificationHistory from "../component/admin/notifications/NotificationHistory.jsx";
import BlockedAccounts from "../component/admin/security/BlockedAccounts.jsx";
import TaskErrors from "../component/admin/TaskErrors.jsx";
import RankManagement from "../component/admin/RankManagement.jsx";
import RankHistoryPage from "../component/admin/RankHistory.jsx";
import BonusHistory from "../component/admin/BonusHistory.jsx";
import WithdrawalMethodManager from "../component/admin/WithdrawalMethodManager.jsx";
import CommissionConfig from "../component/admin/CommissionConfig.jsx";
import { Camera, Check, X } from "lucide-react";
import api from "../api/axiosInstance.js";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);
  const logout = useUserStore((state) => state.logout);

  const [users, setUsers] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoMode, setPhotoMode] = useState("url");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [showPhotoInput, setShowPhotoInput] = useState(false);

  useEffect(() => {
    if (!token) {
      logout();
      navigate("/login");
    }
  }, [token, logout, navigate]);

  const { user, setUser } = useUserStore();

  const handleSavePhoto = async () => {
    setPhotoLoading(true);
    setPhotoMsg("");
    try {
      const token = useUserStore.getState().token;
      let res;
      if (photoMode === "file" && photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const fetchRes = await fetch("/api/v1/user/profile-image/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        res = { data: await fetchRes.json() };
        if (!fetchRes.ok) throw new Error(res.data.detail || "Upload failed");
        setPhotoMsg("Profile image uploaded");
      } else if (!photoUrl.trim()) {
        setPhotoLoading(false);
        return;
      } else {
        res = await api.post("v1/user/profile-image", { profile_image_url: photoUrl.trim() }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPhotoMsg("Photo saved");
      }
      setPhotoLoaded(false);
      setUser({ profile_image_url: res.data.profile_image_url });
      setShowPhotoInput(false);
      setPhotoUrl("");
      setPhotoFile(null);
      setPhotoLoading(false);
      return;
    } catch (err) {
      setPhotoMsg(err.response?.data?.detail || err.message || "Failed to save photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const displayUrl = user?.profile_image_url;
  const initials = getInitials(user?.full_name);
  const showInitials = !displayUrl || !photoLoaded;

  const renderPageContent = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardOverview users={users} />;
      case "self-analytics":
        return <SelfAnalyticsDashboard />;
      case "notifications":
        return <NotificationHistory />;
      case "security":
        return <BlockedAccounts />;
      case "task-errors":
        return <TaskErrors setActivePage={setActivePage} />;
      case "users":
        return <UserManagement users={users} setUsers={setUsers} />;
      case "kyc-requests":
        return <KYCRequests users={users} setUsers={setUsers} />;
      case "kyc-package":
        return <KycPackageManagement setActivePage={setActivePage} />;
      case "bank-info":
        return <BankInfoReview />;
      case "deposits":
        return <DepositRequests />;
      case "withdrawals":
        return <WithdrawalRequests />;
      case "networks":
        return <DepositNetworks />;
      case "withdrawal-methods":
        return <WithdrawalMethodManager />;
      case "packages":
        return <PackageManagement />;
      case "investments":
        return <InvestmentsManagement />;
      case "statistics":
      return <StatisticsManagement />;
      case "announcements":
        return <AnnouncementsManagement />;
      case "roi":
        return <RoiManagement />;
      case "ecommerce":
        return <AdminEcommerce />;
      case "ranks":
        return <RankManagement />;
      case "rank-history":
        return <RankHistoryPage />;
      case "bonus-history":
        return <BonusHistory />;
      case "ads":
        return <AdManagement />;
      case "reports":
        return <AdminReports />;
      case "whatsapp":
        return <AdminWhatsAppConfig />;
      case "settings":
        return <SystemConfigPanel />;
      case "commission-config":
        return <CommissionConfig />;
      case "profile":
        return (
          <div className="p-4 md:p-6 space-y-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">My Profile</span>
              </h1>
              <p className="text-sm text-gray-400">Manage your profile information</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-blue-600/20 border-b border-white/10 px-4 md:px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden">
                      {displayUrl ? (
                        <img src={displayUrl} alt={user?.full_name} className="w-full h-full object-cover"
                          onLoad={() => setPhotoLoaded(true)}
                          onError={(e) => { e.target.style.display = "none"; setPhotoLoaded(false) }}
                        />
                      ) : null}
                      <span className={`text-2xl md:text-3xl font-bold text-white ${showInitials ? "" : "hidden"}`}>{initials}</span>
                    </div>
                    <button onClick={() => { setShowPhotoInput(!showPhotoInput); setPhotoUrl(""); setPhotoMsg(""); setPhotoFile(null); setPhotoMode("url") }}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-500 border-2 border-[#0a0e27] flex items-center justify-center hover:bg-cyan-400 transition-colors"
                      title="Set profile photo"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white">{user?.full_name}</h2>
                    <p className="text-sm text-gray-400">@{user?.username}</p>
                    {showPhotoInput && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPhotoMode("url")}
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "url" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}>
                            URL
                          </button>
                          <button onClick={() => setPhotoMode("file")}
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${photoMode === "file" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"}`}>
                            Upload
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {photoMode === "url" ? (
                            <input type="text" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
                              placeholder="Paste image URL..."
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                            />
                          ) : (
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                              className="flex-1 text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
                            />
                          )}
                          <button onClick={handleSavePhoto}
                            disabled={photoLoading || (photoMode === "url" ? !photoUrl.trim() : !photoFile)}
                            className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-500/30 disabled:opacity-50"
                          >
                            {photoLoading ? <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 text-cyan-400" />}
                          </button>
                          <button onClick={() => { setShowPhotoInput(false); setPhotoMsg("") }}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                        {photoMsg && (
                          <p className={`mt-1 text-xs ${photoMsg === "Photo saved" || photoMsg === "Profile image uploaded" ? "text-green-400" : "text-red-400"}`}>{photoMsg}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Full Name</label>
                    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-white">{user?.full_name}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Username</label>
                    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-white">@{user?.username}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Email</label>
                    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-white">{user?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Phone</label>
                    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-white">{user?.phone_number || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout
      activePage={activePage}
      setActivePage={setActivePage}
      navigate={navigate}
    >
      {renderPageContent()}
    </AdminLayout>
  );
}
