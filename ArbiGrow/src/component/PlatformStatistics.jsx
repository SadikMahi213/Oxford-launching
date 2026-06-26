// Platform Statistics section for homepage
import { motion } from "motion/react";
import { Activity } from "lucide-react";
import { StatCard } from "./StatCard";
import { useTranslation } from "react-i18next";

export function PlatformStatistics({ stats }) {
  const { t } = useTranslation();
  // Format large numbers with commas
  const formatInteger = (num) => {
    return Number(num || 0).toLocaleString("en-US");
  };
  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  // Format currency
  const formatCurrency = (num) => {
    return `$${Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })}`;
  };

  return (
    <section className="relative py-20 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 mb-6">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              {t("home.platformStats.badge")}
            </span>
          </div>
        </motion.div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <StatCard
            label={t("home.platformStats.totalUsers")}
            value={formatInteger(stats?.total_users)}
            color="blue"
            index={0}
          />
          <StatCard
            label={t("home.platformStats.totalActiveInvestors")}
            value={formatInteger(stats?.active_investors)}
            color="green"
            index={1}
          />
          <StatCard
            label={t("home.platformStats.totalInvestmentsMade")}
            value={formatNumber(stats?.total_invested)}
            color="red"
            index={2}
          />
          <StatCard
            label={t("home.platformStats.totalProfitsGenerated")}
            value={formatCurrency(stats?.total_profit_shared)}
            color="green"
            index={3}
          />
          <StatCard
            label={t("home.platformStats.successfulWithdrawals")}
            value={formatCurrency(stats?.total_withdrawn)}
            color="orange"
            index={4}
          />
        </div>
      </div>
    </section>
  );
}
