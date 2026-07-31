import api from "./axiosInstance.js"
import useUserStore from "../store/userStore.js"

const authHeaders = () => {
  const token = useUserStore.getState().token
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

// ── Categories ────────────────────────────────────────────
export const getCategories = () =>
  api.get("v1/marketplace/categories")

export const adminGetCategories = () =>
  api.get("v1/marketplace/admin/categories", authHeaders())

export const adminCreateCategory = (data) =>
  api.post("v1/marketplace/admin/categories", data, authHeaders())

export const adminUpdateCategory = (id, data) =>
  api.put(`v1/marketplace/admin/categories/${id}`, data, authHeaders())

export const adminDeleteCategory = (id) =>
  api.delete(`v1/marketplace/admin/categories/${id}`, authHeaders())

export const adminUploadCategoryImage = (file) => {
  const fd = new FormData()
  fd.append("file", file)
  return api.post("v1/marketplace/admin/categories/image", fd, {
    headers: { ...authHeaders().headers, "Content-Type": "multipart/form-data" },
  })
}

// ── Brands ────────────────────────────────────────────────
export const getBrands = () =>
  api.get("v1/marketplace/brands")

export const adminGetBrands = () =>
  api.get("v1/marketplace/admin/brands", authHeaders())

export const adminCreateBrand = (data) =>
  api.post("v1/marketplace/admin/brands", data, authHeaders())

export const adminUpdateBrand = (id, data) =>
  api.put(`v1/marketplace/admin/brands/${id}`, data, authHeaders())

export const adminDeleteBrand = (id) =>
  api.delete(`v1/marketplace/admin/brands/${id}`, authHeaders())

export const adminUploadBrandLogo = (file) => {
  const fd = new FormData()
  fd.append("file", file)
  return api.post("v1/marketplace/admin/brands/logo", fd, {
    headers: { ...authHeaders().headers, "Content-Type": "multipart/form-data" },
  })
}

// ── Products (Marketplace) ────────────────────────────────
export const marketplaceListProducts = (params = {}) => {
  const sp = new URLSearchParams()
  if (params.category) sp.append("category", params.category)
  if (params.search) sp.append("search", params.search)
  if (params.min_price) sp.append("min_price", params.min_price)
  if (params.max_price) sp.append("max_price", params.max_price)
  if (params.sort_by) sp.append("sort_by", params.sort_by)
  if (params.page) sp.append("page", params.page)
  if (params.per_page) sp.append("per_page", params.per_page)
  if (params.seller_id) sp.append("seller_id", params.seller_id)
  return api.get(`v1/marketplace/products?${sp.toString()}`, authHeaders())
}

export const marketplaceGetProduct = (id) =>
  api.get(`v1/marketplace/products/${id}`, authHeaders())

export const marketplaceCreateProduct = (data) =>
  api.post("v1/marketplace/products", data, authHeaders())

export const marketplaceUpdateProduct = (id, data) =>
  api.put(`v1/marketplace/products/${id}`, data, authHeaders())

export const marketplaceFeaturedProducts = () =>
  api.get("v1/marketplace/products/featured", authHeaders())

export const marketplaceNewArrivals = () =>
  api.get("v1/marketplace/products/new-arrivals", authHeaders())

export const marketplaceBestSelling = () =>
  api.get("v1/marketplace/products/best-selling", authHeaders())

export const marketplaceTrending = () =>
  api.get("v1/marketplace/products/trending", authHeaders())

export const trackProductView = (productId) =>
  api.post(`v1/marketplace/products/${productId}/view`, {}, authHeaders())

// ── Cart ──────────────────────────────────────────────────
export const getCart = () =>
  api.get("v1/marketplace/cart", authHeaders())

export const addToCart = (productId, quantity = 1, variantId = null) =>
  api.post("v1/marketplace/cart/add", { product_id: productId, quantity, variant_id: variantId }, authHeaders())

export const updateCartItem = (itemId, quantity) =>
  api.put(`v1/marketplace/cart/item/${itemId}`, { quantity }, authHeaders())

export const removeCartItem = (itemId) =>
  api.delete(`v1/marketplace/cart/item/${itemId}`, authHeaders())

export const clearCart = () =>
  api.delete("v1/marketplace/cart", authHeaders())

// ── Wishlist ──────────────────────────────────────────────
export const getWishlist = () =>
  api.get("v1/marketplace/wishlist", authHeaders())

export const addToWishlist = (productId) =>
  api.post("v1/marketplace/wishlist/add", { product_id: productId }, authHeaders())

export const removeFromWishlist = (productId) =>
  api.delete(`v1/marketplace/wishlist/${productId}`, authHeaders())

// ── Compare ───────────────────────────────────────────────
export const getCompare = () =>
  api.get("v1/marketplace/compare", authHeaders())

export const addToCompare = (productId) =>
  api.post("v1/marketplace/compare/add", { product_id: productId }, authHeaders())

export const removeFromCompare = (productId) =>
  api.delete(`v1/marketplace/compare/${productId}`, authHeaders())

// ── Coupons ───────────────────────────────────────────────
export const validateCoupon = (code, orderTotal) =>
  api.post("v1/marketplace/coupons/validate", { code, order_total: orderTotal }, authHeaders())

export const adminGetCoupons = () =>
  api.get("v1/marketplace/admin/coupons", authHeaders())

export const adminCreateCoupon = (data) =>
  api.post("v1/marketplace/admin/coupons", data, authHeaders())

export const adminDeleteCoupon = (id) =>
  api.delete(`v1/marketplace/admin/coupons/${id}`, authHeaders())

// ── Checkout & Orders ─────────────────────────────────────
export const checkout = (data) =>
  api.post("v1/marketplace/checkout", data, authHeaders())


// ── Reviews ───────────────────────────────────────────────
export const getProductReviews = (productId, page = 1, perPage = 10) =>
  api.get(`v1/marketplace/products/${productId}/reviews?page=${page}&per_page=${perPage}`, authHeaders())

export const createReview = (productId, data) =>
  api.post(`v1/marketplace/products/${productId}/reviews`, data, authHeaders())

// ── Flash Deals ───────────────────────────────────────────
export const getFlashDeals = () =>
  api.get("v1/marketplace/flash-deals", authHeaders())

export const adminGetFlashDeals = () =>
  api.get("v1/marketplace/admin/flash-deals", authHeaders())

export const adminCreateFlashDeal = (data) =>
  api.post("v1/marketplace/admin/flash-deals", data, authHeaders())

export const adminDeleteFlashDeal = (id) =>
  api.delete(`v1/marketplace/admin/flash-deals/${id}`, authHeaders())

// ── Shipping ──────────────────────────────────────────────
export const getShippingZones = () =>
  api.get("v1/marketplace/shipping/zones", authHeaders())

export const getShippingRates = (zoneId, orderAmount) =>
  api.post("v1/marketplace/shipping/rates", { zone_id: zoneId, order_amount: orderAmount }, authHeaders())

export const adminGetShippingZones = () =>
  api.get("v1/marketplace/admin/shipping-zones", authHeaders())

export const adminCreateShippingZone = (data) =>
  api.post("v1/marketplace/admin/shipping-zones", data, authHeaders())

export const adminGetShippingRates = () =>
  api.get("v1/marketplace/admin/shipping-rates", authHeaders())

export const adminCreateShippingRate = (data) =>
  api.post("v1/marketplace/admin/shipping-rates", data, authHeaders())

// ── Vendor Dashboard ──────────────────────────────────────
export const getVendorDashboard = () =>
  api.get("v1/marketplace/vendor/dashboard", authHeaders())

export const getVendorOrders = (status, page = 1, perPage = 10) => {
  const params = status ? `?status=${status}&page=${page}&per_page=${perPage}` : `?page=${page}&per_page=${perPage}`
  return api.get(`v1/marketplace/vendor/orders${params}`, authHeaders())
}

export const updateVendorOrderStatus = (orderId, status) =>
  api.put(`v1/marketplace/vendor/orders/${orderId}/status`, { status }, authHeaders())

export const getVendorProducts = (page = 1, perPage = 20) =>
  api.get(`v1/marketplace/vendor/products?page=${page}&per_page=${perPage}`, authHeaders())

export const getVendorEarnings = (page = 1, perPage = 10) =>
  api.get(`v1/marketplace/vendor/earnings?page=${page}&per_page=${perPage}`, authHeaders())

export const requestVendorWithdraw = (amount) =>
  api.post("v1/marketplace/vendor/withdraw", { amount }, authHeaders())

export const getVendorWithdraws = () =>
  api.get("v1/marketplace/vendor/withdraws", authHeaders())

// ── Admin Marketplace ─────────────────────────────────────
export const adminGetMarketplaceDashboard = () =>
  api.get("v1/marketplace/admin/dashboard", authHeaders())

export const adminMarketplaceListSellers = (status, page = 1, perPage = 20) => {
  const params = status ? `?status=${status}&page=${page}&per_page=${perPage}` : `?page=${page}&per_page=${perPage}`
  return api.get(`v1/marketplace/admin/sellers${params}`, authHeaders())
}

export const adminMarketplaceUpdateSellerStatus = (sellerId, status, rejectionReason) =>
  api.put(`v1/marketplace/admin/sellers/${sellerId}/status`, { status, rejection_reason: rejectionReason }, authHeaders())

export const adminMarketplaceListOrders = (status, page = 1, perPage = 20) => {
  const params = status ? `?status=${status}&page=${page}&per_page=${perPage}` : `?page=${page}&per_page=${perPage}`
  return api.get(`v1/marketplace/admin/orders${params}`, authHeaders())
}

export const adminListVendorWithdraws = (status) => {
  const params = status ? `?status=${status}` : ""
  return api.get(`v1/marketplace/admin/vendor-withdraws${params}`, authHeaders())
}

export const adminProcessVendorWithdraw = (id, data) =>
  api.put(`v1/marketplace/admin/vendor-withdraws/${id}`, data, authHeaders())

export const adminMarketplaceListProducts = (page = 1, perPage = 20) =>
  api.get(`v1/marketplace/admin/products?page=${page}&per_page=${perPage}`, authHeaders())

export const adminListCommissionRules = () =>
  api.get("v1/marketplace/admin/commission-rules", authHeaders())

export const adminCreateCommissionRule = (data) =>
  api.post("v1/marketplace/admin/commission-rules", data, authHeaders())

export const adminListReviews = (approved, page = 1, perPage = 20) => {
  const params = approved !== undefined ? `?approved=${approved}&page=${page}&per_page=${perPage}` : `?page=${page}&per_page=${perPage}`
  return api.get(`v1/marketplace/admin/reviews${params}`, authHeaders())
}

export const adminApproveReview = (reviewId, isApproved) =>
  api.put(`v1/marketplace/admin/reviews/${reviewId}/approve`, { is_approved: isApproved }, authHeaders())

// ── Order Management (Customer) ──────────────────────
export const getMyOrders = (page = 1, perPage = 10, status = "") => {
  const params = status ? `?page=${page}&per_page=${perPage}&status=${status}` : `?page=${page}&per_page=${perPage}`
  return api.get(`v1/orders/my${params}`, authHeaders())
}

export const getMyOrderDetail = (orderId) =>
  api.get(`v1/orders/my/${orderId}`, authHeaders())

export const cancelMyOrder = (orderId, reason = "") =>
  api.post(`v1/orders/my/${orderId}/cancel`, { reason }, authHeaders())

export const requestReturn = (orderId, reason) =>
  api.post(`v1/orders/my/${orderId}/return-request`, { reason }, authHeaders())

export const getPublicDeliveryZones = (sellerId = "") => {
  const params = sellerId ? `?seller_id=${sellerId}` : ""
  return api.get(`v1/orders/delivery-zones/public${params}`)
}

export const calculateDelivery = (zoneId, sellerId, orderAmount) =>
  api.post("v1/orders/calculate-delivery", { zone_id: zoneId, seller_id: sellerId, order_amount: orderAmount })

// ── Order Management (Seller) ────────────────────────
export const getSellerOrderList = (status = "", page = 1, perPage = 10) => {
  const params = status ? `?status=${status}&page=${page}&per_page=${perPage}` : `?page=${page}&per_page=${perPage}`
  return api.get(`v1/orders/seller${params}`, authHeaders())
}

export const updateSellerOrderStatus = (orderId, status, note = "") =>
  api.put(`v1/orders/seller/${orderId}/status`, { status, note }, authHeaders())

export const addSellerTracking = (orderId, trackingNumber) =>
  api.put(`v1/orders/seller/${orderId}/tracking`, { tracking_number: trackingNumber }, authHeaders())

export const getSellerOrderStats = () =>
  api.get("v1/orders/seller/stats", authHeaders())

export const getSellerDeliveryZones = () =>
  api.get("v1/orders/seller/delivery-zones", authHeaders())

export const createSellerDeliveryZone = (data) =>
  api.post("v1/orders/seller/delivery-zones", data, authHeaders())

export const updateSellerDeliveryZone = (zoneId, data) =>
  api.put(`v1/orders/seller/delivery-zones/${zoneId}`, data, authHeaders())

export const deleteSellerDeliveryZone = (zoneId) =>
  api.delete(`v1/orders/seller/delivery-zones/${zoneId}`, authHeaders())

// ── Order Management (Admin) ─────────────────────────
export const getAdminOrderList = (params = {}) => {
  const sp = new URLSearchParams()
  if (params.seller_id) sp.append("seller_id", params.seller_id)
  if (params.user_id) sp.append("user_id", params.user_id)
  if (params.status) sp.append("status", params.status)
  if (params.payment_method) sp.append("payment_method", params.payment_method)
  if (params.search) sp.append("search", params.search)
  if (params.page) sp.append("page", params.page)
  if (params.per_page) sp.append("per_page", params.per_page)
  return api.get(`v1/orders/admin/list?${sp.toString()}`, authHeaders())
}

export const getAdminOrderDetail = (orderId) =>
  api.get(`v1/orders/admin/${orderId}`, authHeaders())

export const adminUpdateOrderStatus = (orderId, status, note = "") =>
  api.put(`v1/orders/admin/${orderId}/status`, { status, note }, authHeaders())

export const adminRefundOrder = (orderId, refundAmount, note = "") =>
  api.post(`v1/orders/admin/${orderId}/refund`, { refund_amount: refundAmount, note }, authHeaders())

export const getAdminReturnRequests = (status = "") => {
  const params = status ? `?status=${status}` : ""
  return api.get(`v1/orders/admin/return-requests${params}`, authHeaders())
}

export const processReturnRequest = (requestId, status, note = "", refundAmount = 0) =>
  api.put(`v1/orders/admin/return-requests/${requestId}`, { status, note, refund_amount: refundAmount }, authHeaders())


export const getOrderReportsSummary = (startDate, endDate) => {
  const sp = new URLSearchParams()
  if (startDate) sp.append("start_date", startDate)
  if (endDate) sp.append("end_date", endDate)
  return api.get(`v1/orders/admin/reports/summary?${sp.toString()}`, authHeaders())
}

export const getOrderDailyReport = (days = 30) =>
  api.get(`v1/orders/admin/reports/daily?days=${days}`, authHeaders())

export const getOrderSellerReport = () =>
  api.get("v1/orders/admin/reports/sellers", authHeaders())
