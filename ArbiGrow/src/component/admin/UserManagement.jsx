import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import UserDetailModal from "./UserDetailModal.jsx";
import useUserStore from "../../store/userStore.js";
import {
  deleteAdminUser,
  getUser,
  updateKYCStatus,
  updateUserWallets,
  blockUser,
  unblockUser,
  updateUserProfile,
  adminResetPassword,
} from "../../api/admin.api.js";
import { getAllUsers } from "../../api/admin.api.js";

const WALLET_FIELDS = [
  "main_wallet",
  "deposit_wallet",
  "withdraw_wallet",
  "referral_wallet",
  "generation_wallet",
  "arbx_wallet",
  "arbx_mining_wallet",
  "captcha_wallet",
  "ad_view_wallet",
  "ecommerce_wallet",
  "matching_bonus_wallet",
];

const buildWalletForm = (wallets = {}) =>
  WALLET_FIELDS.reduce((acc, field) => {
    acc[field] = String(wallets?.[field] ?? "0");
    return acc;
  }, {});

const VALID_STATUSES = new Set(["approved", "pending", "rejected", "not_submitted", "issue", "inactive"]);
const normalizeStatus = (value) => {
  const normalized = String(value || "pending").toLowerCase();
  return VALID_STATUSES.has(normalized) ? normalized : "pending";
};

