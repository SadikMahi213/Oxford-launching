import api from "./axiosInstance.js";

const authHeaders = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};

export const getNotifications = async (token, params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page);
  if (params.per_page) query.append("per_page", params.per_page);
  if (params.is_read !== undefined) query.append("is_read", params.is_read);
  if (params.type) query.append("type", params.type);
  if (params.priority) query.append("priority", params.priority);
  if (params.search) query.append("search", params.search);
  const res = await api.get(
    `v1/admin/notifications?${query.toString()}`,
    authHeaders(token),
  );
  return res.data;
};

export const getUnreadCount = async (token) => {
  const res = await api.get(
    "v1/admin/notifications/unread-count",
    authHeaders(token),
  );
  return res.data;
};

export const getRecentNotifications = async (token, limit = 5) => {
  const res = await api.get(
    `v1/admin/notifications/recent?limit=${limit}`,
    authHeaders(token),
  );
  return res.data;
};

export const markNotificationRead = async (token, id) => {
  const res = await api.patch(
    `v1/admin/notifications/${id}/read`,
    {},
    authHeaders(token),
  );
  return res.data;
};

export const markAllNotificationsRead = async (token) => {
  const res = await api.patch(
    "v1/admin/notifications/read-all",
    {},
    authHeaders(token),
  );
  return res.data;
};
