import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, Copy, XCircle } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import {
  getAdminDeposits,
  getDepositNetworks,
  updateDepositStatus,
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

export default function DepositRequests() {
  const PAGE_SIZE = 50;
  const STATUS_TABS = ["all", "pending", "approved", "rejected"];

  const token = useUserStore((state) => state.token);
  const [deposits, setDeposits] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionDepositId, setActionDepositId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadDeposits = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const [depositsRes, networksRes] = await Promise.all([
        getAdminDeposits(token, {
          page: currentPage,
          limit: PAGE_SIZE,
          status: statusFilter === "all" ? "" : statusFilter,
        }),
        getDepositNetworks(token),
      ]);

      const nextTotalPages = Math.max(1, depositsRes?.total_pages || 1);
      if (currentPage > nextTotalPages) {
        setCurrentPage(nextTotalPages);
        return;
      }

      setDeposits(depositsRes?.data || []);
      setTotalItems(depositsRes?.total || 0);
      setTotalPages(nextTotalPages);
      setNetworks(networksRes?.data || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, statusFilter]);

  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  const networkDisplayMap = useMemo(
    () => new Map(networks.map((network) => [network.network_name, network.display_name])),
    [networks],
  );

  const handleStatusChange = async (depositId, status) => {
    if (!token) return;

    try {
      setActionDepositId(depositId);
      setErrorMessage("");
      setSuccessMessage("");

      await updateDepositStatus(token, depositId, status);
      await loadDeposits();
      setSuccessMessage(`Deposit ${status}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionDepositId(null);
    }
  };

  const copyTxid = (txid) => {
    navigator.clipboard.writeText(txid);
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

  const truncateTxid = (txid) =>
    `${txid.substring(0, 10)}...${txid.substring(txid.length - 6)}`;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">
          Deposit{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Requests
          </span>
        </h1>
        <p className="text-gray-400">Manage user deposit requests</p>
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
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  Network
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-400">
                  TXID
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
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    Loading deposits...
                  </td>
                </tr>
              )}

              {!loading && deposits.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    No deposit requests found.
                  </td>
                </tr>
              )}

              {!loading &&
                deposits.map((deposit) => {
                  const status = (deposit.status || "").toLowerCase();
                  const isBusy = actionDepositId === deposit.id;

                  return (
                    <tr key={deposit.id} className="transition-colors hover:bg-white/5">
                      <td data-label="User" className="px-6 py-4">
                        <div className="font-semibold text-white">{deposit?.user?.name || "-"}</div>
                        <div className="text-xs text-gray-400">{deposit?.user?.email || "-"}</div>
                      </td>

                      <td data-label="Amount" className="whitespace-nowrap px-6 py-4">
                        <span className="font-bold text-white">
                          {formatAmount(deposit.amount)} USDT
                        </span>
                      </td>

                      <td data-label="Network" className="px-6 py-4 text-gray-300">
                        {networkDisplayMap.get(deposit.network) || deposit.network}
                      </td>

                      <td data-label="TXID" className="px-6 py-4">
                        <button
                          onClick={() => copyTxid(deposit.txid)}
                          className="flex items-center gap-2 font-mono text-sm text-blue-400 hover:text-blue-300"
                          type="button"
                        >
                          {truncateTxid(deposit.txid)}
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </td>

                      <td data-label="Date" className="px-6 py-4 text-gray-300">{formatDate(deposit.date)}</td>

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
                              onClick={() => handleStatusChange(deposit.id, "approved")}
                              disabled={isBusy}
                              className="rounded-lg border border-green-500/30 bg-green-600/20 px-3 py-1.5 text-xs font-semibold text-green-400 transition-all hover:bg-green-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                            >
                              <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                              Approve
                            </button>

                            <button
                              onClick={() => handleStatusChange(deposit.id, "rejected")}
                              disabled={isBusy}
                              className="rounded-lg border border-red-500/30 bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                            >
                              <XCircle className="mr-1 inline h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">No actions</span>
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
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
