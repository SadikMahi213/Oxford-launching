import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Button from "../Button";
import useUserStore from "../../store/userStore";
import {
  buyInvestment,
  refreshUserStore,
} from "../../api/user.api";

export default function PackageModal({
  selectedPackage,
  setSelectedPackage,
  onPurchased,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);
  const setUser = useUserStore((state) => state.setUser);
  const isLoggedIn = !!token;

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  useEffect(() => {
    setPurchaseError("");
    setPurchaseSuccess("");
    setIsPurchasing(false);
  }, [selectedPackage]);

  if (!selectedPackage) return null;

  const amt = selectedPackage.investment_amount ?? selectedPackage.amount ?? 0;
  const dailyPmt = selectedPackage.daily_payment ?? selectedPackage.dailyPayment ?? 0;
  const totalRet = selectedPackage.total_return ?? selectedPackage.totalReturn ?? 0;
  const captchaReq = selectedPackage.captcha_required_per_day ?? selectedPackage.captchaRequiredPerDay ?? 0;
  const durDays = selectedPackage.duration_days ?? selectedPackage.durationDays ?? 0;

  const handleClose = () => {
    setPurchaseError("");
    setPurchaseSuccess("");
    setIsPurchasing(false);
    setSelectedPackage(null);
  };

  const handlePurchase = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    setIsPurchasing(true);
    setPurchaseError("");
    setPurchaseSuccess("");

    try {
      const payload = {
        package_name: selectedPackage.name,
        amount: selectedPackage.investment_amount ?? selectedPackage.amount ?? 0,
      };

      const purchaseResponse = await buyInvestment(payload);

      try {
        const userResponse = await refreshUserStore();
        if (userResponse?.data?.user) {
          setUser({ ...userResponse.data.user, kyc_status: userResponse.data.kyc_status });
        }
      } catch {
        // Purchase succeeded, wallet refresh can be retried later.
      }

      setPurchaseSuccess("Package activated successfully.");
      onPurchased?.(purchaseResponse?.data);

      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail
            .map((item) => item?.msg)
            .filter(Boolean)
            .join(", ")
        : detail || (status ? `Server error (${status})` : "Failed to activate package");
      setPurchaseError(message);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <AnimatePresence>
      {selectedPackage && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0d1428] to-[#0a0e27] p-8 shadow-2xl"
            >
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <X className="size-5" />
              </button>

              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white">
                  {selectedPackage.name}
                </h2>
                <p className="mt-2 text-gray-400">
                  Oxford Financial Ads{" "}
                  {selectedPackage.task_type === "ad_view" ? t("packageModal.adViewPackage") : t("packageModal.captchaPackage")} Package
                </p>
              </div>

              <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-gray-400">{t("packageModal.packageLabel")}</p>
                    <p className="font-semibold text-white">
                      {selectedPackage.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">{t("packageModal.investmentAmount")}</p>
                    <p className="font-semibold text-cyan-400">
                      ${amt.toLocaleString()} USDT
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">{selectedPackage.task_type === "ad_view" ? t("packageModal.dailyAds") : t("packageModal.dailyCaptcha")}</p>
                    <p className="font-semibold text-green-400">
                      {captchaReq} {selectedPackage.task_type === "ad_view" ? "Ads" : "Captchas"} Daily
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">{t("packageModal.duration")}</p>
                    <p className="font-semibold text-cyan-400">
                      {durDays} Days
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">{t("packageModal.dailyPayment")}</p>
                    <p className="font-semibold text-yellow-400">
                      ${dailyPmt.toFixed(2)} USDT
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">{t("packageModal.totalReturn")}</p>
                    <p className="font-semibold text-purple-400">
                      ${totalRet.toLocaleString()} USDT
                    </p>
                  </div>
                </div>
              </div>

              {!isLoggedIn && (
                <Button variant="gradient" onClick={handlePurchase}>
                  {t("packageModal.loginToContinue")}
                </Button>
              )}

              {isLoggedIn && (
                <>
                  <Button
                    variant="gradient"
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                  >
                    {isPurchasing
                      ? t("packageModal.activating")
                      : t("packageModal.activatePackage")}
                  </Button>
                </>
              )}

              {purchaseError && (
                <p className="mt-3 text-center text-sm text-red-400">
                  {purchaseError}
                </p>
              )}

              {purchaseSuccess && (
                <p className="mt-3 text-center text-sm text-green-400">
                  {purchaseSuccess}
                </p>
              )}

              <p className="mt-4 text-center text-xs text-gray-500">
                {t("packageModal.footerNote")}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
