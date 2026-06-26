import { ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import useUserStore from "../../store/userStore";

export default function KycWarningBanner() {
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const kycStatus = user?.kyc_status;
  if (!kycStatus || kycStatus === "approved") return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
      <ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-300">
          KYC Verification Required
        </p>
        <p className="text-xs text-amber-200/80 mt-1">
          Complete your KYC verification to unlock financial features including
          withdrawals, transfers, and sending funds.
        </p>
        <button
          onClick={() => navigate("/verification-page")}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors"
        >
          Complete KYC <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
