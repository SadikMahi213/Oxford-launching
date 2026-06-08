import React from "react";
import RegisterForm from "./page/Register";
import LoginForm from "./page/Login";
import { BrowserRouter, Routes, Route } from "react-router";
import Home from "./page/Home";
import ForgotPassword from "./page/ForgotPassword";
import VerificationPage from "./page/VerificationPage";
import ResetPassword from "./page/ResetPassword";
import { TermsAndConditions } from "./page/TermsAndConditions";
import PrivacyPolicy from "./page/privacyPolicy";
import EmailVerificationPage from "./page/EmailVerificationPage";
import { NotFoundPage } from "./page/NotFoundPage";
import ProtectedRoute from "./component/ProtectedRoute";
import LegalPage from "./page/LegalInformation";
import VerificationPending from "./page/VerificationPending";
import AdminDashboard from "./page/AdminDashboard";
import StrategyTiersPage from "./page/StrategyTiersPage.jsx";
import { UserDashboard } from "./page/UserDashboard.jsx";

const App = () => {
  return (
    <div>
      <>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/verification-page"
              element={
                <ProtectedRoute>
                  <VerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification-pending"
              element={
                <ProtectedRoute>
                  <VerificationPending />
                </ProtectedRoute>
              }
            />

            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms-conditions" element={<TermsAndConditions />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route
              path="/email-verification"
              element={<EmailVerificationPage />}
            />
            <Route path="/legal-information" element={<LegalPage />} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/packages" element={<StrategyTiersPage />} />
          </Routes>
        </BrowserRouter>
      </>
    </div>
  );
};

export default App;
