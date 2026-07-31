import { useCallback, useEffect, useMemo, useState } from "react";
import { InvestmentStatsCards } from "./InvestmentStatsCards";
import { InvestmentFilters } from "./InvestmentFilters";
import { InvestmentsTable } from "./InvestmentsTable";
import { InvestmentPagination } from "./InvestmentPagination";
import { AddProfitModal } from "./AddProfitModal";
import { InvestmentDetailsModal } from "./InvestmentDetailsModal";
import useUserStore from "../../store/userStore.js";
import { useNavigate } from "react-router";
import {
  addAdminInvestmentProfit,
  getAdminInvestmentDetails,
  getAdminInvestments,
} from "../../api/admin.api.js";

const toNumber = (value) => Number(value ?? 0);

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

const mapListItem = (item) => ({
  id: item.investment_id,
  userName: item.username || "-",
  userEmail: item.email || "-",
  packageName: item.package_name,
  tierName: item.tier_name || "—",
  amount: toNumber(item.invested_amount),
  startDate: formatDate(item.start_date),
  endDate: formatDate(item.end_date),
  roi: toNumber(item.roi_percent),
  expectedProfit: toNumber(item.expected_profit),
  profitPaid: toNumber(item.profit_earned),
  dailyPayment: toNumber(item.daily_payment),
  captchaRequiredPerDay: item.captcha_required_per_day || 0,
  status: item.status,
  percentagePaid: toNumber(item.percentage_paid),
  remainingProfit: toNumber(item.remaining_profit),
});

const mapDetails = (response) => ({
  id: response?.investment?.id,
  userId: response?.user?.id,
  userNo: response?.user?.user_no,
  userName: response?.user?.username || "-",
  userEmail: response?.user?.email || "-",
  packageName: response?.investment?.package_name || "-",
  amount: toNumber(response?.investment?.invested_amount),
  startDate: formatDate(response?.investment?.start_date),
  endDate: formatDate(response?.investment?.end_date),
  roi: toNumber(response?.investment?.roi_percent),
  expectedProfit: toNumber(response?.investment?.expected_profit),
  profitPaid: toNumber(response?.investment?.profit_earned),
  dailyPayment: toNumber(response?.investment?.daily_payment),
  captchaRequiredPerDay: response?.investment?.captcha_required_per_day || 0,
  percentagePaid: toNumber(response?.investment?.percentage_paid),
  remainingProfit: toNumber(response?.investment?.remaining_profit),
  status: response?.investment?.status || "active",
  profitHistory: Array.isArray(response?.profit_history)
    ? response.profit_history.map((history, index) => ({
        id: `${response?.investment?.id}-${index}`,
        date: formatDate(history?.date),
        amount: toNumber(history?.amount),
      }))
    : [],
});

export function InvestmentsManagement() {
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);
  const logout = useUserStore((state) => state.logout);

  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [showAddProfitModal, setShowAddProfitModal] = useState(false);
  const [profitPercentage, setProfitPercentage] = useState("");
  const [updatingProfit, setUpdatingProfit] = useState(false);

  const fetchInvestments = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await getAdminInvestments(token, {
        page: currentPage,
        statusFilter,
        search: debouncedSearch,
      });

      const items = Array.isArray(response?.items) ? response.items : [];
      setInvestments(items.map(mapListItem));
      setTotalItems(Number(response?.total || 0));
      setTotalPages(Math.max(1, Number(response?.total_pages || 1)));
      setPageSize(Number(response?.page_size || 50));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        logout();
        navigate("/login");
        return;
      }

      const detail = err?.response?.data?.detail;
      setError(detail || "Failed to load investments.");
      setInvestments([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, token, logout, navigate]);

  const loadInvestmentDetails = useCallback(
    async (investmentId) => {
      if (!token || !investmentId) return;

      try {
        const response = await getAdminInvestmentDetails(token, investmentId);
        setSelectedInvestment(mapDetails(response));
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          logout();
          navigate("/login");
          return;
        }

        const detail = err?.response?.data?.detail || "Failed to load details.";
        alert(detail);
      }
    },
    [token, logout, navigate],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const handleFilterChange = (filterType, value) => {
    setCurrentPage(1);

    if (filterType === "status") setStatusFilter(value);
    if (filterType === "search") setSearchQuery(value);
  };

  const handleAddProfit = async () => {
    if (!selectedInvestment?.id) return;

    const parsedPercentage = Number(profitPercentage);
    const remainingPercentage = Number(selectedInvestment?.remainingPercentage ?? 0);

    if (!parsedPercentage || parsedPercentage <= 0) return;
    if (parsedPercentage > remainingPercentage) {
      alert(`Only ${remainingPercentage.toFixed(2)}% remaining.`);
      return;
    }

    setUpdatingProfit(true);

    try {
      await addAdminInvestmentProfit(token, selectedInvestment.id, parsedPercentage);
      setShowAddProfitModal(false);
      setProfitPercentage("");

      await Promise.all([
        fetchInvestments(),
        loadInvestmentDetails(selectedInvestment.id),
      ]);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        logout();
        navigate("/login");
        return;
      }

      const detail = err?.response?.data?.detail || "Failed to add profit.";
      alert(detail);
    } finally {
      setUpdatingProfit(false);
    }
  };

  const investmentStats = useMemo(
    () => ({
      total: totalItems,
      active: investments.filter((i) => i.status === "active").length,
      completed: investments.filter((i) => i.status === "completed").length,
      totalInvested: investments.reduce((sum, i) => sum + i.amount, 0),
      totalProfitPaid: investments.reduce((sum, i) => sum + i.profitPaid, 0),
    }),
    [investments, totalItems],
  );

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = startIndex + investments.length;

  const handleProfitPercentageChange = (value) => {
    if (value === "") {
      setProfitPercentage("");
      return;
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue < 0) return;

    setProfitPercentage(String(numericValue));
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Investment Management
          </span>
        </h1>
        <p className="text-gray-400 text-sm">
          Monitor and manage all user investment packages
        </p>
      </div>

      <InvestmentStatsCards stats={investmentStats} />

      <InvestmentFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={(value) => handleFilterChange("search", value)}
        onStatusChange={(value) => handleFilterChange("status", value)}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
          Loading investments...
        </div>
      ) : (
        <div>
          <InvestmentsTable
            investments={investments}
            onViewDetails={(investment) => loadInvestmentDetails(investment.id)}
          />

          <InvestmentPagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {selectedInvestment && (
        <InvestmentDetailsModal
          investment={selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
          onAddProfit={() => setShowAddProfitModal(true)}
        />
      )}

      <AddProfitModal
        isOpen={showAddProfitModal}
        investment={selectedInvestment}
        profitPercentage={profitPercentage}
        onClose={() => {
          setShowAddProfitModal(false);
          setProfitPercentage("");
        }}
        onPercentageChange={handleProfitPercentageChange}
        onConfirm={handleAddProfit}
        loading={updatingProfit}
      />
    </div>
  );
}
