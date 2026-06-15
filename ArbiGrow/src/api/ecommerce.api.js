import api from "./axiosInstance.js";
import useUserStore from "../store/userStore.js";

const authHeaders = () => {
  const token = useUserStore.getState().token;
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

export const registerSeller = (storeName, description) =>
  api.post(
    "v1/ecommerce/seller/register",
    null,
    { params: { store_name: storeName, description }, ...authHeaders() },
  );

export const getSellerProfile = () =>
  api.get("v1/ecommerce/seller/profile", authHeaders());

export const updateSellerProfile = (profileData) =>
  api.put("v1/ecommerce/seller/profile/update", profileData, authHeaders());

export const sellerSubmitForReview = () =>
  api.post("v1/ecommerce/seller/submit", null, authHeaders());

export const getSellerProfileCompletion = () =>
  api.get("v1/ecommerce/seller/profile/completion", authHeaders());

export const transferToEcommerce = (amount) =>
  api.post("v1/ecommerce/wallet/transfer", null, {
    params: { amount },
    ...authHeaders(),
  });

export const getEcommerceWallet = () =>
  api.get("v1/ecommerce/wallet/balance", authHeaders());

export const listProducts = (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.append("category", params.category);
  if (params.search) searchParams.append("search", params.search);
  if (params.sort) searchParams.append("sort", params.sort);
  if (params.page) searchParams.append("page", params.page);
  if (params.limit) searchParams.append("limit", params.limit);
  return api.get(`v1/ecommerce/products?${searchParams.toString()}`, authHeaders());
};

export const getProduct = (id) =>
  api.get(`v1/ecommerce/products/${id}`, authHeaders());

export const createProduct = (data) =>
  api.post("v1/ecommerce/products", null, { params: data, ...authHeaders() });

export const uploadProductImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("v1/ecommerce/products/upload-image", formData, {
    headers: { ...authHeaders().headers },
  });
};

export const updateProduct = (id, data) =>
  api.put(`v1/ecommerce/products/${id}`, null, { params: data, ...authHeaders() });

export const deleteProduct = (id) =>
  api.delete(`v1/ecommerce/products/${id}`, authHeaders());

export const getMyProducts = () =>
  api.get("v1/ecommerce/seller/products", authHeaders());

export const placeOrder = (payload) =>
  api.post("v1/ecommerce/orders", payload, authHeaders());

export const getMyOrders = () =>
  api.get("v1/ecommerce/orders", authHeaders());

export const getOrderDetail = (id) =>
  api.get(`v1/ecommerce/orders/${id}`, authHeaders());

export const getSellerOrders = () =>
  api.get("v1/ecommerce/seller/orders", authHeaders());

export const getEcommerceConfig = () =>
  api.get("v1/ecommerce/config", authHeaders());

// Admin endpoints
export const adminListSellers = (status) => {
  const params = status ? `?status_filter=${status}` : "";
  return api.get(`v1/ecommerce/admin/sellers${params}`, authHeaders());
};

export const adminUpdateSellerStatus = (sellerId, status, rejectionReason) => {
  const params = { status };
  if (rejectionReason) params.rejection_reason = rejectionReason;
  return api.patch(`v1/ecommerce/admin/sellers/${sellerId}/status`, null, {
    params,
    ...authHeaders(),
  });
};

export const adminGetSellerStats = () =>
  api.get("v1/ecommerce/admin/sellers/stats", authHeaders());

export const adminGetEcommerceConfig = () =>
  api.get("v1/ecommerce/admin/ecommerce-config", authHeaders());

export const adminUpdateEcommerceConfig = (signupBonusArbx) =>
  api.put("v1/ecommerce/admin/ecommerce-config", null, {
    params: { signup_bonus_arbx: signupBonusArbx },
    ...authHeaders(),
  });

export const adminGetSellerProducts = (sellerId) =>
  api.get(`v1/ecommerce/admin/sellers/${sellerId}/products`, authHeaders());
