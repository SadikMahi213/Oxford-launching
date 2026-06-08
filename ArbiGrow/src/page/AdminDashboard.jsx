import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import AdminLayout from "../component/admin/AdminLayout.jsx";
import UserManagement from "../component/admin/UserManagement.jsx";
import DashboardOverview from "../component/admin/DashboardOverview.jsx";
import useUserStore from "../store/userStore.js";
import DepositRequests from "../component/admin/DepositRequests.jsx";
import WithdrawalRequests from "../component/admin/WithdrawalRequests.jsx";
import DepositNetworks from "../component/admin/DepositNetworks.jsx";
import { InvestmentsManagement } from "../component/admin/InvestmentsManagement.jsx";
import RoiManagement from "../component/admin/RoiManagement.jsx";
import { StatisticsManagement } from "../component/admin/statistics/StatisticsManagement.jsx";
import AnnouncementsManagement from "../component/admin/AnnouncementsManagement.jsx";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);
  const logout = useUserStore((state) => state.logout);

  const [users, setUsers] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");

  useEffect(() => {
    if (!token) {
      logout();
      navigate("/login");
    }
  }, [token, logout, navigate]);

  const renderPageContent = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardOverview users={users} />;
      case "users":
        return <UserManagement users={users} setUsers={setUsers} />;
      case "deposits":
        return <DepositRequests />;
      case "withdrawals":
        return <WithdrawalRequests />;
      case "networks":
        return <DepositNetworks />;
      case "investments":
        return <InvestmentsManagement />;
      case "statistics":
      return <StatisticsManagement />;
      case "announcements":
        return <AnnouncementsManagement />;
      case "roi":
        return <RoiManagement />;
      case "reports":
      case "settings":
        return (
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
              <p className="text-gray-400">This page is under development</p>
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
