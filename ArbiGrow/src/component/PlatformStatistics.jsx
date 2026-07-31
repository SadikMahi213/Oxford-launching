// Platform Statistics section for homepage
import { motion } from "motion/react";
import { Activity, Users, UserCheck, TrendingUp, PieChart, Wallet, Globe } from "lucide-react";
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
    <section className="relative py-8 md:py-12 px-2 sm:px-4">
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
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.platformStats.title")}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.platformStats.titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-full md:max-w-3xl mx-auto px-2">
            {t("home.platformStats.subtitle")}
          </p>
        </motion.div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <StatCard
            label={t("home.platformStats.totalRegisteredMembers")}
            value="149,409"
            color="blue"
            icon={Users}
            index={0}
          />
          <StatCard
            label={t("home.platformStats.verifiedFreelancers")}
            value="96,845"
            color="green"
            icon={UserCheck}
            index={1}
          />
          <StatCard
            label={t("home.platformStats.packageInvestmentOverview")}
            value="$56,848"
            color="purple"
            icon={TrendingUp}
            index={2}
          />
          <StatCard
            label={t("home.platformStats.successfulWithdrawals")}
            value="$98,160"
            color="cyan"
            icon={Wallet}
            index={3}
          />
          <StatCard
            label={t("home.platformStats.countriesConnected")}
            value="93+"
            color="orange"
            icon={Globe}
            index={4}
          />
        </div>
      </div>
    </section>
  );
}
