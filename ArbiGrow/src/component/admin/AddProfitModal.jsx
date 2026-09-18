import { motion, AnimatePresence } from "motion/react";
import { X, Percent } from "lucide-react";

export function AddProfitModal({
  isOpen,
  investment,
  profitPercentage,
  onClose,
  onPercentageChange,
  onConfirm,
  loading = false,
}) {
  if (!isOpen || !investment) return null;

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const amount = toNumber(investment.amount);
  const expectedProfit = toNumber(investment.expectedProfit);
  const profitPaid = toNumber(investment.profitPaid);
  const roi = toNumber(investment.roi);
  const percentagePaid = toNumber(investment.percentagePaid);
  const percentageValue = Math.max(0, toNumber(profitPercentage));
  const calculatedProfit = (amount * percentageValue) / 100;
  const remainingProfit = Math.max(0, expectedProfit - profitPaid);

  const hasRemainingPercentage = Number.isFinite(
    Number(investment.remainingPercentage),
  );
  const remainingPercentage = Math.max(
    0,
    hasRemainingPercentage
      ? toNumber(investment.remainingPercentage)
      : roi - percentagePaid,
  );
  const maxAllowedPercentage = remainingPercentage;
  const minAllowedPercentage = Math.min(remainingPercentage, 0.01);
  const MotionDiv = motion.div;

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <MotionDiv
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border border-white/10 rounded-2xl max-w-md w-full"
        >
          {/* Modal Header */}
          <div className="border-b border-white/10 p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-cyan-400" />
              Add Profit Distribution
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">
                  Investment Amount:
                </span>
                <span className="text-white font-bold">
                  ${amount.toLocaleString()} USDT
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-400">
                  Remaining Profit:
                </span>
                <span className="text-white font-bold">
                  ${remainingProfit.toLocaleString()} USDT
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Already Paid:</span>
                <span className="text-blue-400 font-semibold">
                  ${profitPaid.toLocaleString()} USDT
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-400">
                  Remaining Percentage:
                </span>
                <span className="text-cyan-400 font-semibold">
                  {remainingPercentage.toFixed(2)}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Profit Percentage (%)
              </label>

              <input
                type="number"
                value={profitPercentage}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  if (nextValue === "") {
                    onPercentageChange("");
                    return;
                  }

                  const parsedValue = Number(nextValue);
                  if (Number.isNaN(parsedValue)) return;

                  onPercentageChange(String(parsedValue));
                }}
                placeholder="Enter percentage..."
                min={minAllowedPercentage}
                max={maxAllowedPercentage}
                step="0.0001"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors text-white placeholder-gray-500"
              />

              <p className="mt-2 text-xs text-gray-500">
                Max allowed: {maxAllowedPercentage.toFixed(2)}% (remaining percentage)
              </p>
            </div>

            {/* Calculated Amount Display */}
            {percentageValue > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    Calculated Profit Amount:
                  </span>
                  <span className="text-cyan-400 font-bold text-lg">
                    ${calculatedProfit.toFixed(2)} USDT
                  </span>
                </div>

                {calculatedProfit > remainingProfit && (
                  <p className="text-red-400 text-xs mt-2">
                    Warning: amount exceeds remaining profit
                  </p>
                )}

                {percentageValue > remainingPercentage && (
                  <p className="text-red-400 text-xs mt-2">
                    Warning: percentage exceeds remaining percentage
                  </p>
                )}


              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={
                  loading ||
                  !percentageValue ||
                  percentageValue < minAllowedPercentage ||
                  percentageValue > remainingPercentage ||
                  calculatedProfit > remainingProfit
                }
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {loading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
}
