import useUserStore from "../store/userStore.js";
import api from "./axiosInstance.js";

const normalizeAccessToken = (value) => {
  if (!value) return null;

  let token = String(value).trim();

  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1).trim();
  }

  return token || null;
};

const authHeaders = () => {
  const token = normalizeAccessToken(useUserStore.getState().token);
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

export const refreshUserStore = () => {
  return api.get("v1/user/me", authHeaders());
};

export const getReferralNetwork = () => {
  return api.get("v1/user/referral-network", authHeaders());
};

export const getActiveDepositNetworks = () => {
  return api.get("v1/deposit-networks/active", authHeaders());
};

export const getActiveWithdrawalMethods = () => {
  return api.get("v1/withdrawal-methods/active", authHeaders());
};

export const createDepositRequest = (payload) => {
  return api.post("v1/deposits/", payload, authHeaders());
};

export const getMyDeposits = () => {
  return api.get("v1/deposits/my", authHeaders());
};

export const createWithdrawalRequest = (payload) => {
  return api.post("v1/withdrawals/", payload, authHeaders());
};

export const getMyWithdrawals = () => {
  return api.get("v1/withdrawals/my", authHeaders());
};

export const startMining = () => {
  return api.post("v1/user/start-mining", {}, authHeaders());
};

export const claimMining = () => {
  return api.post("v1/user/claim-mining", {}, authHeaders());
};

export const getMiningStatus = () => {
  return api.get("v1/user/mining-status", authHeaders());
};

export const buyInvestment = (payload) => {
  return api.post("v1/investments/buy", payload, authHeaders());
};

export const getMyInvestments = () => {
  return api.get("v1/investments/my", authHeaders());
};

export const getMyInvestmentDetails = (investmentId) => {
  return api.get(`v1/investments/${investmentId}`, authHeaders());
};

export const getMyEarningsHistory = () => {
  return api.get("v1/user/earnings-history", authHeaders());
};

export const getMyProfitHistory = () => {
  return api.get("v1/user/profit-history", authHeaders());
};

export const getActiveAnnouncement = (lang) => {
  const params = lang ? '?lang=' + lang : '';
  return api.get('v1/announcements/active' + params, authHeaders());
};

export const getUserStatistics = () => {
  return api.get("v1/user/statistics", authHeaders());
};

export const getUserList = (page = 1, limit = 50) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("limit", limit);
  return api.get(`v1/user/list?${params.toString()}`, authHeaders());
};

export const getPackages = () => {
  return api.get("v1/investments/packages", authHeaders());
};

export const getNextCaptcha = () => {
  return api.get("v1/captcha/next", authHeaders());
};

export const startAd = () => {
  return api.get("v1/ads/start", authHeaders());
};

export const completeAd = (adViewId) => {
  return api.post(`v1/ads/complete?ad_view_id=${adViewId}`, {}, authHeaders());
};

export const getAdStats = () => {
  return api.get("v1/ads/stats", authHeaders());
};

export const submitCaptcha = (data) => {
  return api.post("v1/captcha/submit", data, authHeaders());
};

export const getCaptchaStats = () => {
  return api.get("v1/captcha/stats", authHeaders());
};

export const walletTransfer = (payload) => {
  return api.post("v1/user/wallet-transfer", payload, authHeaders());
};

export const convertOFAtoUSDT = (payload) => {
  return api.post("v1/user/convert-ofa-to-usdt", payload, authHeaders());
};

export const getOFAConversionRate = () => {
  return api.get("v1/user/conversion-rate", authHeaders());
};

export const updateProfileImage = (payload) => {
  return api.post("v1/user/profile-image", payload, authHeaders());
};

export const sendFunds = (payload) => {
  return api.post("v1/user/send-funds", payload, authHeaders());
};

export const getTransferHistory = () => {
  return api.get("v1/user/transfers", authHeaders());
};

export const searchUsers = (query) => {
  return api.get("v1/user/list", { params: { search: query, limit: 50 }, ...authHeaders() });
};

export const getReferralBonuses = (params = {}) => {
  return api.get("v1/user/referral-bonuses", { params, ...authHeaders() });
};

export const getGenerationBonuses = (params = {}) => {
  return api.get("v1/user/generation-bonuses", { params, ...authHeaders() });
};

export const getUserRankInfo = () => {
  return api.get("v1/ranks/my-rank", authHeaders());
};

export const getAllRanks = () => {
  return api.get("v1/ranks/", authHeaders());
};

export const getMyRankHistory = () => {
  return api.get("v1/ranks/my-history", authHeaders());
};

export const getMyMatchingBonuses = (params = {}) => {
  return api.get("v1/ranks/my-bonuses", { params, ...authHeaders() });
};

export const getNetworkAnalytics = () => api.get("v1/user/network-analytics", authHeaders());
export const getLevelAnalytics = (level) => api.get(`v1/user/level-analytics/${level}`, authHeaders());
export const getMatchingWallet = () => api.get("v1/user/matching-wallet", authHeaders());
export const getFeeInfo = () => api.get("v1/user/fee-info", authHeaders());
export const transferMatchingBonus = (payload) => api.post("v1/user/transfer-matching-bonus", payload, authHeaders());
export const getMyBankInfo = () => api.get("v1/bank-info/my", authHeaders());
export const submitBankInfo = (payload) => api.post("v1/bank-info/", payload, authHeaders());

export const getMyCaptchaEarnings = () => api.get("v1/captcha/my-earnings", authHeaders());
export const getMyMiningHistory = () => api.get("v1/user/mining-history", authHeaders());
export const getMyAdViewHistory = () => api.get("v1/ads/my-history", authHeaders());
export const getMyInvoiceHistory = (invoiceType) => {
  const params = invoiceType ? `?invoice_type=${invoiceType}` : "";
  return api.get(`v1/invoice/my${params}`, authHeaders());
};
export const getVendorWithdraws = () => api.get("v1/marketplace/vendor/withdraws", authHeaders());
export const getEcommerceWalletTransactions = () => api.get("v1/marketplace/wallet-transactions", authHeaders());
export const getMyWalletTransactions = () => api.get("v1/user/wallet-transactions", authHeaders());

export const getLiveStats = () => api.get("v1/live-stats/");
