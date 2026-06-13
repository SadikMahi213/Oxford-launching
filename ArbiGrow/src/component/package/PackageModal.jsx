import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Button from "../Button";
import useUserStore from "../../store/userStore";
import {
  buyInvestment,
  getMyInvestments,
  refreshUserStore,
} from "../../api/user.api";

export default function PackageModal({
  selectedPackage,
  setSelectedPackage,
  onPurchased,
}) {
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);
  const setUser = useUserStore((state) => state.setUser);
  const isLoggedIn = !!token;

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [minimumAllowedAmount, setMinimumAllowedAmount] = useState(0);

  useEffect(() => {
    setPurchaseError("");
    setPurchaseSuccess("");
    setIsPurchasing(false);
  }, [selectedPackage]);

  useEffect(() => {
    const loadEligibility = async () => {
      if (!selectedPackage || !isLoggedIn) {
        setEligibilityLoading(false);
        setMinimumAllowedAmount(0);
        return;
      }

      setEligibilityLoading(true);

      try {
        const response = await getMyInvestments();
        const items = Array.isArray(response?.data) ? response.data : [];

        const highestActiveAmount = items.reduce((maxAmount, investment) => {
          const amount = Number(investment?.invested_amount ?? 0);
          const isActive = investment?.status === "active";
          if (!isActive) {
            return maxAmount;
          }

          return Math.max(maxAmount, amount);
        }, 0);

        setMinimumAllowedAmount(highestActiveAmount);
      } catch {
        setMinimumAllowedAmount(0);
      } finally {
        setEligibilityLoading(false);
      }
    };

    loadEligibility();
  }, [selectedPackage, isLoggedIn]);

  if (!selectedPackage) return null;

  const amt = selectedPackage.investment_amount || selectedPackage.amount || 0;
  const dailyPmt = selectedPackage.daily_payment || selectedPackage.dailyPayment || 0;
  const totalRet = selectedPackage.total_return || selectedPackage.totalReturn || 0;
  const captchaReq = selectedPackage.captcha_required_per_day || selectedPackage.captchaRequiredPerDay || 0;
  const durDays = selectedPackage.duration_days || selectedPackage.durationDays || 0;

  const isLowerPackage = isLoggedIn && amt < minimumAllowedAmount;

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

    if (isLowerPackage) {
      setPurchaseError(
        `You can only buy ${minimumAllowedAmount.toLocaleString()} USDT or higher until your current package completes.`,
      );
      return;
    }

    setIsPurchasing(true);
    setPurchaseError("");
    setPurchaseSuccess("");

    try {
      const payload = {
        package_name: selectedPackage.name,
        amount: selectedPackage.investment_amount || selectedPackage.amount,
      };

      const purchaseResponse = await buyInvestment(payload);

      try {
        const userResponse = await refreshUserStore();
        if (userResponse?.data?.user) {
          setUser(userResponse.data.user);
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
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail
            .map((item) => item?.msg)
            .filter(Boolean)
            .join(", ")
        : detail || "Failed to activate package";
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
                  Oxford Financial Ads Captcha Typing Package
                </p>
              </div>

              <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-gray-400">Package Name</p>
                    <p className="font-semibold text-white">
                      {selectedPackage.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Investment Amount</p>
                    <p className="font-semibold text-cyan-400">
                      ${amt.toLocaleString()} USDT
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Daily Captcha Requirement</p>
                    <p className="font-semibold text-green-400">
                      {captchaReq} Captchas Daily
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Duration</p>
                    <p className="font-semibold text-cyan-400">
                      {durDays} Days
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Daily Payment</p>
                    <p className="font-semibold text-yellow-400">
                      ${dailyPmt.toFixed(2)} USDT
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Total Return</p>
                    <p className="font-semibold text-purple-400">
                      ${totalRet.toLocaleString()} USDT
                    </p>
                  </div>
                </div>
              </div>

              {!isLoggedIn && (
                <Button variant="gradient" onClick={handlePurchase}>
                  Login to Continue
                </Button>
              )}

              {isLoggedIn && eligibilityLoading && (
                <div className="rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm text-gray-300">
                  Checking package eligibility...
                </div>
              )}

              {isLoggedIn && !eligibilityLoading && !isLowerPackage && (
                <Button
                  variant="gradient"
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                >
                  {isPurchasing
                    ? "Activating..."
                    : "Activate Package"}
                </Button>
              )}

              {isLoggedIn && !eligibilityLoading && isLowerPackage && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-center text-sm text-amber-300">
                  Lower package locked. You can buy{" "}
                  {minimumAllowedAmount.toLocaleString()} USDT or higher until
                  active package completes.
                </p>
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
                Requires wallet connection and compliance verification
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
