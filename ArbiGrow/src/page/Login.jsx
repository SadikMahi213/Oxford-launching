import React, { useState } from "react";
import Button from "../component/Button";
import Navbar from "../component/Navbar";
import { loginUser } from "../api/auth.api";
import useUserStore from "../store/userStore";
import { useNavigate } from "react-router";
import { Eye, EyeOff, CircleUser } from "lucide-react";
import { useTranslation } from "react-i18next";
import loginImg from "../assets/login.jpeg";
import DollarRain from "../component/DollarRain.jsx";

export default function LoginForm() {
  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);
  const setToken = useUserStore((state) => state.setToken);
  const { t } = useTranslation();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
    setMessage("");
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!formData.email.trim()) tempErrors.email = t("auth.login.emailRequired");
    if (!formData.password.trim()) tempErrors.password = t("auth.login.passwordRequired");
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      setMessage("");
      setIsSuccess(false);
      const res = await loginUser(formData);
      setUser({ ...res?.data?.user, kyc_status: res?.data?.kyc_status });
      setToken(res?.data?.access_token);
      if (res?.data?.payment_required) {
        navigate("/registration-payment");
      } else if (res?.data?.user?.is_admin) {
        navigate("/admin-dashboard");
      } else {
        navigate("/dashboard");
      }
      setMessage(res.data.message || t("auth.login.success"));
      setIsSuccess(true);
      setLoading(false);
    } catch (err) {
      setIsSuccess(false);
      if (err.response?.status === 422 && Array.isArray(err.response.data?.detail)) {
        let fieldErrors = {};
        err.response.data.detail.forEach((item) => {
          const field = item.loc?.[1];
          fieldErrors[field] = item.msg;
        });
        setErrors(fieldErrors);
        setMessage("");
      } else if (err.response?.status === 423) {
        setMessage(err.response.data?.detail || t("auth.login.blocked"));
      } else if (err.response?.status === 400) {
        setMessage(err.response.data?.detail || err.response.data?.message || t("auth.login.invalid"));
      } else {
        setMessage(err.response?.data?.detail || err.response?.data?.message || t("auth.login.failed"));
      }
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || !formData.email || !formData.password || errors.email || errors.password;

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-[#0A122C] px-4 pt-24 pb-10 relative overflow-hidden">
        {/* Dollar rain — premium subtle USD falling animation (non-blocking) */}
        <DollarRain />

        {/* Outer card — split layout */}
        <div className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/40 border border-white/10 flex flex-col lg:flex-row">

          {/* ── LEFT/TOP: Image Panel (top banner on mobile, left half on desktop) */}
          <div className="w-full h-52 lg:h-auto lg:w-1/2 relative flex-shrink-0">
            <img
              src={loginImg}
              alt={t("app.name")}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A122C]/90 via-[#0A122C]/30 to-transparent" />
            {/* Branding text — bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8">
              <p className="text-xs font-semibold tracking-[0.25em] text-cyan-400 uppercase mb-1">
                {t("app.name")}
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-1">
                {t("auth.login.welcomeBack")}
              </h2>
              <p className="text-xs lg:text-sm text-gray-300 leading-relaxed hidden lg:block">
                {t("auth.login.welcomeSubtitle")}
              </p>
            </div>
          </div>

          {/* ── RIGHT/BOTTOM: Form Panel ─────────────────────────── */}
          <div className="w-full lg:w-1/2 bg-white/5 backdrop-blur-sm p-6 sm:p-10 flex flex-col justify-center">

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:scale-105 transition-all duration-300">
                <CircleUser size={30} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl text-white font-semibold mt-3">
                {t("auth.login.title")}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-black">
              <input
                type="email"
                name="email"
                placeholder={t("auth.login.email")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4171AD]"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="text-xs text-red-500 -mt-2">{errors.email}</p>
              )}

              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t("auth.login.password")}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4171AD]"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#4171AD] transition"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 -mt-2">{errors.password}</p>
              )}

              {message && (
                <p className={`text-center text-sm ${isSuccess ? "text-blue-400" : "text-red-400"}`}>
                  {message}
                </p>
              )}

              <p
                className="text-sm text-right text-[#00C2F9] cursor-pointer hover:underline"
                onClick={() => navigate("/forgot-password")}
              >
                {t("auth.login.forgotPassword")}
              </p>

              <div className="flex justify-center pt-2">
                <Button
                  type="submit"
                  variant="gradient"
                  fullWidth={true}
                  disabled={isButtonDisabled}
                >
                  {loading ? t("auth.login.loggingIn") : t("auth.login.submit")}
                </Button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </>
  );
}
