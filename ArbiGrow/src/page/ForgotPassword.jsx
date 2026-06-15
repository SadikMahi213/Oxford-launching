import { useState } from "react";
import { motion } from "motion/react";
import {
  KeyRound,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import Button from "../component/Button";
import { forgotPassword } from "../api/auth.api.js";
import logo from "../assets/Arbigrow-Logo.png";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [message, setMessage] = useState(""); // backend success message
  const [error, setError] = useState(""); // backend error message

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await forgotPassword({ email });

      setMessage(res.data?.message || "Check your email for reset link");
      setIsEmailSent(true);
    } catch (err) {
      const res = err.response;

      if (res?.data?.message) {
        setError(res.data.message);
      } else if (res?.data?.detail) {
        if (Array.isArray(res.data.detail)) {
          setError(res.data.detail.map((d) => d.msg || d).join(", "));
        } else {
          setError(res.data.detail);
        }
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend link
  const handleResend = async () => {
    // console.log("Resend clicked!");

    setError("");
    setMessage("");
    try {
      setIsSubmitting(true);
      const res = await forgotPassword({ email });
      // console.log("Response from backend:", res);
      setIsDisabled(true);
      setMessage(res.data?.message || "Reset link resent!");
    } catch (err) {
      const res = err.response;
      if (res?.data?.message) {
        setError(res.data.message);
      } else if (res?.data?.detail) {
        if (Array.isArray(res.data.detail)) {
          setError(res.data.detail.map((d) => d.msg || d).join(", "));
        } else {
          setError(res.data.detail);
        }
      } else {
        setError("Failed to resend email");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060913] via-[#080b1f] to-[#060913] text-white flex items-center justify-center px-4 py-12">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/4 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/4 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-[400px] h-[400px] bg-blue-600/4 rounded-full blur-3xl"></div>
      </div>

      {/* Logo */}
      <motion.a
        onClick={() => navigate("/")}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-6 left-6 flex items-center gap-3 group z-50"
      >
        <div className="relative">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/50">
            <img
              src={logo}
              alt="Oxford Financial Ads Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
              Oxford Financial Ads
            </span>
          </div>
          <div className="text-[8px] text-cyan-400/80 uppercase tracking-[0.2em] font-semibold -mt-0.5">
            Professional Financial Services
          </div>
        </div>
      </motion.a>

      {/* Back Button
      <motion.a
       onClick={() =>navigate('/login')}
     
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 z-50 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span 
       
        className="text-sm font-medium">Back to Login</span>
      </motion.a> */}

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative max-w-lg w-full"
      >
        {/* Card */}
        <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-2xl">
          <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50"></div>

          <div className="relative z-10">
            {!isEmailSent ? (
              <>
                {/* Header & Form */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-6"
                  >
                    <KeyRound className="w-10 h-10 text-blue-400" />
                  </motion.div>

                  <h1 className="text-3xl md:text-4xl font-bold mb-3">
                    Reset Your{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      Password
                    </span>
                  </h1>
                  <p className="text-gray-400 text-sm md:text-base">
                    Enter your email address and we'll send you a link to reset
                    your password
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        placeholder="your.email@example.com"
                        className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
                      />
                    </div>
                  </div>

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

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    variant="gradient"
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Sending Reset Link...
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5" />
                          Send Reset Link
                        </>
                      )}
                    </span>
                  </Button>
                </form>

                {/* Info Box */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-400">
                      <p>
                        If an account exists with this email, you'll receive a
                        password reset link within a few minutes.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </>
            ) : (
              <>
                {/* Success State */}
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
                    Check Your{" "}
                    <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      Email
                    </span>
                  </h2>
                  <p className="text-gray-400 mb-8">
                    We've sent a password reset link to
                    <br />
                    <span className="text-white font-medium">{email}</span>
                  </p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 mb-8"
                  >
                    <Mail className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-400">
                      Click the link in the email to reset your password.
                      <br />
                      The link will expire in 24 hours.
                    </p>
                  </motion.div>

                  <button
                    onClick={handleResend}
                    disabled={isSubmitting || isDisabled}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? "Sending..."
                      : isDisabled
                        ? "Email Resent"
                        : "Didn't receive the email? Resend"}
                  </button>

                  {/* <div
                    className="mt-8 pt-6 border-t border-white/10 cursor-pointer"
                    onClick={() => navigate('/login')}
                  >
                    {/* <Button className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      Back to Login
                    </Button> 
                  </div> */}
                </div>
              </>
            )}

            {/* Footer Links */}
            {!isEmailSent && (
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-sm text-gray-400">
                  Remember your password?{" "}
                  <a
                    href="#"
                    className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                    onClick={() => navigate("/login")}
                  >
                    Sign In
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
