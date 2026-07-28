import React, { useState } from "react";
import Button from "../component/Button";
import Navbar from "../component/Navbar";
import { loginUser } from "../api/auth.api";
import useUserStore from "../store/userStore";
import { useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

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

    // field error remove
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });

    setMessage("");
  };

  const validateForm = () => {
    let tempErrors = {};

    if (!formData.email.trim()) {
      tempErrors.email = t("auth.login.emailRequired");
    }

    if (!formData.password.trim()) {
      tempErrors.password = t("auth.login.passwordRequired");
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setMessage("");
      setIsSuccess(false);

      const res = await loginUser(formData);
      // console.log(res, "login api response");
      //  console.log("toiken", res?.data);

      setUser({ ...res?.data?.user, kyc_status: res?.data?.kyc_status });
      setToken(res?.data?.access_token);
      if (res?.data?.payment_required) {
        navigate("/registration-payment");
      } else if (res?.data?.user?.is_admin) {
        navigate("/admin-dashboard");
      } else {
        navigate("/dashboard");
      }

      // success message
      setMessage(res.data.message || "Login successful");
      setIsSuccess(true);

      setLoading(false);
    } catch (err) {
      console.log("Full error:", err.response);

      setIsSuccess(false);

      // 422 validation error
      if (
        err.response?.status === 422 &&
        Array.isArray(err.response.data?.detail)
      ) {
        let fieldErrors = {};
        err.response.data.detail.forEach((item) => {
          const field = item.loc?.[1];
          fieldErrors[field] = item.msg;
        });
        setErrors(fieldErrors);
        setMessage("");
      }

      // 423 blocked account
      else if (err.response?.status === 423) {
        setMessage(
          err.response.data?.detail ||
            "Your account has been temporarily blocked due to multiple failed login attempts. Please contact the company support team for assistance: support.oxfordfinancialads@gmail.com",
        );
      }

      // 400 error
      else if (err.response?.status === 400) {
        setMessage(
          err.response.data?.detail ||
            err.response.data?.message ||
            "Invalid login",
        );
      }

      // other errors
      else {
        setMessage(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            "Login failed",
        );
      }

      setLoading(false);
    }
  };

  const isButtonDisabled =
    loading ||
    !formData.email ||
    !formData.password ||
    errors.email ||
    errors.password;

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-[#0A122C] px-4 pt-24">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg rounded-lg w-full max-w-md p-4 hover:shadow-blue-900/50 transition-shadow duration-600">
          {/* Top Header */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white text-xl sm:text-2xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300">
              👤
            </div>
            <h2 className="text-xl text-[#FFFFFF] font-semibold mt-3">
              {t("auth.login.title")}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 text-black">
            <input
              type="email"
              name="email"
              placeholder={t("auth.login.email")}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4171AD]"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
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
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}

            {/* server message with dynamic color */}
            {message && (
              <p
                className={`text-center text-sm ${
                  isSuccess ? "text-blue-500" : "text-red-500"
                }`}
              >
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
    </>
  );
}
