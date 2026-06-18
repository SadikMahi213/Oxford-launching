import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Navbar from "../component/Navbar";
import Button from "../component/Button";
import { registerUser } from "../api/auth.api.js";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";
import Logo from "../assets/oxford.png";
import api from "../api/axiosInstance.js";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [agree, setAgree] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    referral_code: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packagesLoading, setPackagesLoading] = useState(true);

  const passwordRequirements = useMemo(
    () => [
      { key: "length", label: "At least 8 characters", valid: formData.password.length >= 8 },
      { key: "uppercase", label: "At least one uppercase letter", valid: /[A-Z]/.test(formData.password) },
      { key: "lowercase", label: "At least one lowercase letter", valid: /[a-z]/.test(formData.password) },
      { key: "number", label: "At least one number", valid: /[0-9]/.test(formData.password) },
      { key: "special", label: "At least one special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
    ],
    [formData.password],
  );

  const passwordMessages = [
    "Password must be at least 8 characters",
    "Password must include an uppercase letter",
    "Password must include a lowercase letter",
    "Password must include a number",
    "Password must include a special character",
  ];
  const allPasswordRequirementsMet = passwordRequirements.every((item) => item.valid);
  const showPasswordGuide = formData.password.length > 0 && !allPasswordRequirementsMet;

  useEffect(() => {
    const refCodeFromURL = searchParams.get("ref_code");
    if (refCodeFromURL) {
      setFormData((prev) => ({ ...prev, referral_code: refCodeFromURL }));
      setIsReferralLocked(true);
    }
  }, [searchParams]);

  useEffect(() => {
    api.get("v1/investments/packages").then((res) => {
      const data = res.data?.packages || [];
      setPackages(data);
    }).catch(() => {
      setPackages([]);
    }).finally(() => {
      setPackagesLoading(false);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => prev.filter((err) => err.field !== name));
    setMessage("");
  };

  const handleAgree = (e) => setAgree(e.target.checked);

  const validateForm = () => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!selectedPackage) return "Please select a plan";
    if (!formData.email.trim()) return "Email is required";
    if (!emailRegex.test(formData.email)) return "Invalid email format";
    if (!formData.full_name.trim()) return "Name is required";
    if (!formData.password.trim()) return "Password is required";
    if (formData.password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(formData.password)) return "Password must include an uppercase letter";
    if (!/[a-z]/.test(formData.password)) return "Password must include a lowercase letter";
    if (!/[0-9]/.test(formData.password)) return "Password must include a number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) return "Password must include a special character";
    if (formData.password !== formData.confirm_password) return "Passwords do not match";
    if (!agree) return "You must agree to terms & conditions";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validateForm();
    if (errorMsg) {
      setMessage(errorMsg);
      setIsSuccess(false);
      return;
    }
    try {
      setLoading(true);
      setMessage("");
      setErrors([]);
      setIsSuccess(false);
      const payload = {
        ...formData,
        package_id: selectedPackage.id,
      };
      await registerUser(payload);
      setMessage("Registration successful!");
      setIsSuccess(true);
      setTimeout(() => navigate("/login"), 600);
    } catch (error) {
      const res = error.response;
      setIsSuccess(false);
      if (!res) {
        setMessage("Network error or server not reachable");
        setLoading(false);
        return;
      }
      if (res.status === 422 && Array.isArray(res.data?.detail)) {
        const serverErrors = res.data.detail.map((err) => ({
          field: err.loc?.[1] || "unknown",
          message: err.msg,
        }));
        setErrors(serverErrors);
        setMessage("");
        setLoading(false);
        return;
      }
      const msg = res.data?.message || res.data?.detail || "Something went wrong";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || !agree || errors.length > 0 || !selectedPackage;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0A122C] px-4 pt-[120px] sm:pt-20 md:pt-28 lg:pt-36 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Create Your Account</h1>
            <p className="text-gray-400 mt-2">Choose a plan and fill in your details to get started</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg rounded-lg p-6">
            {!selectedPackage ? (
              <>
                <h2 className="text-xl font-bold text-white mb-6 text-center">Select Your Plan</h2>
                {packagesLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {packages.map((pkg, idx) => (
                      <motion.button
                        key={pkg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => setSelectedPackage(pkg)}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0d1428] to-[#0a0e27] p-6 text-left transition-all hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
                      >
                        <div className="absolute inset-0 opacity-5">
                          <svg className="size-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <pattern id={`circuit-${pkg.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                <circle cx="5" cy="5" r="1" fill="#00d4ff" />
                                <circle cx="35" cy="35" r="1" fill="#00d4ff" />
                                <path d="M5 5 L35 5 L35 35" stroke="#00d4ff" strokeWidth="0.5" fill="none" />
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill={`url(#circuit-${pkg.id})`} />
                          </svg>
                        </div>
                        <div className="relative">
                          <div className="mb-6 flex items-start justify-between">
                            <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br">
                              <img src={Logo} alt="Logo" className="w-12 h-12 object-contain" />
                            </div>
                            <div className="size-10 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 p-1">
                              <div className="size-full rounded-sm bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-80" />
                            </div>
                          </div>
                          <div className="mb-4">
                            <p className="mb-1 text-xs text-gray-400 tracking-widest">
                              {pkg.task_type === "ad_view" ? "AD VIEW PACKAGE" : "CAPTCHA TYPING PACKAGE"}
                            </p>
                            <h3 className="text-xl font-semibold text-white">{pkg.name}</h3>
                          </div>
                          <div className="mb-6">
                            <p className="text-4xl font-bold tracking-tight text-white">
                              ${Number(pkg.investment_amount).toLocaleString()}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">Investment Amount</p>
                          </div>
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">{pkg.task_type === "ad_view" ? "Daily Ads" : "Daily Captcha"}</span>
                              <span className="text-cyan-300 font-medium">{pkg.captcha_required_per_day} {pkg.task_type === "ad_view" ? "Ads" : "Tasks"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Duration</span>
                              <span className="text-cyan-300 font-medium">{pkg.duration_days} Days</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Daily Payment</span>
                              <span className="text-green-300 font-medium">${Number(pkg.daily_payment).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Total Return</span>
                              <span className="text-yellow-300 font-medium">${Number(pkg.total_return).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <div className="rounded-md bg-cyan-500/10 px-3 py-1">
                              <p className="text-xs font-medium text-cyan-300">
                                {pkg.task_type === "ad_view"
                                  ? `${pkg.ad_duration_seconds || 30}s per Ad`
                                  : `${pkg.captcha_task_duration_seconds || 30}s per Captcha`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1">
                              <div className="size-2 rounded-full bg-blue-400" />
                              <span className="text-xs text-blue-300">{pkg.duration_days} Days</span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {selectedPackage.name}
                  </h2>
                  <button
                    onClick={() => { setSelectedPackage(null); setMessage(""); }}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Change plan
                  </button>
                </div>

                <form className="space-y-4 text-black" onSubmit={handleSubmit}>
                  <div>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter your email"
                      className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      onChange={handleChange}
                    />
                    {errors.find((e) => e.field === "email") && (
                      <p className="text-xs text-red-500 mt-1">{errors.find((e) => e.field === "email").message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      placeholder="Enter your full name"
                      onChange={handleChange}
                      className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black"
                    />
                    {errors.find((e) => e.field === "full_name") && (
                      <p className="text-xs text-red-500 mt-1">{errors.find((e) => e.field === "full_name").message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      name="referral_code"
                      value={formData.referral_code}
                      placeholder="Enter referral code (optional)"
                      readOnly={isReferralLocked}
                      onChange={handleChange}
                      className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black"
                    />
                    {isReferralLocked && (
                      <p className="text-xs text-[#00CFF5] mt-1">Referral applied from invitation link</p>
                    )}
                    {errors.find((e) => e.field === "referral_code") && (
                      <p className="text-xs text-red-500 mt-1">{errors.find((e) => e.field === "referral_code").message}</p>
                    )}
                  </div>

                  <div className="relative w-full">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4171AD]"
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#4171AD] transition"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    {errors.find((e) => e.field === "password") && (
                      <p className="text-xs text-red-500 mt-1">{errors.find((e) => e.field === "password").message}</p>
                    )}
                  </div>

                  <div className="relative w-full">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      placeholder="Confirm your password"
                      value={formData.confirm_password}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4171AD]"
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#4171AD] transition"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {showPasswordGuide && (
                    <div className="rounded-lg border border-[#35598f] bg-[#101b3d] px-3 py-3">
                      <p className="text-xs font-semibold tracking-wide text-white">Password requirements</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {passwordRequirements.map((item) => (
                          <p
                            key={item.key}
                            className={`flex items-center gap-2 text-xs ${item.valid ? "text-emerald-300" : "text-gray-300"}`}
                          >
                            {item.valid ? <CheckCircle2 size={14} className="shrink-0" /> : <Circle size={14} className="shrink-0" />}
                            {item.label}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      name="agree"
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                      checked={agree}
                      onChange={handleAgree}
                    />
                    <p className="text-gray-400">
                      I agree to the{" "}
                      <a className="text-[#00CFF5] cursor-pointer hover:underline" href="/terms-conditions" rel="noopener noreferrer" target="_blank">
                        Terms & Conditions
                      </a>
                    </p>
                  </div>

                  {message && !passwordMessages.includes(message) && (
                    <p className={`text-center text-sm ${isSuccess ? "text-blue-500" : "text-red-500"}`}>{message}</p>
                  )}

                  <div className="flex justify-center pt-1">
                    <Button type="submit" disabled={isButtonDisabled} variant="gradient">
                      {loading ? "Registering..." : "Register"}
                    </Button>
                  </div>

                  <p className="text-center text-sm text-white pt-2">
                    Already have an account?{" "}
                    <Link to="/login" className="text-[#00CFF5] cursor-pointer hover:underline font-bold">
                      Login
                    </Link>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}