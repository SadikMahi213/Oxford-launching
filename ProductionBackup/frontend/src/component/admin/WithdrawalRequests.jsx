import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  XCircle,
} from "lucide-react";
import useUserStore from "../../store/userStore.js";
import {
  getAdminWithdrawals,
  updateWithdrawalStatus,
} from "../../api/admin.api.js";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

const formatDate = (value) => {
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

const WALLET_LABELS = {
  main_wallet: "Main Wallet",
  arbx_wallet: "OFA token Wallet",
  deposit_wallet: "Deposit Wallet",
  withdraw_wallet: "Withdraw Wallet",
  referral_wallet: "Referral Wallet",
  generation_wallet: "Generation Wallet",
};

const truncateAddress = (value) =>
  value?.length > 24
    ? `${value.substring(0, 12)}...${value.substring(value.length - 8)}`
    : value;

export default function WithdrawalRequests() {
  const PAGE_SIZE = 50;
  const STATUS_TABS = ["all", "pending", "approved", "rejected"];

  const token = useUserStore((state) => state.token);
  const [withdrawals, setWithdrawals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionWithdrawalId, setActionWithdrawalId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadWithdrawals = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getAdminWithdrawals(token, {
        page: currentPage,
        limit: PAGE_SIZE,
        status: statusFilter === "all" ? "" : statusFilter,
      });

      const nextTotalPages = Math.max(1, response?.total_pages || 1);
      if (currentPage > nextTotalPages) {
        setCurrentPage(nextTotalPages);
        return;
      }

      setWithdrawals(response?.data || []);
      setTotalItems(response?.total || 0);
      setTotalPages(nextTotalPages);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, statusFilter]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const handleStatusChange = async (withdrawalId, status) => {
    if (!token) return;

    try {
      setActionWithdrawalId(withdrawalId);
      setErrorMessage("");
      setSuccessMessage("");

      await updateWithdrawalStatus(token, withdrawalId, status);
      await loadWithdrawals();
      setSuccessMessage(`Withdrawal ${status}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionWithdrawalId(null);
    }
  };

  const copyAddress = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  const getStatusColor = useMemo(
    () => (status) => {
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
    },
    [],
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">
          Withdrawal{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Requests
          </span>
        </h1>
        <p className="text-gray-400">Manage user withdrawal requests</p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {successMessage}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setCurrentPage(1);
            }}
            className={`rounded-xl px-4 py-2.5 font-semibold transition-all ${
              statusFilter === tab
                ? tab === "approved"
                  ? "border border-green-500/50 bg-green-500/20 text-green-400"
                  : tab === "pending"
                    ? "border border-yellow-500/50 bg-yellow-500/20 text-yellow-400"
                    : tab === "rejected"
                      ? "border border-red-500/50 bg-red-500/20 text-red-400"
                      : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                : "border border-white/10 bg-white/5 text-gray-400 hover:text-white"
            }`}
            type="button"
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="responsive-table-wrapper">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Network
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Source Wallet
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Destination
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    Loading withdrawals...
                  </td>
                </tr>
              )}

              {!loading && withdrawals.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No withdrawal requests found.
                  </td>
                </tr>
              )}

              {!loading &&
                withdrawals.map((withdrawal) => {
                  const status = (withdrawal.status || "").toLowerCase();
                  const isBusy = actionWithdrawalId === withdrawal.id;
                  const sourceWalletLabel =
                    WALLET_LABELS[withdrawal.source_wallet] ||
                    withdrawal.source_wallet;

                  return (
                    <tr
                      key={withdrawal.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td data-label="User" className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {withdrawal?.user?.name || "-"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {withdrawal?.user?.email || "-"}
                        </div>
                      </td>
                      <td data-label="Network" className="whitespace-nowrap px-6 py-4">
                        <span className="font-bold text-white">
                          {withdrawal?.network_name}
                        </span>
                      </td>

                      <td data-label="Amount" className="whitespace-nowrap px-6 py-4">
                        <span className="font-bold text-white">
                          {formatAmount(withdrawal.amount)} USDT
                        </span>
                      </td>

                      <td data-label="Source Wallet" className="px-6 py-4 text-gray-300">
                        {sourceWalletLabel}
                      </td>

                      <td data-label="Destination" className="px-6 py-4">
                        <button
                          onClick={() =>
                            copyAddress(withdrawal.destination_address)
                          }
                          className="flex items-center gap-2 font-mono text-sm text-blue-400 hover:text-blue-300"
                          type="button"
                        >
                          {truncateAddress(withdrawal.destination_address)}
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {withdrawal.note && (
                          <p className="mt-1 text-xs text-gray-500">
                            {withdrawal.note}
                          </p>
                        )}
                      </td>

                      <td data-label="Date" className="px-6 py-4 text-gray-300">
                        {formatDate(withdrawal.created_at)}
                      </td>

                      <td data-label="Status" className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusColor(status)}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td data-label="Actions" className="px-6 py-4">
                        {status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleStatusChange(withdrawal.id, "approved")
                              }
                              disabled={isBusy}
                              className="rounded-lg border border-green-500/30 bg-green-600/20 px-3 py-1.5 text-xs font-semibold text-green-400 transition-all hover:bg-green-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                            >
                              <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                              Approve
                            </button>

                            <button
                              onClick={() =>
                                handleStatusChange(withdrawal.id, "rejected")
                              }
                              disabled={isBusy}
                              className="rounded-lg border border-red-500/30 bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                            >
                              <XCircle className="mr-1 inline h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            No actions
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 p-4">
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages} | {totalItems} total
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage >= totalPages || loading}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
    </div>
  );
}
