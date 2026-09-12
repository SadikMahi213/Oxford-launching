import api from "./axiosInstance.js";
import { refreshToken } from "./auth.api.js";

// Endpoints that must never trigger a silent refresh (they carry no usable
// session by definition, or ARE the refresh itself — retrying them loops).
const NO_REFRESH_PREFIXES = [
  "v1/auth/login",
  "v1/auth/signup",
  "v1/auth/refresh",
  "v1/auth/verify-email",
  "v1/auth/resend-verification",
  "v1/auth/forgot-password",
  "v1/auth/reset-password",
  "v1/auth/registration-status",
];

let wired = false;
let refreshPromise = null;

const shouldAttemptRefresh = (config) => {
  const url = String(config?.url || "");
  if (config?.__authRetried) return false;
  if (String(config?.method || "get").toLowerCase() !== "get" && url.includes("v1/auth/logout")) return false;
  return !NO_REFRESH_PREFIXES.some((prefix) => url.includes(prefix));
};

// Installs a 401 interceptor once: a refreshable 401 silently renews the
// session and retries the original request; only a failed refresh ends the
// session (via onSessionExpired). Call once from App boot.
export const setupAuthInterceptor = ({ onTokenRefreshed, onSessionExpired }) => {
  if (wired) return;
  wired = true;

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error?.config;
      const status = error?.response?.status;
      if (!original || status !== 401 || !shouldAttemptRefresh(original)) {
        throw error;
      }
      original.__authRetried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshToken().finally(() => {
            refreshPromise = null;
          });
        }
        const res = await refreshPromise;
        const nextToken = res?.data?.access_token || null;
        if (!nextToken) throw error;
        onTokenRefreshed?.(nextToken);
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${nextToken}`,
        };
        return api(original);
      } catch {
        // Refresh failed: the session is genuinely gone (explicit logout,
        // revocation, 30-day inactivity). End it without calling the API.
        onSessionExpired?.();
        throw error;
      }
    },
  );
};
