import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Routes, Route } from "react-router";
import ScrollToTop from "./component/ScrollToTop";
import ErrorBoundary from "./component/ErrorBoundary.jsx";
import useUserStore from "./store/userStore.js";
import { refreshToken } from "./api/auth.api.js";
import { refreshUserStore } from "./api/user.api.js";
import { setupAuthInterceptor } from "./api/authSession.js";

import Home from "./page/Home";
import ProtectedRoute from "./component/ProtectedRoute";

// Route-level code splitting: only Home (+ tiny guard) ships in the initial
// bundle. Auth/legal/payment pages load on demand so first paint stays lean.
const RegisterForm = lazy(() => import("./page/Register"));
const LoginForm = lazy(() => import("./page/Login"));
const ForgotPassword = lazy(() => import("./page/ForgotPassword"));
const VerificationPage = lazy(() => import("./page/VerificationPage"));
const ResetPassword = lazy(() => import("./page/ResetPassword"));
const TermsAndConditions = lazy(() => import("./page/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./page/PrivacyPolicy"));
const EmailVerificationPage = lazy(() => import("./page/EmailVerificationPage"));
const NotFoundPage = lazy(() => import("./page/NotFoundPage"));
const LegalPage = lazy(() => import("./page/LegalInformation"));
const VerificationPending = lazy(() => import("./page/VerificationPending"));
const RegistrationPayment = lazy(() => import("./page/RegistrationPayment"));

// Heavy dashboard/admin pages also load on demand.
const AdminDashboard = lazy(() => import("./page/AdminDashboard"));
const StrategyTiersPage = lazy(() => import("./page/StrategyTiersPage.jsx"));
const UserDashboard = lazy(() => import("./page/UserDashboard.jsx"));
const UserStatisticsPage = lazy(() => import("./page/UserStatisticsPage.jsx"));

const RTL_LANGS = ["ur"];

const App = () => {
  const { t, i18n } = useTranslation();
  const dir = RTL_LANGS.includes(i18n.language) ? "rtl" : "ltr";

  // Session boot (runs once): wire the 401→refresh interceptor, then try to
  // restore the session from the persistent refresh cookie. Page refreshes
  // and browser restarts land here with an empty in-memory store — a live
  // cookie brings the user back without a login screen. A failed probe means
  // genuinely logged out (or first visit): guards redirect as before.
  useEffect(() => {
    const store = useUserStore.getState();
    setupAuthInterceptor({
      onTokenRefreshed: (next) => useUserStore.getState().setToken(next),
      onSessionExpired: () => {
        useUserStore.getState().clearSession();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login");
        }
      },
    });
    // Already holding a session (in-app navigation remount): nothing to do.
    if (store.user || store.token) {
      store.setBooted(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const refreshRes = await refreshToken().catch(() => null);
        const nextToken = refreshRes?.data?.access_token || null;
        if (!nextToken) return;
        if (!cancelled) useUserStore.getState().setToken(nextToken);
        const meRes = await refreshUserStore().catch(() => null);
        if (!cancelled && meRes?.data?.user) {
          useUserStore.getState().setUser(meRes.data.user);
        } else if (!cancelled) {
          // Token renewed but profile unreadable: drop the token so later
          // calls re-trigger a clean refresh instead of half-session 401s.
          useUserStore.getState().setToken(null);
        }
      } finally {
        if (!cancelled) useUserStore.getState().setBooted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div dir={dir}>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0a0e27] text-white">{t("common.loading")}</div>}>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verification-page" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
            <Route path="/verification-pending" element={<ProtectedRoute><VerificationPending /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms-conditions" element={<TermsAndConditions />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/email-verification" element={<EmailVerificationPage />} />
            <Route path="/legal-information" element={<LegalPage />} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/user-statistics" element={<ProtectedRoute><UserStatisticsPage /></ProtectedRoute>} />
            <Route path="/packages" element={<StrategyTiersPage />} />
            <Route path="/registration-payment" element={<ProtectedRoute><RegistrationPayment /></ProtectedRoute>} />
          </Routes>
          </ErrorBoundary>
        </Suspense>
      </BrowserRouter>
    </div>
  );
};

export default App;
