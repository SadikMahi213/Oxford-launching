import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { verifyEmail, resendVerificationEmail } from "../api/auth.api.js";
import Button from "../component/Button.jsx";

export default function EmailVerificationPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("form");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(t("emailVerification.err_codeRequired"));
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(t("emailVerification.err_codeFormat"));
      return;
    }

    try {
      setIsVerifying(true);
      const res = await verifyEmail({ email: normalizedEmail, otp });
      const message = res?.data?.message || t("emailVerification.success");
      setInfo(message);
      setStatus("success");
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        t("emailVerification.err_general");
      setError(detail);
      setStatus("form");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(t("emailVerification.err_codeRequired"));
      return;
    }

    try {
      setIsResending(true);
      const res = await resendVerificationEmail(normalizedEmail);
      setInfo(res?.data?.message || t("emailVerification.infoText"));
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        t("emailVerification.err_general");
      setError(detail);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      <main className="flex min-h-screen items-center justify-center px-4 py-24 sm:px-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        <div className="relative w-full max-w-md">
          {status === "success" ? (
            <SuccessState info={info} />
          ) : (
            <VerificationForm
              email={email}
              setEmail={setEmail}
              otp={otp}
              setOtp={setOtp}
              error={error}
              info={info}
              isVerifying={isVerifying}
              isResending={isResending}
              onVerify={handleVerify}
              onResend={handleResend}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function VerificationForm({
  email,
  setEmail,
  otp,
  setOtp,
  error,
  info,
  isVerifying,
  isResending,
  onVerify,
  onResend,
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-8 backdrop-blur-xl shadow-2xl shadow-black/20">
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
            <Mail className="h-10 w-10 text-cyan-400" />
          </div>
        </div>
      </div>

      <h2 className="mb-2 text-center text-2xl font-semibold text-white">
        {t("emailVerification.subtitle")}
      </h2>
      <p className="mb-6 text-center text-gray-400">
        {t("emailVerification.infoText")}
      </p>

      <form onSubmit={onVerify} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-gray-300">{t("emailVerification.emailLabel")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-300">{t("emailVerification.codeLabel")}</label>
          <input
            type="text"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-center text-lg tracking-[0.35em] text-white outline-none focus:border-cyan-400"
            placeholder={t("emailVerification.codePlaceholder")}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <XCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>{info}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isVerifying}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-medium text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("emailVerification.sending")}
            </>
          ) : (
            t("emailVerification.verify")
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={onResend}
        disabled={isResending}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isResending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {t("emailVerification.resending")}
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" /> {t("emailVerification.resend")}
          </>
        )}
      </button>

      <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/5 pt-6">
        <Shield className="h-4 w-4 text-cyan-400" />
        <span className="text-sm text-gray-400">
          {t("emailVerification.otpExpiry")}
        </span>
      </div>
    </div>
  );
}

function SuccessState({ info }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-8 backdrop-blur-xl shadow-2xl shadow-black/20">
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-center text-2xl font-semibold text-white">
        {t("emailVerification.successTitle")}
      </h2>

      <p className="mb-8 text-center text-gray-400">
        {info || t("emailVerification.successDesc")}
      </p>

      <div className="mb-6 space-y-3">
        <Link to="/login">
          <button className="w-full mb-6 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-medium text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40">
            {t("emailVerification.continueToLogin")}
          </button>
        </Link>
        <Link to="/">
          <Button variant="frosted">{t("emailVerification.returnHome")}</Button>
        </Link>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-white/5 pt-6">
        <Shield className="h-4 w-4 text-green-400" />
        <span className="text-sm text-gray-400">
          {t("emailVerification.encryptionText")}
        </span>
      </div>
    </div>
  );
}
