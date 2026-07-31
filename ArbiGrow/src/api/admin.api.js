import api from "./axiosInstance.js";

const authHeaders = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};

export const getAllUsers = async (
  token,
  { page = 1, search = "", status = "", has_kyc = false } = {},
) => {
  const params = new URLSearchParams();

  params.append("page", page);

  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  if (status && status !== "all") {
    params.append("status", status);
  }

  if (has_kyc) {
    params.append("has_kyc", "true");
  }

  const res = await api.get(
    `v1/admin/users?${params.toString()}`,
    authHeaders(token),
  );

  return res || [];
};

export const getUser = async (token, user_Id) => {
  const res = await api.get(`v1/admin/users/${user_Id}`, authHeaders(token));
  return res.data || {};
};

export const updateKYCStatus = async (
  token,
  user_Id,
  statusValue,
  issueNote = "",
  adminNote = "",
) => {
  const payload = { status: statusValue };
  if (String(statusValue || "").toLowerCase() === "issue") {
    payload.issue_note = String(issueNote || "").trim();
  }
  if (String(adminNote || "").trim()) {
    payload.admin_note = String(adminNote || "").trim();
  }

  const res = await api.patch(
    `v1/admin/users/${user_Id}/kyc-status`,
    payload,
    authHeaders(token),
  );

  return res.data || {};
};

export const deleteAdminUser = async (token, userId) => {
  const res = await api.delete(`v1/admin/users/${userId}`, authHeaders(token));
  return res.data || {};
};

export const getDepositNetworks = async (token) => {
  const res = await api.get("v1/deposit-networks/", authHeaders(token));
  return res.data || {};
};

export const createDepositNetwork = async (token, payload) => {
  const res = await api.post(
    "v1/deposit-networks/",
    payload,
    authHeaders(token),
  );
  return res.data || {};
};

export const updateDepositNetwork = async (token, networkId, payload) => {
  const res = await api.put(
    `v1/deposit-networks/${networkId}`,
    payload,
    authHeaders(token),
  );
  return res.data || {};
};