export default function UserManagement({ users, setUsers, initialStatusFilter = "all" }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStatus, setUserStatus] = useState("");
  const [userIssueNote, setUserIssueNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [walletForm, setWalletForm] = useState(buildWalletForm());
  const [isWalletUpdating, setIsWalletUpdating] = useState(false);
  const [walletUpdateMessage, setWalletUpdateMessage] = useState("");

  // NEW STATES FOR SERVER PAGINATION
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
    not_submitted: 0,
    issue: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [bulkUpdateMessage, setBulkUpdateMessage] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [blockingUserId, setBlockingUserId] = useState(null);
  const [blockMessage, setBlockMessage] = useState("");
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [profileUpdateMessage, setProfileUpdateMessage] = useState("");
  const [isPasswordResetting, setIsPasswordResetting] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState("");
  const latestFetchIdRef = useRef(0);

  const { setUserDetails } = useUserStore();
  
  const handleCloseModal = () => {
    setSelectedUser(null);
    setUserIssueNote("");
    setUpdateMessage("");
    setWalletUpdateMessage("");
    setProfileUpdateMessage("");
    setPasswordResetMessage("");
    setIsUpdating(false);
    setIsWalletUpdating(false);
    setIsProfileUpdating(false);
    setIsPasswordResetting(false);
  };

  const fetchUsers = useCallback(async () => {
    const token = useUserStore.getState().token;
    if (!token) return;
    const fetchId = ++latestFetchIdRef.current;

    try {
      setLoading(true);

      const res = await getAllUsers(token, {
        page: currentPage,
        search: searchQuery,
        status: statusFilter,
      });
      const responseData = res?.data || {};
      const responseUsers = responseData?.users || [];
      const normalizedUsers = responseUsers.map((user) => ({
        ...user,
        status: normalizeStatus(user?.status),
        has_kyc_submitted: user?.has_kyc_submitted ?? false,
      }));
      const pageLimit = Number(responseData?.limit || 50);
      const backendCounts = responseData?.status_counts || {};

      if (fetchId !== latestFetchIdRef.current) return;
      setUsers(normalizedUsers);
      setTotalPages(
        Math.max(1, Math.ceil((Number(responseData?.total || 0) || 0) / pageLimit)),
      );
      setTotalUsers(Number(responseData?.total || 0) || 0);
      setStatusCounts({
        approved: Number(backendCounts?.approved || 0) || 0,
        pending: Number(backendCounts?.pending || 0) || 0,
        rejected: Number(backendCounts?.rejected || 0) || 0,
        not_submitted: Number(backendCounts?.not_submitted || 0) || 0,
        issue: Number(backendCounts?.issue || 0) || 0,
        inactive: Number(backendCounts?.inactive || 0) || 0,
      });
    } catch (err) {
      if (fetchId !== latestFetchIdRef.current) return;
      console.error("Failed to fetch users", err);
    } finally {
      if (fetchId === latestFetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, searchQuery, statusFilter, setUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserClick = async (user) => {
    setSelectedUser(user);
    setUserStatus(normalizeStatus(user?.status));
    setUserIssueNote(String(user?.issue_note || ""));
    setWalletUpdateMessage("");
    setUpdateMessage("");
    setWalletForm(buildWalletForm(user?.wallets));

    const token = useUserStore.getState().token;
    if (!token) return;

    try {
      const resUserDetails = await getUser(token, user.id);
      if (resUserDetails) {
        setUserDetails(resUserDetails);
      }

      setSelectedUser(() => ({ ...resUserDetails }));
      setUserStatus(
        normalizeStatus(
          resUserDetails?.status || resUserDetails?.kyc?.status || user?.status,
        ),
      );
      setUserIssueNote(String(resUserDetails?.issue_note || ""));
      setWalletForm(buildWalletForm(resUserDetails?.wallets));
    } catch (err) {
      console.error("Failed to fetch user details:", err);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedUser) return;
    const currentStatusRaw =
      selectedUser?.status || selectedUser?.kyc?.status || "pending";
    const nextStatus = normalizeStatus(userStatus);
    const currentStatus = normalizeStatus(currentStatusRaw);
    const nextIssueNote = String(userIssueNote || "").trim();
    const currentIssueNote = String(selectedUser?.issue_note || "").trim();

    if (!VALID_STATUSES.has(String(userStatus || "").toLowerCase())) {
      setUpdateMessage("Invalid status selected.");
      return;
    }

    if (nextStatus === "issue" && !nextIssueNote) {
      setUpdateMessage("Please write the issue details before saving.");
      return;
    }

    const isIssueNoteUnchanged =
      nextStatus !== "issue" || nextIssueNote === currentIssueNote;
    if (nextStatus === currentStatus && isIssueNoteUnchanged) {
      return;
    }

    const token = useUserStore.getState().token;
    if (!token) return;

    try {
      setIsUpdating(true);
      setUpdateMessage("");

      const response = await updateKYCStatus(
        token,
        selectedUser.id,
        nextStatus,
        nextIssueNote,
      );

      const rawUpdatedStatus = response?.new_status;

      if (!rawUpdatedStatus) {
        throw new Error("Invalid response from server");
      }
      const updatedStatus = normalizeStatus(rawUpdatedStatus);
      const updatedIssueNote =
        updatedStatus === "issue"
          ? String(response?.issue_note || nextIssueNote)
          : "";

      const updatedUser = {
        ...selectedUser,
        kyc: selectedUser?.kyc
          ? {
              ...selectedUser.kyc,
              status:
                updatedStatus === "issue"
                  ? selectedUser.kyc.status
                  : updatedStatus,
            }
          : selectedUser?.kyc,
        status: updatedStatus,
        account_status: response?.account_status || (updatedStatus === "issue" ? "on_hold" : "inactive"),
        issue_note: updatedIssueNote || null,
      };

      setSelectedUser(updatedUser);
      setUserStatus(updatedStatus);
      setUserIssueNote(updatedIssueNote);
      setUpdateMessage(response.message);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update KYC:", error);
      const detail = error?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
        : detail || "Failed to update KYC status";
      setUpdateMessage(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWalletFieldChange = (field, value) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setWalletForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const hasWalletChanges = selectedUser
    ? WALLET_FIELDS.some(
        (field) =>
          String(walletForm[field] ?? "") !==
          String(selectedUser?.wallets?.[field] ?? "0"),
      )
    : false;

  const handleWalletUpdate = async () => {
    if (!selectedUser) return;

    const token = useUserStore.getState().token;
    if (!token) return;

    try {
      setIsWalletUpdating(true);
      setWalletUpdateMessage("");

      const payload = {};

      for (const field of WALLET_FIELDS) {
        const rawValue = String(walletForm[field] ?? "").trim();
        if (rawValue === "") {
          setWalletUpdateMessage("Wallet values cannot be empty.");
          setIsWalletUpdating(false);
          return;
        }

        const parsedValue = Number(rawValue);
        if (Number.isNaN(parsedValue) || parsedValue < 0) {
          setWalletUpdateMessage("Wallet values must be numbers >= 0.");
          setIsWalletUpdating(false);
          return;
        }

        payload[field] = rawValue;
      }

      const response = await updateUserWallets(token, selectedUser.id, payload);
      const updatedWallets = response?.wallets;

      if (!updatedWallets) {
        throw new Error("Invalid wallet update response");
      }

      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              wallets: updatedWallets,
            }
          : prev,
      );
      setWalletForm(buildWalletForm(updatedWallets));
      setWalletUpdateMessage(response.message || "Wallet balances updated.");
    } catch (error) {
      console.error("Failed to update wallets:", error);
      setWalletUpdateMessage(
        error?.response?.data?.detail || "Failed to update wallet balances",
      );
    } finally {
      setIsWalletUpdating(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user?.id || deletingUserId) return;

    const shouldDelete = window.confirm(
      `Delete user "${user?.username || user?.email}" permanently? This action cannot be undone.`,
    );
    if (!shouldDelete) return;

    const token = useUserStore.getState().token;
    if (!token) return;

    try {
      setDeletingUserId(user.id);
      setUpdateMessage("");
      await deleteAdminUser(token, user.id);

      if (selectedUser?.id === user.id) {
        handleCloseModal();
      }

      setUsers((prevUsers) => prevUsers.filter((item) => item.id !== user.id));
      await fetchUsers();
      setUpdateMessage("User deleted successfully.");
    } catch (error) {
      console.error("Failed to delete user:", error);
      setUpdateMessage(
        error?.response?.data?.detail || "Failed to delete user",
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleBlockUnblock = async (user) => {
    if (!user?.id || blockingUserId) return;

    const isBlocked = !!user.blocked_at;
    const action = isBlocked ? "unblock" : "block";
    const shouldProceed = window.confirm(
      `${isBlocked ? "Unblock" : "Block"} user "${user?.username || user?.email}"? ${isBlocked ? "They will regain access to the platform." : "They will be locked out of the platform immediately."}`,
    );
    if (!shouldProceed) return;

    const token = useUserStore.getState().token;
    if (!token) return;

    try {
      setBlockingUserId(user.id);
      setBlockMessage("");

      if (isBlocked) {
        await unblockUser(token, user.id);
      } else {
        await blockUser(token, user.id);
      }

      setBlockMessage(`User ${isBlocked ? "unblocked" : "blocked"} successfully.`);

      if (selectedUser?.id === user.id) {
        const updatedUser = await getUser(token, user.id);
        if (updatedUser) {
          setSelectedUser(updatedUser);
          setUserStatus(normalizeStatus(updatedUser?.status || updatedUser?.kyc?.status));
          setUserIssueNote(String(updatedUser?.issue_note || ""));
          setWalletForm(buildWalletForm(updatedUser?.wallets));
        }
      }

      await fetchUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      setBlockMessage(error?.response?.data?.detail || `Failed to ${action} user`);
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleProfileUpdate = async (userId, profileForm) => {
    const token = useUserStore.getState().token;
    if (!token) return;

    try {
      setIsProfileUpdating(true);
      setProfileUpdateMessage("");

      const response = await updateUserProfile(token, userId, profileForm);

      setProfileUpdateMessage(response.message || "Profile updated successfully");

      const updatedUser = await getUser(token, userId);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }

      await fetchUsers();
    } catch (error) {
      console.error("Failed to update profile:", error);
      const detail = error?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
        : detail || "Failed to update profile";
      setProfileUpdateMessage(msg);
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const handlePasswordReset = async (userId, newPassword) => {
    const token = useUserStore.getState().token;
    if (!token) return;

    try {
      setIsPasswordResetting(true);
      setPasswordResetMessage("");

      const response = await adminResetPassword(token, userId, newPassword);
      setPasswordResetMessage(response.message || "Password reset successfully");
    } catch (error) {
      console.error("Failed to reset password:", error);
      const detail = error?.response?.data?.detail;
      setPasswordResetMessage(detail || "Failed to reset password");
    } finally {
      setIsPasswordResetting(false);
    }
  };

  const isQualifiedField = (value) => {
    if (value === null || value === undefined) return false;
    const normalized = String(value).trim();
    return normalized !== "" && normalized.toLowerCase() !== "n/a";
  };

  const getAllPendingUsers = async (token) => {
    const pendingUsers = [];
    let page = 1;
    const limitPerPage = 50;
    const maxPages = 500;

    while (page <= maxPages) {
      const res = await getAllUsers(token, {
        page,
        status: "pending",
      });

      const pageUsers = res?.data?.users || [];
      if (!pageUsers.length) break;

      pendingUsers.push(...pageUsers);

      if (pageUsers.length < limitPerPage) break;
      page += 1;
    }

    return pendingUsers;
  };

  const handleApproveQualified = async () => {
    const token = useUserStore.getState().token;
    if (!token || isBulkApproving) return;

    try {
      setIsBulkApproving(true);
      setBulkUpdateMessage("");

      const pendingUsers = await getAllPendingUsers(token);

      if (!pendingUsers.length) {
        setBulkUpdateMessage("No pending users found.");
        return;
      }

      const detailResults = await Promise.allSettled(
        pendingUsers.map((u) => getUser(token, u.id)),
      );

      const qualifiedUsers = detailResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((details) => {
          const kyc = details?.kyc;
          return (
            details?.id &&
            kyc?.status === "pending" &&
            isQualifiedField(kyc?.document_type) &&
            isQualifiedField(kyc?.country) &&
            isQualifiedField(kyc?.phone_number)
          );
        });

      if (!qualifiedUsers.length) {
        setBulkUpdateMessage(
          "No qualified pending users found (Document Type/Country/Phone required).",
        );
        await fetchUsers();
        return;
      }

      const approveResults = await Promise.allSettled(
        qualifiedUsers.map((u) => updateKYCStatus(token, u.id, "approved")),
      );

      const approvedCount = approveResults.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failedCount = qualifiedUsers.length - approvedCount;
      const skippedCount = pendingUsers.length - qualifiedUsers.length;

      setBulkUpdateMessage(
        `Approved ${approvedCount} qualified pending user(s). Skipped ${skippedCount} unqualified user(s).${
          failedCount > 0 ? ` Failed ${failedCount} update(s).` : ""
        }`,
      );

      if (
        selectedUser &&
        qualifiedUsers.some((qualifiedUser) => qualifiedUser.id === selectedUser.id)
      ) {
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                status: "approved",
                kyc: {
                  ...prev.kyc,
                  status: "approved",
                },
              }
            : prev,
        );
        setUserStatus("approved");
      }

      await fetchUsers();
    } catch (error) {
      console.error("Failed to bulk approve qualified users:", error);
      setBulkUpdateMessage("Failed to approve qualified users.");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (normalizeStatus(status)) {
      case "approved":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "pending":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "rejected":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "not_submitted":
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
      case "issue":
        return "text-orange-300 bg-orange-500/10 border-orange-500/30";
      case "inactive":
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const displayedUsers =
    statusFilter === "all"
      ? users
      : users.filter((u) => normalizeStatus(u?.status) === statusFilter);

  const displayedStatusCounts =
    statusFilter === "all"
      ? statusCounts
      : {
          approved: statusFilter === "approved" ? totalUsers : 0,
          pending: statusFilter === "pending" ? totalUsers : 0,
          rejected: statusFilter === "rejected" ? totalUsers : 0,
          not_submitted: statusFilter === "not_submitted" ? totalUsers : 0,
          issue: statusFilter === "issue" ? totalUsers : 0,
          inactive: statusFilter === "inactive" ? totalUsers : 0,
        };



  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            User{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="text-gray-400">Manage all users and verifications</p>
        </div>

        <button
          type="button"
          onClick={handleApproveQualified}
          disabled={isBulkApproving || loading}
          className="w-full md:w-auto px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 text-white border border-emerald-400/30 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isBulkApproving ? "Approving..." : "Approve Qualified"}
        </button>
      </div>

      {bulkUpdateMessage && (
        <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
          {bulkUpdateMessage}
        </div>
      )}

      {updateMessage && !selectedUser && (
        <div className="mb-4 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-gray-200">
          {updateMessage}
        </div>
      )}
      {blockMessage && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {blockMessage}
        </div>
      )}

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // reset page
              }}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto flex-nowrap pb-1 touch-scroll">
          {["all", "approved", "pending", "rejected", "not_submitted", "issue", "inactive", "blocked"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1); // reset page
              }}
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                statusFilter === status
                  ? status === "approved"
                    ? "bg-green-500/20 border border-green-500/50 text-green-400"
                    : status === "pending"
                      ? "bg-yellow-500/20 border border-yellow-500/50 text-yellow-400"
                    : status === "rejected"
                        ? "bg-red-500/20 border border-red-500/50 text-red-400"
                      : status === "issue"
                        ? "bg-orange-500/20 border border-orange-500/50 text-orange-300"
                      : status === "inactive"
                        ? "bg-gray-500/20 border border-gray-500/50 text-gray-300"
                      : status === "blocked"
                        ? "bg-red-500/20 border border-red-500/50 text-red-400"
                        : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                  : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {status === "pending" ? "Processing" : status === "not_submitted" ? "Not Uploaded" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10">
          <div className="text-2xl font-bold text-white">{totalUsers}</div>
          <div className="text-sm text-gray-400">Total Users</div>
        </div>

        {["approved", "pending", "rejected", "not_submitted", "issue", "inactive"].map((status) => (
          <div
            key={status}
            className={`p-4 rounded-xl bg-gradient-to-br ${
              status === "approved"
                ? "from-green-500/10 to-green-500/5 border-green-500/20"
                : status === "pending"
                  ? "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20"
                  : status === "rejected"
                    ? "from-red-500/10 to-red-500/5 border-red-500/20"
                    : status === "issue"
                      ? "from-orange-500/10 to-orange-500/5 border-orange-500/20"
                      : "from-gray-500/10 to-gray-500/5 border-gray-500/20"
            } border`}
          >
            <div
              className={`text-2xl font-bold ${
                status === "approved"
                  ? "text-green-400"
                  : status === "pending"
                    ? "text-yellow-400"
                    : status === "rejected"
                      ? "text-red-400"
                      : status === "issue"
                        ? "text-orange-300"
                        : "text-gray-300"
              }`}
            >
              {displayedStatusCounts[status] ?? 0}
            </div>
            <div className="text-sm text-gray-400 capitalize">{status === "pending" ? "Processing" : status === "not_submitted" ? "Not Uploaded" : status}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
        <div className="responsive-table-wrapper">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  Name
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  Username
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  Email
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  Status
                </th>
                <th className="text-center p-4 text-sm font-semibold text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-6 text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-6 text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                displayedUsers.map((user) => {
                  const normalizedStatus = normalizeStatus(user?.status);
                  return (
                  <tr
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td data-label="Name" className="p-4 text-white font-medium">
                      {user.full_name}
                    </td>
                    <td data-label="Username" className="p-4 text-gray-400">{user.username}</td>
                    <td data-label="Email" className="p-4 text-gray-400">{user.email}</td>
                    <td data-label="Status" className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(normalizedStatus)}`}
                        >
                          {normalizedStatus === "inactive"
                            ? "INACTIVE"
                            : normalizedStatus === "pending"
                              ? "PROCESSING"
                              : normalizedStatus === "not_submitted"
                                ? "NOT UPLOADED"
                                : normalizedStatus.toUpperCase()}
                        </span>
                        {user.has_kyc_submitted && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 border border-blue-500/40 text-blue-300">
                            KYC
                          </span>
                        )}
                        {user.blocked_at && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 border border-red-500/40 text-red-300">
                            BLOCKED
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Action" className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleBlockUnblock(user);
                        }}
                        disabled={blockingUserId === user.id}
                        className={`inline-flex items-center justify-center rounded-lg border p-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                          user.blocked_at
                            ? "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                            : "border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                        }`}
                        title={user.blocked_at ? "Unblock user" : "Block user"}
                        aria-label={user.blocked_at ? "Unblock user" : "Block user"}
                      >
                        {user.blocked_at ? (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteUser(user);
                        }}
                        disabled={deletingUserId === user.id}
                        className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete user"
                        aria-label="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <UserDetailModal
        selectedUser={selectedUser}
        onClose={handleCloseModal}
        userStatus={userStatus}
        setUserStatus={setUserStatus}
        userIssueNote={userIssueNote}
        setUserIssueNote={setUserIssueNote}
        handleStatusChange={handleStatusChange}
        isUpdating={isUpdating}
        updateMessage={updateMessage}
        walletForm={walletForm}
        onWalletFieldChange={handleWalletFieldChange}
        onWalletUpdate={handleWalletUpdate}
        isWalletUpdating={isWalletUpdating}
        walletUpdateMessage={walletUpdateMessage}
        hasWalletChanges={hasWalletChanges}
        onBlockUnblock={handleBlockUnblock}
        isBlocking={blockingUserId === selectedUser?.id}
        onProfileUpdate={handleProfileUpdate}
        isProfileUpdating={isProfileUpdating}
        profileUpdateMessage={profileUpdateMessage}
        onPasswordReset={handlePasswordReset}
        isPasswordResetting={isPasswordResetting}
        passwordResetMessage={passwordResetMessage}
      />
    </div>
  );
}
