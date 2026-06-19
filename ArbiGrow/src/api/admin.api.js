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
  { page = 1, search = "", status = "" } = {},
) => {
  const params = new URLSearchParams();

  params.append("page", page);

  // Only include search if it has value
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  // Only include status if not "all"
  if (status && status !== "all") {
    params.append("status", status);
  }

  const res = await api.get(
    `v1/admin/users?${params.toString()}`,
    authHeaders(token),
  );

  return res || [];
};

export const getUser = async (token, user_Id) => {
  const res = await api.get(`v1/admin/users/${user_Id}`, authHeaders(token));

  // return only user data
  return res.data || {}; // single user object
};

export const updateKYCStatus = async (
  token,
  user_Id,
  statusValue,
  issueNote = "",
) => {
  const payload = { status: statusValue };
  if (String(statusValue || "").toLowerCase() === "issue") {
    payload.issue_note = String(issueNote || "").trim();
  }

  const res = await api.patch(
    `v1/admin/users/${user_Id}/kyc-status`,
    payload,
    authHeaders(token),
  );

  // return only user data
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

// Platform Statistics
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

// ── Package Management ──────────────────────────────────────────────────

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

// ── Ad Management (YouTube Ads) ──────────────────────────────────────────────────

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

// ── GA4 Analytics ────────────────────────────────────────────────

export const getAnalyticsOverview = async (token) => {
  const res = await api.get("v1/admin/analytics/overview", authHeaders(token));
  return res.data || {};
};

export const getAnalyticsRealtime = async (token) => {
  const res = await api.get("v1/admin/analytics/realtime", authHeaders(token));
  return res.data || {};
};

export const getAnalyticsCountries = async (token) => {
  const res = await api.get("v1/admin/analytics/countries", authHeaders(token));
  return res.data || {};
};

export const getAnalyticsDevices = async (token) => {
  const res = await api.get("v1/admin/analytics/devices", authHeaders(token));
  return res.data || {};
};

export const getAnalyticsTrafficSources = async (token) => {
  const res = await api.get("v1/admin/analytics/traffic-sources", authHeaders(token));
  return res.data || {};
};

// ── Task Management (REMOVED — replaced by Captcha Typing System) ─────────────────
