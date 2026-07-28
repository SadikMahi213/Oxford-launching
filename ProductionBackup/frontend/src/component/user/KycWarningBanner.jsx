import { useTranslation } from "react-i18next";
import { ShieldCheck, ArrowRight, Clock, XCircle } from "lucide-react";
import { useNavigate } from "react-router";
import useUserStore from "../../store/userStore";

export default function KycWarningBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const kycStatus = user?.kyc_status;
  if (!kycStatus || kycStatus === "approved") return null;

  const statusLabel = kycStatus === "pending" ? t("profileCard.pendingVerification") : kycStatus === "rejected" ? t("profileCard.rejected") : t("profileCard.notVerified");
  const statusIcon = kycStatus === "pending" ? <Clock className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
    : kycStatus === "rejected" ? <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
    : <ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />;

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${
      kycStatus === "rejected"
        ? "border-red-500/30 bg-red-500/10"
        : "border-amber-500/30 bg-amber-500/10"
    }`}>
      {statusIcon}
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-300">
          {t("kycWarningBanner.title")}
        </p>
        <p className={`text-xs mt-1 ${
          kycStatus === "rejected" ? "text-red-200/80" : "text-amber-200/80"
        }`}>
          {kycStatus === "pending"
            ? t("kycWarningBanner.pendingMessage")
            : kycStatus === "rejected"
            ? t("kycWarningBanner.rejectedMessage")
            : t("kycWarningBanner.notVerifiedMessage")}
        </p>
        <p className="text-xs text-gray-500 mt-1">{t("kycWarningBanner.status")} <span className={
          kycStatus === "pending" ? "text-amber-400" : kycStatus === "rejected" ? "text-red-400" : "text-amber-400"
        }>{statusLabel}</span></p>
        {kycStatus !== "pending" && (
          <button
            onClick={() => navigate("/verification-page")}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors"
          >
            {kycStatus === "rejected" ? t("kycWarningBanner.resubmit") : t("kycWarningBanner.completeKyc")} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
