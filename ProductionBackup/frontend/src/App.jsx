import { useTranslation } from "react-i18next";
import { BrowserRouter, Routes, Route } from "react-router";

import RegisterForm from "./page/Register";
import LoginForm from "./page/Login";
import Home from "./page/Home";
import ForgotPassword from "./page/ForgotPassword";
import VerificationPage from "./page/VerificationPage";
import ResetPassword from "./page/ResetPassword";
import TermsAndConditions from "./page/TermsAndConditions";
import PrivacyPolicy from "./page/privacyPolicy";
import EmailVerificationPage from "./page/EmailVerificationPage";
import NotFoundPage from "./page/NotFoundPage";
import LegalPage from "./page/LegalInformation";
import VerificationPending from "./page/VerificationPending";
import RegistrationPayment from "./page/RegistrationPayment";
import AdminDashboard from "./page/AdminDashboard";
import StrategyTiersPage from "./page/StrategyTiersPage.jsx";
import UserDashboard from "./page/UserDashboard.jsx";
import UserStatisticsPage from "./page/UserStatisticsPage.jsx";
import ProtectedRoute from "./component/ProtectedRoute";

const RTL_LANGS = ["ur"];

const App = () => {
  const { i18n } = useTranslation();
  const dir = RTL_LANGS.includes(i18n.language) ? "rtl" : "ltr";

  return (
    <div dir={dir}>
      <BrowserRouter>
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
      </BrowserRouter>
    </div>
  );
};

export default App;
