import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Building2, CheckCircle, Clock, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { getMyBankInfo, submitBankInfo } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";
import StatusFeedbackModal from "../StatusFeedbackModal.jsx";

const INITIAL_FORM = {
  account_holder_name: "",
  bank_name: "",
  account_number: "",
  branch_name: "",
  branch_address: "",
  swift_code: "",
  routing_code: "",
  country: "",
  currency: "USD",
  account_type: "savings",
};

const getErr = (e) => e?.response?.data?.detail || e?.message;

export default function BankingSetup() {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bankInfo, setBankInfo] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setForm((prev) => ({ ...prev, account_holder_name: user.full_name || "" }));
    getMyBankInfo()
      .then((res) => setBankInfo(res?.data?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const errs = {};
    const required = ["account_holder_name", "bank_name", "account_number", "branch_name", "branch_address", "swift_code", "country", "currency", "account_type"];
    required.forEach((f) => { if (!form[f]?.trim()) errs[f] = t("banking.requiredField"); });
    if (form.swift_code?.trim().length < 3) errs.swift_code = t("banking.invalidSwift");
    if (!form.currency?.trim()) errs.currency = t("banking.currencyRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await submitBankInfo(form);
      setBankInfo(res?.data?.data);
      setFeedback({ type: "success", message: t("banking.submitted") });
    } catch (err) {
      setFeedback({ type: "error", message: getErr(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full rounded-xl border bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 ${
      errors[field] ? "border-red-500/60" : "border-white/10"
    }`;

  const labelClass = "text-sm text-gray-400 mb-1.5 block font-medium tracking-wide";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (bankInfo?.status === "approved") {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/30 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <h2 className="text-xl font-bold text-green-300">{t("banking.approved")}</h2>
          </div>
          <p className="text-green-200/80 text-sm">{t("banking.approvedDesc")}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 space-y-3"
        >
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-cyan-400" /> {t("banking.registeredAccount")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {[
              [t("banking.accountHolder"), bankInfo.account_holder_name],
              [t("banking.bankName"), bankInfo.bank_name],
              [t("banking.accountNumber"), bankInfo.account_number],
              [t("banking.branchName"), bankInfo.branch_name],
              [t("banking.branchAddress"), bankInfo.branch_address],
              [t("banking.swift"), bankInfo.swift_code],
              [t("banking.routing"), bankInfo.routing_code || "—"],
              [t("banking.country"), bankInfo.country],
              [t("banking.currency"), bankInfo.currency],
              [t(`banking.type.${bankInfo.account_type}`), bankInfo.account_type.charAt(0).toUpperCase() + bankInfo.account_type.slice(1)],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-white/5 pb-2">
                <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
                <p className="text-white font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-white/5">
            {t("banking.updateContact")}
          </p>
        </motion.div>
      </div>
    );
  }

  if (bankInfo && bankInfo.status !== "approved") {
    const statusLabel = bankInfo.status === "pending" ? t("banking.pendingReview") : t("banking.rejected");
    const statusColor = bankInfo.status === "pending" ? "text-yellow-400" : "text-red-400";
    const statusBg = bankInfo.status === "pending" ? "border-yellow-500/30 bg-yellow-500/10" : "border-red-500/30 bg-red-500/10";
    return (
      <div className="p-4 md:p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border ${statusBg} p-6`}
        >
          <div className="flex items-center gap-3 mb-3">
            {bankInfo.status === "pending" ? <Clock className="w-8 h-8 text-yellow-400" /> : <AlertTriangle className="w-8 h-8 text-red-400" />}
            <div>
              <h2 className={`text-xl font-bold ${statusColor}`}>{statusLabel}</h2>
              <p className="text-gray-400 text-sm mt-1">
                {bankInfo.status === "pending"
                  ? t("banking.pendingDesc")
                  : t("banking.rejectedDesc", { reason: bankInfo.admin_note ? ` ${t("banking.reason")} ${bankInfo.admin_note}` : "" })}
              </p>
            </div>
          </div>
        </motion.div>
        {bankInfo.admin_note && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl bg-white/5 border border-white/10 p-4"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("banking.adminNote")}</p>
            <p className="text-sm text-gray-300">{bankInfo.admin_note}</p>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Building2 className="w-7 h-7 text-cyan-400" />
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("banking.title")}
            </span>
          </h1>
        </div>
        <p className="text-sm text-gray-400 ml-10">
          {t("banking.subtitle")}
        </p>
      </motion.div>

      {/* Security Notice */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 p-5 flex items-start gap-4"
      >
        <Shield className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-cyan-200/80 space-y-1">
          <p className="font-semibold text-cyan-300">{t("banking.secureTitle")}</p>
          <p>{t("banking.secureDesc")}</p>
        </div>
      </motion.div>

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 space-y-5"
      >
        <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-3">{t("banking.requiredInfo")}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Account Holder Name */}
          <div className="md:col-span-2">
            <label className={labelClass}>{t("banking.accountHolder")} <span className="text-cyan-400">*</span></label>
            <input value={form.account_holder_name} onChange={set("account_holder_name")} className={inputClass("account_holder_name")} placeholder={t("banking.plhHolderName")} />
            {errors.account_holder_name && <p className="mt-1 text-xs text-red-300">{errors.account_holder_name}</p>}
          </div>

          {/* Bank Name */}
          <div>
            <label className={labelClass}>{t("banking.bankName")} <span className="text-cyan-400">*</span></label>
            <input value={form.bank_name} onChange={set("bank_name")} className={inputClass("bank_name")} placeholder={t("banking.plhBankName")} />
            {errors.bank_name && <p className="mt-1 text-xs text-red-300">{errors.bank_name}</p>}
          </div>

          {/* Account Number / IBAN */}
          <div>
            <label className={labelClass}>{t("banking.accountNumber")} <span className="text-cyan-400">*</span></label>
            <input value={form.account_number} onChange={set("account_number")} className={inputClass("account_number")} placeholder={t("banking.plhAccountNumber")} />
            {errors.account_number && <p className="mt-1 text-xs text-red-300">{errors.account_number}</p>}
          </div>

          {/* Branch Name */}
          <div>
            <label className={labelClass}>{t("banking.branchName")} <span className="text-cyan-400">*</span></label>
            <input value={form.branch_name} onChange={set("branch_name")} className={inputClass("branch_name")} placeholder={t("banking.plhBranchName")} />
            {errors.branch_name && <p className="mt-1 text-xs text-red-300">{errors.branch_name}</p>}
          </div>

          {/* SWIFT / BIC Code */}
          <div>
            <label className={labelClass}>{t("banking.swift")} <span className="text-cyan-400">*</span></label>
            <input value={form.swift_code} onChange={set("swift_code")} className={inputClass("swift_code")} placeholder={t("banking.plhSwift")} />
            {errors.swift_code && <p className="mt-1 text-xs text-red-300">{errors.swift_code}</p>}
          </div>

          {/* Branch Address */}
          <div className="md:col-span-2">
            <label className={labelClass}>{t("banking.branchAddress")} <span className="text-cyan-400">*</span></label>
            <textarea value={form.branch_address} onChange={set("branch_address")} rows={2} className={inputClass("branch_address")} placeholder={t("banking.plhBranchAddress")} />
            {errors.branch_address && <p className="mt-1 text-xs text-red-300">{errors.branch_address}</p>}
          </div>

          {/* Routing / ABA Code */}
          <div>
            <label className={labelClass}>{t("banking.routing")} <span className="text-gray-500">({t("banking.ifApplicable")})</span></label>
            <input value={form.routing_code} onChange={set("routing_code")} className={inputClass("routing_code")} placeholder={t("banking.plhRouting")} />
          </div>

          {/* Country */}
          <div>
            <label className={labelClass}>{t("banking.country")} <span className="text-cyan-400">*</span></label>
            <input value={form.country} onChange={set("country")} className={inputClass("country")} placeholder={t("banking.plhCountry")} />
            {errors.country && <p className="mt-1 text-xs text-red-300">{errors.country}</p>}
          </div>

          {/* Currency */}
          <div>
            <label className={labelClass}>{t("banking.currency")} <span className="text-cyan-400">*</span></label>
            <select value={form.currency} onChange={set("currency")} className={inputClass("currency")}>
              <option value="USD" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.USD")}</option>
              <option value="EUR" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.EUR")}</option>
              <option value="GBP" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.GBP")}</option>
              <option value="CHF" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.CHF")}</option>
              <option value="AED" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.AED")}</option>
              <option value="SAR" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.SAR")}</option>
              <option value="INR" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.INR")}</option>
              <option value="BDT" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.BDT")}</option>
              <option value="other" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.cur.other")}</option>
            </select>
            {errors.currency && <p className="mt-1 text-xs text-red-300">{errors.currency}</p>}
          </div>

          {/* Account Type */}
          <div>
            <label className={labelClass}>{t("banking.accountType")} <span className="text-cyan-400">*</span></label>
            <select value={form.account_type} onChange={set("account_type")} className={inputClass("account_type")}>
              <option value="savings" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.type.savings")}</option>
              <option value="current" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.type.current")}</option>
              <option value="business" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t("banking.type.business")}</option>
            </select>
            {errors.account_type && <p className="mt-1 text-xs text-red-300">{errors.account_type}</p>}
          </div>
        </div>

        {/* Declaration */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400 space-y-2">
          <p className="font-semibold text-gray-300">{t("banking.declaration")}</p>
          <p>{t("banking.declarationDesc")}</p>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3.5 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
          {submitting ? t("banking.submitting") : t("banking.submit")}
        </button>
      </motion.form>

      <StatusFeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
