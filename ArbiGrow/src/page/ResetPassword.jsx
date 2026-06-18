import { useState } from "react";
import { motion } from "motion/react";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Check,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { resetPassword } from "../api/auth.api.js";
import useUserStore from "../store/userStore.js";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlToken = new URLSearchParams(location.search).get("token");
  const storeToken = useUserStore.getState().token;
  const varificationtoken =
    urlToken && urlToken.trim() !== "" ? urlToken : storeToken;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const { logout } = useUserStore();
  // Password strength indicators
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (!allRequirementsMet) {
      setError("Password does not meet all requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!varificationtoken) {
      setError("Token not found. Please try the reset link again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPassword(password, varificationtoken);
      if (res?.status === 200) {
        setIsSuccess(true);
        logout();
      }
      //  console.log("Res Data:",res) // API call
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060913] via-[#080b1f] to-[#060913] text-white flex items-center justify-center px-4 py-12">
      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative max-w-lg w-full"
      >
        <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-2xl">
          <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50"></div>
          <div className="relative z-10">
            {!isSuccess ? (
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-6"
                  >
                    <Lock className="w-10 h-10 text-blue-400" />
                  </motion.div>

                  <h1 className="text-3xl md:text-4xl font-bold mb-3">
                    Create New{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      Password
                    </span>
                  </h1>
                  <p className="text-gray-400 text-sm md:text-base">
                    Your new password must be different from previously used
                    passwords
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                        }}
                        placeholder="Enter new password"
                        className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2"
                    >
                      <p className="text-xs font-semibold text-gray-400 mb-3">
                        Password must contain:
                      </p>
                      <div className="grid gap-2">
                        {[
                          {
                            label: "At least 8 characters",
                            met: passwordRequirements.minLength,
                          },
                          {
                            label: "One uppercase letter",
                            met: passwordRequirements.hasUpperCase,
                          },
                          {
                            label: "One lowercase letter",
                            met: passwordRequirements.hasLowerCase,
                          },
                          {
                            label: "One number",
                            met: passwordRequirements.hasNumber,
                          },
                          {
                            label: "One special character",
                            met: passwordRequirements.hasSpecial,
                          },
                        ].map((req, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                                req.met
                                  ? "bg-green-500/20 border border-green-500/50"
                                  : "bg-white/5 border border-white/10"
                              }`}
                            >
                              {req.met && (
                                <Check className="w-3 h-3 text-green-400" />
                              )}
                            </div>
                            <span
                              className={`text-xs ${req.met ? "text-green-400" : "text-gray-400"}`}
                            >
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError("");
                        }}
                        placeholder="Confirm new password"
                        className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="relative w-full group px-6 py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-xl font-semibold overflow-hidden shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {isSubmitting
                        ? "Resetting Password..."
                        : "Reset Password"}
                    </span>
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Success */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200 }}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 mb-6"
                  >
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </motion.div>

                  <h2 className="text-3xl font-bold mb-3">
                    Password{" "}
                    <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      Reset Successfully
                    </span>
                  </h2>
                  <p className="text-gray-400 mb-8">
                    Your password has been successfully reset.
                    <br />
                    You can now sign in with your new password.
                  </p>

                  <button
                    onClick={() => navigate("/login")}
                    className="px-6 py-3 bg-cyan-500 rounded-xl font-semibold hover:bg-cyan-400 transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