export const deleteDepositNetwork = async (token, networkId) => {
  const res = await api.delete(
    `v1/deposit-networks/${networkId}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const getWithdrawalMethods = async (token) => {
  const res = await api.get("v1/withdrawal-methods/", authHeaders(token));
  return res.data || {};
};

export const createWithdrawalMethod = async (token, payload) => {
  const res = await api.post("v1/withdrawal-methods/", payload, authHeaders(token));
  return res.data || {};
};

export const updateWithdrawalMethod = async (token, methodId, payload) => {
  const res = await api.put(`v1/withdrawal-methods/${methodId}`, payload, authHeaders(token));
  return res.data || {};
};

export const deleteWithdrawalMethod = async (token, methodId) => {
  const res = await api.delete(`v1/withdrawal-methods/${methodId}`, authHeaders(token));
  return res.data || {};
};

export const getAdminDeposits = async (
  token,
  { page = 1, limit = 50, status = "" } = {},
) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("limit", limit);

  if (status && status.trim() !== "") {
    params.append("status", status.trim());
  }

  const res = await api.get(
    `v1/deposits/admin?${params.toString()}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const updateDepositStatus = async (token, depositId, status) => {
  const res = await api.patch(
    `v1/deposits/${depositId}`,
    { status },
    authHeaders(token),
  );
  return res.data || {};
};

export const getAdminWithdrawals = async (
  token,
  { page = 1, limit = 50, status = "" } = {},
) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("limit", limit);

  if (status && status.trim() !== "") {
    params.append("status", status.trim());
  }

  const res = await api.get(
    `v1/withdrawals/admin?${params.toString()}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const updateWithdrawalStatus = async (token, withdrawalId, status) => {
  const res = await api.patch(
    `v1/withdrawals/${withdrawalId}`,
    { status },
    authHeaders(token),
  );
  return res.data || {};
};

export const updateUserWallets = async (token, user_Id, payload) => {
  const res = await api.patch(
    `v1/admin/users/${user_Id}/wallets`,
    payload,
    authHeaders(token),
  );
  return res.data || {};
};

export const getAdminRoiSetting = async (token) => {
  const res = await api.get("v1/admin/roi/", authHeaders(token));
  return res.data || {};
};

export const updateAdminRoiSetting = async (token, percentage) => {
  const res = await api.put(
    "v1/admin/roi/",
    { percentage },
    authHeaders(token),
  );
  return res.data || {};
};

export const applyAdminRoiToAll = async (token) => {
  const res = await api.post("v1/admin/roi/apply", {}, authHeaders(token));
  return res.data || {};
};

export const applyRoiByPackage = async (token, packageName, percentage) => {
  const res = await api.post(
    "v1/admin/roi/apply-by-package",
    { package_name: packageName, percentage },
    authHeaders(token),
  );
  return res.data || {};
};

export const getScheduledRoi = async (token) => {
  const res = await api.get("v1/admin/roi/scheduled", authHeaders(token));
  return res.data || {};
};

export const getAdminInvestments = async (
  token,
  { page = 1, statusFilter = "", search = "" } = {},
) => {
  const params = new URLSearchParams();
  params.append("page", page);

  if (statusFilter && statusFilter !== "all") {
    params.append("status_filter", statusFilter);
  }

  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  const res = await api.get(
    `v1/admin/investments/?${params.toString()}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const getAdminInvestmentDetails = async (token, investmentId) => {
  const res = await api.get(
    `v1/admin/investments/${investmentId}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const addAdminInvestmentProfit = async (
  token,
  investmentId,
  percentage,
) => {
  const res = await api.post(
    `v1/admin/investments/${investmentId}/add-profit`,
    { percentage },
    authHeaders(token),
  );
  return res.data || {};
};

export const getAdminDashboardOverview = async (token) => {
  const res = await api.get("v1/admin/dashboard-overview", authHeaders(token));
  return res.data || {};
};

export const getUserStatistics = async (token) => {
  const res = await api.get("v1/admin/user-statistics", authHeaders(token));
  return res.data || {};
};

export const getAdminRealtimeStats = async (token) => {
  const res = await api.get("v1/admin/realtime-stats", authHeaders(token));
  return res.data || {};
};

export const getPlatformStats = async (token) => {
  const res = await api.get("v1/platform-stats/", authHeaders(token));
  return res.data || {};
};

export const createPlatformStats = async (token, payload) => {
  const res = await api.post(
    "v1/platform-stats/",
    payload,
    authHeaders(token),
  );
  return res.data || {};
};

export const updatePlatformStats = async (token, payload) => {
  const res = await api.patch(
    "v1/platform-stats/",
    payload,
    authHeaders(token),
  );
  return res.data || {};
};

export const getAdminAnnouncements = async (token) => {
  const res = await api.get("v1/announcements/admin", authHeaders(token));
  return res.data || { data: [] };
};

export const createAnnouncement = async (token, formData) => {
  const res = await api.post(
    "v1/announcements/admin",
    formData,
    {
      ...authHeaders(token),
      headers: {
        ...(authHeaders(token).headers || {}),
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return res.data || {};
};

export const updateAnnouncement = async (token, announcementId, formData) => {
  const res = await api.patch(
    `v1/announcements/admin/${announcementId}`,
    formData,
    {
      ...authHeaders(token),
      headers: {
        ...(authHeaders(token).headers || {}),
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return res.data || {};
};

export const updateAnnouncementStatus = async (
  token,
  announcementId,
  isActive,
) => {
  const res = await api.patch(
    `v1/announcements/admin/${announcementId}/status`,
    { is_active: Boolean(isActive) },
    authHeaders(token),
  );
  return res.data || {};
};

export const deleteAnnouncement = async (token, announcementId) => {
  const res = await api.delete(
    `v1/announcements/admin/${announcementId}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const getSystemConfig = async (token) => {
  const res = await api.get("v1/admin/system-config", authHeaders(token));
  return res.data || {};
};

export const updateSystemConfig = async (token, key, value) => {
  const res = await api.put(
    `v1/admin/system-config/${key}`,
    null,
    { params: { value }, ...authHeaders(token) },
  );
  return res.data || {};
};

export const getMiningConfig = async (token) => {
  const res = await api.get("v1/admin/mining/config", authHeaders(token));
  return res.data || {};
};

export const updateMiningConfig = async (token, key, value) => {
  const res = await api.put(
    `v1/admin/mining/config/${key}`,
    null,
    { params: { value }, ...authHeaders(token) },
  );
  return res.data || {};
};

export const getMiningStats = async (token, page = 1) => {
  const res = await api.get(
    `v1/admin/mining/stats?page=${page}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const getFeeConfig = async (token) => {
  const res = await api.get("v1/admin/fee-config", authHeaders(token));
  return res.data || {};
};

export const updateFeeConfig = async (token, key, value) => {
  const res = await api.put(`v1/admin/fee-config/${key}`, { value }, authHeaders(token));
  return res.data || {};
};

export const getKycPackages = async (token) => {
  const res = await api.get("v1/admin/kyc-packages", authHeaders(token));
  return res.data || { data: [] };
};

export const createKycPackage = async (token, data) => {
  const res = await api.post("v1/admin/kyc-packages", null, { params: data, ...authHeaders(token) });
  return res.data || {};
};

export const updateKycPackage = async (token, packageId, data) => {
  const res = await api.put(`v1/admin/kyc-packages/${packageId}`, null, { params: data, ...authHeaders(token) });
  return res.data || {};
};

export const deleteKycPackage = async (token, packageId) => {
  const res = await api.delete(`v1/admin/kyc-packages/${packageId}`, authHeaders(token));
  return res.data || {};
};

export const getAdminPackages = async (token) => {
  const res = await api.get("v1/admin/packages", authHeaders(token));
  return res.data || {};
};

export const updateAdminPackage = async (token, packageId, data) => {
  const res = await api.put(
    `v1/admin/packages/${packageId}`,
    null,
    { params: data, ...authHeaders(token) },
  );
  return res.data || {};
};

export const toggleAdminPackage = async (token, packageId) => {
  const res = await api.patch(
    `v1/admin/packages/${packageId}/toggle`,
    {},
    authHeaders(token),
  );
  return res.data || {};
};

export const getPackageSubscribers = async (token, packageId, page = 1) => {
  const res = await api.get(
    `v1/admin/packages/${packageId}/subscribers?page=${page}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const createAdminPackage = async (token, data) => {
  const res = await api.post(
    "v1/admin/packages",
    null,
    { params: data, ...authHeaders(token) },
  );
  return res.data || {};
};

export const deleteAdminPackage = async (token, packageId) => {
  const res = await api.delete(
    `v1/admin/packages/${packageId}`,
    authHeaders(token),
  );
  return res.data || {};
};

export const getPackageStats = async (token) => {
  const res = await api.get(
    "v1/admin/packages/stats",
    authHeaders(token),
  );
  return res.data || {};
};

export const bulkTogglePackages = async (token, packageIds, isActive) => {
  const res = await api.patch(
    "v1/admin/packages/bulk-toggle",
    { package_ids: packageIds, is_active: isActive },
    authHeaders(token),
  );
  return res.data || {};
};

export const getAdminAds = async (token, page = 1) => {
  const res = await api.get(`v1/admin/ads?page=${page}&limit=50`, authHeaders(token));
  return res.data || { ads: [], total: 0 };
};

export const createAdminAd = async (token, data) => {
  const res = await api.post("v1/admin/ads", null, { params: data, ...authHeaders(token) });
  return res.data || {};
};

export const updateAdminAd = async (token, adId, data) => {
  const res = await api.put(`v1/admin/ads/${adId}`, null, { params: data, ...authHeaders(token) });
  return res.data || {};
};

export const toggleAdminAd = async (token, adId) => {
  const res = await api.patch(`v1/admin/ads/${adId}/toggle`, {}, authHeaders(token));
  return res.data || {};
};

export const deleteAdminAd = async (token, adId) => {
  const res = await api.delete(`v1/admin/ads/${adId}`, authHeaders(token));
  return res.data || {};
};

export const getSelfAnalyticsSummary = async (token) => {
  const res = await api.get("v1/admin/self-analytics/summary", authHeaders(token));
  return res.data || {};
};

export const getSelfAnalyticsCountries = async (token, limit = 10) => {
  const res = await api.get(`v1/admin/self-analytics/countries?limit=${limit}`, authHeaders(token));
  return res.data || {};
};

export const getSelfAnalyticsDevices = async (token) => {
  const res = await api.get("v1/admin/self-analytics/devices", authHeaders(token));
  return res.data || {};
};

export const getSelfAnalyticsSources = async (token) => {
  const res = await api.get("v1/admin/self-analytics/sources", authHeaders(token));
  return res.data || {};
};

export const getSelfAnalyticsDaily = async (token, days = 30) => {
  const res = await api.get(`v1/admin/self-analytics/charts/daily?days=${days}`, authHeaders(token));
  return res.data || {};
};

export const getSelfAnalyticsWeekly = async (token, weeks = 12) => {
  const res = await api.get(`v1/admin/self-analytics/charts/weekly?weeks=${weeks}`, authHeaders(token));
  return res.data || {};
};

export const getSelfAnalyticsMonthly = async (token, months = 12) => {
  const res = await api.get(`v1/admin/self-analytics/charts/monthly?months=${months}`, authHeaders(token));
  return res.data || {};
};

export const getBlockedAccounts = async (token, { page = 1, limit = 50 } = {}) => {
  const res = await api.get(
    `v1/admin/security/blocked-accounts?page=${page}&limit=${limit}`,
    authHeaders(token),
  );
  return res.data || { users: [], total: 0 };
};

export const unblockAccount = async (token, userId) => {
  const res = await api.patch(
    `v1/admin/security/unblock/${userId}`,
    {},
    authHeaders(token),
  );
  return res.data || {};
};

export const getSecurityLogs = async (token, { page = 1, limit = 50, event_type = "", user_id = "", search = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("limit", limit);
  if (event_type) params.append("event_type", event_type);
  if (user_id) params.append("user_id", user_id);
  if (search) params.append("search", search);
  const res = await api.get(
    `v1/admin/security/logs?${params.toString()}`,
    authHeaders(token),
  );
  return res.data || { logs: [], total: 0 };
};

export const getSecurityEventTypes = async (token) => {
  const res = await api.get("v1/admin/security/event-types", authHeaders(token));
  return res.data || { event_types: [] };
};

export const getSecuritySettings = async (token) => {
  const res = await api.get("v1/admin/security/settings", authHeaders(token));
  return res.data || {};
};

export const updateSecuritySettings = async (token, payload) => {
  const res = await api.put("v1/admin/security/settings", payload, authHeaders(token));
  return res.data || {};
};

export const getAdminRanks = async (token) => {
  const res = await api.get("v1/admin/ranks/", authHeaders(token));
  return res.data || [];
};

export const getAdminRank = async (token, rankId) => {
  const res = await api.get(`v1/admin/ranks/${rankId}`, authHeaders(token));
  return res.data || {};
};

export const createAdminRank = async (token, data) => {
  const res = await api.post("v1/admin/ranks/", data, authHeaders(token));
  return res.data || {};
};

export const updateAdminRank = async (token, rankId, data) => {
  const res = await api.put(`v1/admin/ranks/${rankId}`, data, authHeaders(token));
  return res.data || {};
};

export const deleteAdminRank = async (token, rankId) => {
  await api.delete(`v1/admin/ranks/${rankId}`, authHeaders(token));
};

export const getRankDistribution = async (token) => {
  const res = await api.get("v1/admin/ranks/distribution", authHeaders(token));
  return res.data || {};
};

export const getAllRankHistory = async (token, { user_id, page = 1, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (user_id) params.append("user_id", user_id);
  params.append("page", page);
  params.append("limit", limit);
  const res = await api.get(`v1/admin/ranks/history/all?${params.toString()}`, authHeaders(token));
  return res.data || [];
};

export const getAllMatchingBonuses = async (token, { user_id, rank_id, bonus_type, page = 1, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (user_id) params.append("user_id", user_id);
  if (rank_id) params.append("rank_id", rank_id);
  if (bonus_type) params.append("bonus_type", bonus_type);
  params.append("page", page);
  params.append("limit", limit);
  const res = await api.get(`v1/admin/ranks/bonuses/all?${params.toString()}`, authHeaders(token));
  return res.data || [];
};

export const getAdminBankInfoList = async (token) => {
  const res = await api.get("v1/bank-info/admin", authHeaders(token));
  return res.data || { data: [] };
};

export const updateBankInfoStatus = async (token, bankInfoId, status, adminNote) => {
  const res = await api.patch(
    `v1/bank-info/admin/${bankInfoId}`,
    { status, admin_note: adminNote || null },
    authHeaders(token),
  );
  return res.data || {};
};

export const blockUser = async (token, userId) => {
  const res = await api.post(`v1/admin/users/${userId}/block`, {}, authHeaders(token));
  return res.data || {};
};

export const unblockUser = async (token, userId) => {
  const res = await api.post(`v1/admin/users/${userId}/unblock`, {}, authHeaders(token));
  return res.data || {};
};

// ── Commission Configuration (Referral & Generation Bonuses) ──────────

export const getCommissionConfig = async (token) => {
  const res = await api.get("v1/admin/commission-config", authHeaders(token));
  return res.data || {};
};

export const updateCommissionConfig = async (token, key, value) => {
  const res = await api.put(
    `v1/admin/commission-config/${key}`,
    { value },
    authHeaders(token),
  );
  return res.data || {};
};
