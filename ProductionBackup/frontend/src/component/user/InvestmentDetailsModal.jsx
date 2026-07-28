import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, BarChart3, TrendingUp as TrendingUpIcon, Clock, CheckCircle } from 'lucide-react';
import { useEffect, useState } from "react";
import { getMyInvestmentDetails } from "../../api/user.api.js";

export function InvestmentDetailsModal({ investment, onClose }) {
  const { t } = useTranslation();
  const [profitHistory, setProfitHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (!investment?.id) {
        setProfitHistory([]);
        return;
      }

      setHistoryLoading(true);

      try {
        const response = await getMyInvestmentDetails(investment.id);
        const history = Array.isArray(response?.data?.profit_history)
          ? response.data.profit_history
          : [];

        setProfitHistory(
          history.map((item, index) => ({
            id: `${investment.id}-${index}`,
            date: item?.date
              ? new Date(item.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "-",
            amount: Number(item?.amount ?? 0),
            type: item?.percentage
              ? `ROI +${Number(item.percentage).toFixed(2)}%`
              : t("investmentDetails.dailyProfit"),
          })),
        );
      } catch {
        setProfitHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [investment?.id, t]);

  if (!investment) return null;

  const getInvestmentProgress = (inv) => {
    return inv.progressPercentage;
  };

  const getInvestmentStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'completed':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border-b border-white/10 p-6 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {investment.packageName}
              </h2>

              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getInvestmentStatusColor(
                  investment.status
                )}`}
              >
                {investment.status.charAt(0).toUpperCase() +
                  investment.status.slice(1)}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-gradient-to-br from-blue-600/10 to-white/5 border border-blue-500/20 p-4">
                <div className="text-sm text-gray-400 mb-1">{t("investmentDetails.investedAmount")}</div>
                <div className="text-2xl font-bold text-white">
                  ${investment.investedAmount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{t("investmentDetails.usdt")}</div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-green-600/10 to-white/5 border border-green-500/20 p-4">
                <div className="text-sm text-gray-400 mb-1">{t("investmentDetails.dailyPayment")}</div>
                <div className="text-2xl font-bold text-green-400">
                  ${investment.dailyPayment?.toFixed(2) ?? "0.00"}
                </div>
                <div className="text-xs text-gray-500">{t("investmentDetails.usdtDay")}</div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-cyan-600/10 to-white/5 border border-cyan-500/20 p-4">
                <div className="text-sm text-gray-400 mb-1">{t("investmentDetails.totalReturn")}</div>
                <div className="text-2xl font-bold text-cyan-400">
                  ${investment.expectedProfit.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{t("investmentDetails.usdt")}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-sm text-gray-400 mb-1">{t("investmentDetails.dailyCaptchaRequirement")}</div>
                <div className="text-lg font-bold text-yellow-400">
                  {investment.captchaRequiredPerDay ?? 0} {t("investmentDetails.captchas")}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-sm text-gray-400 mb-1">{t("investmentDetails.profitEarned")}</div>
                <div className="text-lg font-bold text-green-400">
                  ${investment.profitEarned.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-lg font-bold text-white mb-4">
                {t("investmentDetails.progress")}
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("investmentDetails.progress")}</span>
                  <span className="text-cyan-400 font-semibold">
                    {getInvestmentProgress(investment).toFixed(1)}%
                  </span>
                </div>

                <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                  <div
                    style={{ width: `${getInvestmentProgress(investment)}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">{t("investmentDetails.startDate")}</div>
                      <div className="text-sm text-white font-medium">
                        {investment.startDate}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">{t("investmentDetails.remainingProfit")}</div>
                    <div className="text-sm text-white font-medium">
                      ${investment.remainingProfit?.toFixed(2) ?? "0.00"}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t border-white/10 text-sm">
                  <span className="text-gray-400">{t("investmentDetails.profitEarned")}</span>
                  <span className="text-white font-semibold">
                    ${investment.profitEarned.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("investmentDetails.totalReturn")}</span>
                  <span className="text-cyan-400 font-semibold">
                    ${investment.expectedProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  {t("investmentDetails.recentProfitHistory")}
                </h3>
              </div>

              <div className="divide-y divide-white/5">
                {historyLoading ? (
                  <div className="p-4 text-sm text-gray-400">{t("investmentDetails.loadingProfitHistory")}</div>
                ) : profitHistory.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400">{t("investmentDetails.noProfitHistory")}</div>
                ) : (
                  profitHistory.map((profit, index) => (
                  <motion.div
                    key={profit.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                        <TrendingUpIcon className="w-4 h-4 text-green-400" />
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-white">
                          {profit.type}
                        </div>
                        <div className="text-xs text-gray-500">
                          {profit.date}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-green-400">
                        +${profit.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">{t("investmentDetails.usdt")}</div>
                    </div>
                  </motion.div>
                  ))
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
