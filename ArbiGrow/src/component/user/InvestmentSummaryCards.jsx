import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Wallet, TrendingUp as TrendingUpIcon, BarChart3, Package } from 'lucide-react';

export function InvestmentSummaryCards({
  totalInvested,
  totalExpectedProfit,
  totalProfitEarned,
  activeInvestmentsCount
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-blue-600/10 via-white/5 to-white/[0.02] backdrop-blur-xl border border-blue-500/20 p-4 md:p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        <div className="text-xs md:text-sm text-gray-400 mb-1">
          {t("investmentSummaryCards.totalInvested")}
        </div>

        <div className="text-xl md:text-2xl font-bold text-white">
          {totalInvested.toLocaleString()} 
          <span className="text-sm text-gray-400"> {t("investmentSummaryCards.usdt")}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-gradient-to-br from-cyan-600/10 via-white/5 to-white/[0.02] backdrop-blur-xl border border-cyan-500/20 p-4 md:p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <TrendingUpIcon className="w-4 h-4 text-cyan-400" />
          </div>
        </div>

        <div className="text-xs md:text-sm text-gray-400 mb-1">
          {t("investmentSummaryCards.expectedProfit")}
        </div>

        <div className="text-xl md:text-2xl font-bold text-white">
          {totalExpectedProfit.toLocaleString()} 
          <span className="text-sm text-gray-400"> {t("investmentSummaryCards.usdt")}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl bg-gradient-to-br from-green-600/10 via-white/5 to-white/[0.02] backdrop-blur-xl border border-green-500/20 p-4 md:p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-400" />
          </div>
        </div>

        <div className="text-xs md:text-sm text-gray-400 mb-1">
          {t("investmentSummaryCards.profitEarned")}
        </div>

        <div className="text-xl md:text-2xl font-bold text-white">
          {totalProfitEarned.toLocaleString()} 
          <span className="text-sm text-gray-400"> {t("investmentSummaryCards.usdt")}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="rounded-2xl bg-gradient-to-br from-purple-600/10 via-white/5 to-white/[0.02] backdrop-blur-xl border border-purple-500/20 p-4 md:p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Package className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        <div className="text-xs md:text-sm text-gray-400 mb-1">
          {t("investmentSummaryCards.activeInvestments")}
        </div>

        <div className="text-xl md:text-2xl font-bold text-white">
          {activeInvestmentsCount}
        </div>
      </motion.div>
    </div>
  );
}
