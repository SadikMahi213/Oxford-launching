import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Navbar from "../component/Navbar";
import Button from "../component/Button";
import { registerUser } from "../api/auth.api.js";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Circle, Eye, EyeOff, Rocket } from "lucide-react";
import api from "../api/axiosInstance.js";
import { useTranslation } from "react-i18next";
import loginImg from "../assets/login.jpeg";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominican Republic", "DR Congo",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Guinea", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe",
];

const GENDERS = ["Male", "Female", "Other"];
const RELIGIONS = ["Islam", "Hinduism", "Christianity", "Buddhism", "Judaism", "Sikhism", "Other"];
const MARITAL_STATUSES = ["Married", "Unmarried"];

export default function RegisterForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [agree, setAgree] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    date_of_birth: "",
    gender: "",
    nationality: "",
    country_of_residence: "",
    mobile_number: "",
    residential_address: "",
    city: "",
    state_province: "",
    postal_code: "",
    national_id_number: "",
    passport_number: "",
    religion: "",
    marital_status: "",
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
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packagesLoading, setPackagesLoading] = useState(true);

  const passwordRequirements = useMemo(
    () => [
      { key: "length", label: t("auth.register.req_chars"), valid: formData.password.length >= 8 },
      { key: "uppercase", label: t("auth.register.req_upper"), valid: /[A-Z]/.test(formData.password) },
      { key: "lowercase", label: t("auth.register.req_lower"), valid: /[a-z]/.test(formData.password) },
      { key: "number", label: t("auth.register.req_number"), valid: /[0-9]/.test(formData.password) },
      { key: "special", label: t("auth.register.req_special"), valid: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
    ],
    [formData.password, t],
  );
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
      if (data.length === 1) {
        setSelectedPackageId(String(data[0].id));
      }
    }).catch(() => {
      setPackages([]);
    }).finally(() => {
      setPackagesLoading(false);
    });
  }, []);

  const selectedPackage = packages.find((p) => String(p.id) === selectedPackageId);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => prev.filter((err) => err.field !== name));
    setMessage("");
  };

  const handleAgree = (e) => setAgree(e.target.checked);

  const validateForm = () => {
    if (!selectedPackageId) return t("auth.register.err_plan");
    if (!formData.first_name.trim()) return t("auth.register.err_firstName");
    if (!formData.last_name.trim()) return t("auth.register.err_lastName");
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!formData.email.trim()) return t("auth.register.err_email");
    if (!emailRegex.test(formData.email)) return t("auth.register.err_emailFormat");
    if (!formData.date_of_birth) return t("auth.register.err_dob");
    if (!formData.gender) return t("auth.register.err_gender");
    if (!formData.nationality) return t("auth.register.err_nationality");
    if (!formData.country_of_residence) return t("auth.register.err_country");
    if (!formData.mobile_number.trim()) return t("auth.register.err_mobile");
    if (!formData.password.trim()) return t("auth.register.err_password");
    if (formData.password.length < 8) return t("auth.register.err_passwordLength");
    if (!/[A-Z]/.test(formData.password)) return t("auth.register.err_passwordUpper");
    if (!/[a-z]/.test(formData.password)) return t("auth.register.err_passwordLower");
    if (!/[0-9]/.test(formData.password)) return t("auth.register.err_passwordNumber");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) return t("auth.register.err_passwordSpecial");
    if (formData.password !== formData.confirm_password) return t("auth.register.err_passwordMatch");
    if (!agree) return t("auth.register.err_agree");
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
        full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        package_id: Number(selectedPackageId),
      };
      for (const key of Object.keys(payload)) {
        if (payload[key] === "" || payload[key] === undefined) {
          delete payload[key];
        }
      }
      const regRes = await registerUser(payload);
      const isPaid = regRes?.data?.account_status === "pending_payment";
      if (isPaid) {
        setMessage(t("auth.register.success_paid"));
      } else {
        setMessage(t("auth.register.success"));
      }
      setIsSuccess(true);
      setTimeout(() => navigate(isPaid ? "/login" : "/login"), 800);
    } catch (error) {
      const res = error.response;
      setIsSuccess(false);
      if (!res) {
        setMessage(t("auth.register.networkError"));
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
      const msg = res.data?.message || res.data?.detail || t("auth.register.error");
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || !agree || errors.length > 0 || !selectedPackageId;

  const fieldClass = "w-full px-4 py-2 border border-white/20 rounded-lg bg-[#0C1035] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50";
  const labelClass = "block text-sm font-semibold text-gray-300 mb-1";
  const errorMsg = (field) => errors.find((e) => e.field === field)?.message && (
    <p className="text-xs text-red-500 mt-1">{errors.find((e) => e.field === field).message}</p>
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-[#0A122C] px-2 xs:px-4 pt-24 pb-12">
        <div className="w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/40 border border-white/10 flex flex-col lg:flex-row">
          
          {/* ── LEFT/TOP: Image Panel (top banner on mobile, left half on desktop) */}
          <div className="w-full h-52 lg:h-auto lg:w-5/12 xl:w-2/5 relative flex-shrink-0">
            <img
              src={loginImg}
              alt={t("app.name")}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A122C]/90 via-[#0A122C]/40 to-transparent" />
            {/* Branding text — bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8">
              <p className="text-xs font-semibold tracking-[0.25em] text-cyan-400 uppercase mb-1">
                {t("app.name")}
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-2">
                {t("auth.register.joinTitle")}
              </h2>
              <p className="text-xs lg:text-sm text-gray-300 leading-relaxed hidden lg:block">
                {t("auth.register.joinSubtitle")}
              </p>
            </div>
          </div>

          {/* ── RIGHT/BOTTOM: Form Panel ─────────────────────────── */}
          <div className="w-full lg:w-7/12 xl:w-3/5 bg-white/5 backdrop-blur-sm p-4 sm:p-8 flex flex-col justify-start max-h-[85vh] lg:max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:scale-105 transition-all duration-300 mb-4">
                <Rocket size={28} strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{t("auth.register.title")}</h1>
              <p className="text-gray-400 mt-2 text-sm">{t("auth.register.subtitle")}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg rounded-lg p-4 sm:p-6">
              <form className="space-y-6 text-black" onSubmit={handleSubmit}>

              {/* Package Selection */}
              {packagesLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div>
                  <label className={`${labelClass} text-cyan-300`}>{t("auth.register.selectPlan")}</label>
                  <select
                    value={selectedPackageId}
                    onChange={(e) => { setSelectedPackageId(e.target.value); setMessage(""); }}
                    className={fieldClass}
                  >
                    <option value="">{t("auth.register.choosePlan")}</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — ${Number(pkg.investment_amount).toLocaleString()} (${Number(pkg.daily_payment).toFixed(2)}{t("auth.register.perDay")})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPackage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div>
                    <p className="text-xs text-gray-400">{t("auth.register.planSummary_investment")}</p>
                    <p className="text-sm font-bold text-white">${Number(selectedPackage.investment_amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("auth.register.planSummary_daily")}</p>
                    <p className="text-sm font-bold text-green-300">${Number(selectedPackage.daily_payment).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("auth.register.planSummary_duration")}</p>
                    <p className="text-sm font-bold text-cyan-300">{t("auth.register.planSummary_days", { count: selectedPackage.duration_days })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("auth.register.planSummary_return")}</p>
                    <p className="text-sm font-bold text-yellow-300">${Number(selectedPackage.total_return).toLocaleString()}</p>
                  </div>
                </motion.div>
              )}

              {/* Personal Information */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-base font-bold text-cyan-300 mb-4">{t("auth.register.personalInfo")}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("auth.register.firstName")}</label>
                    <input type="text" name="first_name" placeholder={t("auth.register.firstName_plh")} value={formData.first_name} onChange={handleChange} className={fieldClass} />
                    {errorMsg("first_name")}
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.lastName")}</label>
                    <input type="text" name="last_name" placeholder={t("auth.register.lastName_plh")} value={formData.last_name} onChange={handleChange} className={fieldClass} />
                    {errorMsg("last_name")}
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.dob")}</label>
                    <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={fieldClass} />
                    {errorMsg("date_of_birth")}
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.gender")}</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className={fieldClass}>
                      <option value="">{t("auth.register.selectGender")}</option>
                      {GENDERS.map((g) => <option key={g} value={g}>{t("auth.register." + g.toLowerCase())}</option>)}
                    </select>
                    {errorMsg("gender")}
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.nationality")}</label>
                    <select name="nationality" value={formData.nationality} onChange={handleChange} className={fieldClass}>
                      <option value="">{t("auth.register.selectNationality")}</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errorMsg("nationality")}
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.religion")}</label>
                    <select name="religion" value={formData.religion} onChange={handleChange} className={fieldClass}>
                      <option value="">{t("auth.register.selectReligion")}</option>
                      {RELIGIONS.map((r) => <option key={r} value={r}>{t("auth.register.religion_" + r.toLowerCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.maritalStatus")}</label>
                    <select name="marital_status" value={formData.marital_status} onChange={handleChange} className={fieldClass}>
                      <option value="">{t("auth.register.selectMarital")}</option>
                      {MARITAL_STATUSES.map((s) => <option key={s} value={s}>{t("auth.register." + s.toLowerCase())}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact & Address */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-base font-bold text-cyan-300 mb-4">{t("auth.register.contactAddress")}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("auth.register.email")}</label>
                    <input type="email" name="email" placeholder={t("auth.register.email_plh")} value={formData.email} onChange={handleChange} className={fieldClass} />
                    {errorMsg("email")}
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.mobile")}</label>
                    <input type="tel" name="mobile_number" placeholder={t("auth.register.mobile_plh")} value={formData.mobile_number} onChange={handleChange} className={fieldClass} />
                    {errorMsg("mobile_number")}
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.country")}</label>
                    <select name="country_of_residence" value={formData.country_of_residence} onChange={handleChange} className={fieldClass}>
                      <option value="">{t("auth.register.selectCountry")}</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errorMsg("country_of_residence")}
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.city")}</label>
                    <input type="text" name="city" placeholder={t("auth.register.city_plh")} value={formData.city} onChange={handleChange} className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.state")}</label>
                    <input type="text" name="state_province" placeholder={t("auth.register.state_plh")} value={formData.state_province} onChange={handleChange} className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.postal")}</label>
                    <input type="text" name="postal_code" placeholder={t("auth.register.postal_plh")} value={formData.postal_code} onChange={handleChange} className={fieldClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{t("auth.register.address")}</label>
                    <textarea name="residential_address" placeholder={t("auth.register.address_plh")} value={formData.residential_address} onChange={handleChange} className={fieldClass} rows="2" />
                  </div>
                </div>
              </div>

              {/* Identity Information */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-base font-bold text-cyan-300 mb-4">{t("auth.register.identityInfo")}</h3>
                <p className="text-xs text-gray-500 mb-3">{t("auth.register.identityDesc")}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("auth.register.nationalId")}</label>
                    <input type="text" name="national_id_number" placeholder={t("auth.register.nationalId_plh")} value={formData.national_id_number} onChange={handleChange} className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("auth.register.passport")}</label>
                    <input type="text" name="passport_number" placeholder={t("auth.register.passport_plh")} value={formData.passport_number} onChange={handleChange} className={fieldClass} />
                  </div>
                </div>
              </div>

              {/* Account Security */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-base font-bold text-cyan-300 mb-4">{t("auth.register.accountSecurity")}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("auth.register.referralCode")}</label>
                    <input
                      type="text"
                      name="referral_code"
                      value={formData.referral_code}
                      placeholder={t("auth.register.referral_plh")}
                      readOnly={isReferralLocked}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                    {isReferralLocked && (
                      <p className="text-xs text-[#00CFF5] mt-1">{t("auth.register.referralApplied")}</p>
                    )}
                    {errorMsg("referral_code")}
                  </div>
                  <div></div>
                  <div className="relative">
                    <label className={labelClass}>{t("auth.register.password")}</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder={t("auth.register.password_plh")}
                      value={formData.password}
                      className={fieldClass}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[34px] text-gray-500 hover:text-cyan-300 transition"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    {errorMsg("password")}
                  </div>
                  <div className="relative">
                    <label className={labelClass}>{t("auth.register.confirmPassword")}</label>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      placeholder={t("auth.register.confirm_plh")}
                      value={formData.confirm_password}
                      className={fieldClass}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-[34px] text-gray-500 hover:text-cyan-300 transition"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {showPasswordGuide && (
                  <div className="rounded-lg border border-cyan-500/30 bg-[#0C1035] px-3 py-3 mt-4">
                    <p className="text-xs font-semibold tracking-wide text-white">{t("auth.register.passwordReqs")}</p>
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
              </div>

              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="agree"
                  className="h-4 w-4 rounded border-gray-300 accent-cyan-500"
                  checked={agree}
                  onChange={handleAgree}
                />
                <p className="text-gray-400">
                  {t("auth.register.agree")}{" "}
                  <a className="text-[#00CFF5] cursor-pointer hover:underline" href="/terms-conditions" rel="noopener noreferrer" target="_blank">
                    {t("auth.register.terms")}
                  </a>
                </p>
              </div>

              {message && (
                <p className={`text-center text-sm ${isSuccess ? "text-green-400" : "text-red-500"}`}>{message}</p>
              )}

              <div className="flex justify-center pt-1">
                <Button type="submit" disabled={isButtonDisabled} variant="gradient">
                  {loading ? t("auth.register.registering") : t("auth.register.submit")}
                </Button>
              </div>

              <p className="text-center text-sm text-white pt-2">
                {t("auth.register.hasAccount")}{" "}
                <Link to="/login" className="text-[#00CFF5] cursor-pointer hover:underline font-bold">
                  {t("auth.register.login")}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
