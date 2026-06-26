import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Calendar, Eye, Clock, CheckCircle } from 'lucide-react';

export function InvestmentCard({ investment, index, onViewDetails }) {
  const { t } = useTranslation();
  const progress = investment.progressPercentage;

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
    <motion.div
      key={investment.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">
            {investment.packageName}
          </h3>

          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getInvestmentStatusColor(
              investment.status
            )}`}
          >
            {investment.status.charAt(0).toUpperCase() +
              investment.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">{t("investmentCard.investedAmount")}</span>
          <span className="text-base font-bold text-white">
            {investment.investedAmount.toLocaleString()} USDT
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">{t("investmentCard.dailyPayment")}</span>
          <span className="text-base font-bold text-green-400">
            ${investment.dailyPayment.toFixed(2)} USDT
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">{t("investmentCard.profitEarned")}</span>
          <span className="text-base font-bold text-cyan-400">
            {investment.profitEarned.toLocaleString()} USDT
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">{t("investmentCard.totalReturn")}</span>
          <span className="text-base font-bold text-yellow-400">
            {investment.expectedProfit.toLocaleString()} USDT
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">{t("investmentCard.progress")}</span>
          <span className="text-xs font-semibold text-cyan-400">
            {progress.toFixed(1)}%
          </span>
        </div>

        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, delay: index * 0.1 }}
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
          />
        </div>

        <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
          <span>{t("investmentCard.earned")} ${investment.profitEarned.toFixed(2)}</span>
          <span>{t("investmentCard.target")} ${investment.expectedProfit.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-xs text-gray-500">{t("investmentCard.startDate")}</div>
            <div className="text-sm text-white font-medium">
              {investment.startDate}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">{t("investmentCard.remaining")}</div>
          <div className="text-sm text-white font-medium">
            ${investment.remainingProfit.toFixed(2)}
          </div>
        </div>
      </div>

      <button
        onClick={() => onViewDetails(investment)}
        className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 text-blue-400 font-semibold hover:from-blue-600/30 hover:to-cyan-600/30 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2"
      >
        <Eye className="w-4 h-4" />
        {t("investmentCard.viewDetails")}
      </button>
    </motion.div>
  );
}
