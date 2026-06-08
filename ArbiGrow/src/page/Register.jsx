import { useEffect, useMemo, useState } from "react";
import Navbar from "../component/Navbar";
import Button from "../component/Button";
import { registerUser } from "../api/auth.api.js";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";

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
  const [isSuccess, setIsSuccess] = useState(false); // NEW
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();

  const passwordRequirements = useMemo(
    () => [
      {
        key: "length",
        label: "At least 8 characters",
        valid: formData.password.length >= 8,
      },
      {
        key: "uppercase",
        label: "At least one uppercase letter",
        valid: /[A-Z]/.test(formData.password),
      },
      {
        key: "lowercase",
        label: "At least one lowercase letter",
        valid: /[a-z]/.test(formData.password),
      },
      {
        key: "number",
        label: "At least one number",
        valid: /[0-9]/.test(formData.password),
      },
      {
        key: "special",
        label: "At least one special character",
        valid: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
      },
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
  const allPasswordRequirementsMet = passwordRequirements.every(
    (item) => item.valid,
  );
  const showPasswordGuide =
    formData.password.length > 0 && !allPasswordRequirementsMet;

  // referral code from URL
  useEffect(() => {
    const refCodeFromURL = searchParams.get("ref_code");
    if (refCodeFromURL) {
      setFormData((prev) => ({
        ...prev,
        referral_code: refCodeFromURL,
      }));
      setIsReferralLocked(true);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setErrors((prev) => prev.filter((err) => err.field !== name));
    setMessage("");
  };

  const handleAgree = (e) => {
    setAgree(e.target.checked);
  };

  const validateForm = () => {
    const emailRegex = /^\S+@\S+\.\S+$/;

    if (!formData.email.trim()) return "Email is required";
    if (!emailRegex.test(formData.email)) return "Invalid email format";
    if (!formData.full_name.trim()) return "Name is required";
    if (!formData.referral_code.trim()) return "Referral code is required";
    if (!formData.password.trim()) return "Password is required";

    if (formData.password.length < 8)
      return "Password must be at least 8 characters";

    if (!/[A-Z]/.test(formData.password))
      return "Password must include an uppercase letter";

    if (!/[a-z]/.test(formData.password))
      return "Password must include a lowercase letter";

    if (!/[0-9]/.test(formData.password))
      return "Password must include a number";

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password))
      return "Password must include a special character";
    if (formData.password !== formData.confirm_password)
      return "Passwords do not match";

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

      const payload = { ...formData };
      await registerUser(payload);

      setMessage("Registration successful. Check your email for OTP.");
      setIsSuccess(true);

      setTimeout(() => {
        navigate(
          `/email-verification?email=${encodeURIComponent(formData.email)}`,
        );
      }, 600);
    } catch (error) {
      const res = error.response;
      // console.log("❌ FULL ERROR OBJECT:", error);
      setIsSuccess(false);

      if (!res) {
        setMessage("Network error or server not reachable");
        setLoading(false);
        return;
      }

      // 422 validation errors
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

      const msg =
        res.data?.message || res.data?.detail || "Something went wrong";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || !agree || errors.length > 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-[#0A122C] px-4 pt-[120px] sm:pt-20 md:pt-28 lg:pt-36">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg rounded-lg w-full max-w-md p-3 hover:shadow-blue-900/50 transition-shadow duration-600">
          {/* Icon */}
          <div className="flex flex-col items-center justify-center">
            <h1 className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white text-xl sm:text-2xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300">
              👤
            </h1>
          </div>

          <h2 className="text-2xl font-bold mb-6 text-[#FFFFFF] text-center pt-4">
            Registration Form
          </h2>

          <form className="space-y-4 p-8 text-black" onSubmit={handleSubmit}>
            <div>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                onChange={handleChange}
              />
              {errors.find((e) => e.field === "email") && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.find((e) => e.field === "email").message}
                </p>
              )}
            </div>
            {/* name */}

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
                <p className="text-xs text-red-500 mt-1">
                  {errors.find((e) => e.field === "full_name").message}
                </p>
              )}
            </div>

            {/* referral code */}
            <div>
              <input
                type="text"
                name="referral_code"
                value={formData.referral_code}
                placeholder="Enter referral code"
                readOnly={isReferralLocked}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black"
              />
              {isReferralLocked && (
                <p className="text-xs text-[#00CFF5] mt-1">
                  Referral applied from invitation link
                </p>
              )}
              {errors.find((e) => e.field === "referral_code") && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.find((e) => e.field === "referral_code").message}
                </p>
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
                <p className="text-xs text-red-500 mt-1">
                  {errors.find((e) => e.field === "password").message}
                </p>
              )}
            </div>
            {/* Confirm Password */}
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
                <p className="text-xs font-semibold tracking-wide text-white">
                  Password requirements
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {passwordRequirements.map((item) => (
                    <p
                      key={item.key}
                      className={`flex items-center gap-2 text-xs ${
                        item.valid ? "text-emerald-300" : "text-gray-300"
                      }`}
                    >
                      {item.valid ? (
                        <CheckCircle2 size={14} className="shrink-0" />
                      ) : (
                        <Circle size={14} className="shrink-0" />
                      )}
                      {item.label}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Checkbox */}
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
                <a
                  className="text-[#00CFF5] cursor-pointer hover:underline"
                  href="/terms-conditions"
                  rel="noopener noreferrer"
                  // onClick={() => navigate('/terms-conditions')}
                  target="_blank"
                >
                  Terms & Conditions
                </a>
              </p>
            </div>

            {/* dynamic message color */}
            {message && !passwordMessages.includes(message) && (
              <p
                className={`text-center text-sm ${
                  isSuccess ? "text-blue-500" : "text-red-500"
                }`}
              >
                {message}
              </p>
            )}

            <div className="flex justify-center pt-1">
              <Button
                type="submit"
                disabled={isButtonDisabled}
                variant="gradient"
              >
                {loading ? "Registering..." : "Register"}
              </Button>
            </div>

            <p className="text-center text-sm text-white pt-2">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#00CFF5] cursor-pointer hover:underline font-bold"
              >
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
