import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Users, UserCheck, UserX, Store, Banknote, ArrowUpFromLine,
  ArrowRightLeft, CreditCard, Package, ShoppingCart, Gift,
  Layers, GitCompare, Shapes, Captions, Tv, Gem,
  TrendingUp, Wifi, CircleDollarSign, DollarSign, Coins,
} from "lucide-react";
import { useNavigate } from "react-router";
import { getAdminRealtimeStats, getPlatformStats } from "../../api/admin.api.js";
import useUserStore from "../../store/userStore.js";

const toAmount = (value) => Number(value ?? 0);

const StatCard = ({ icon: Icon, label, value, delay = 0, iconColor = "text-cyan-400" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="p-3 xs:p-4 md:p-5 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
  >
    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <span className="truncate text-[11px] xs:text-xs sm:text-sm">{label}</span>
    </div>
    <div className="text-base xs:text-lg md:text-2xl font-bold text-white">{value}</div>
  </motion.div>
);

export default function DashboardOverview() {
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);
  const logout = useUserStore((state) => state.logout);
  const { t } = useTranslation();

  const [realtime, setRealtime] = useState(null);
  const [rtLoading, setRtLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRealtime = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAdminRealtimeStats(token);
      if (data) setRealtime(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        logout();
        navigate("/login");
        return;
      }
      setError(err?.response?.data?.detail || "Failed to load dashboard.");
    } finally {
      setRtLoading(false);
    }
  }, [token, navigate, logout]);

  const [platform, setPlatform] = useState(null);
  const [plLoading, setPlLoading] = useState(true);

  const fetchPlatform = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getPlatformStats(token);
      setPlatform(data);
    } catch (err) {
      console.error("Failed to fetch platform stats", err);
    } finally {
      setPlLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRealtime();
    const rtInterval = setInterval(fetchRealtime, 15000);
    return () => clearInterval(rtInterval);
  }, [fetchRealtime]);

  useEffect(() => {
    fetchPlatform();
  }, [token, fetchPlatform]);

  const section = (title, gradient, cards) => (
    <div className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl md:text-2xl font-bold mb-1">
          <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {title}
          </span>
        </h2>
      </div>
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {cards}
      </div>
    </div>
  );

  const profitColor =
    realtime && toAmount(realtime.company_running_profit) >= 0
      ? "text-emerald-400"
      : "text-red-400";

  return (
    <div className="p-3 sm:p-4 md:p-6 overflow-hidden">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
          Admin{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Dashboard Overview
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">Real-time admin system metrics (auto-refreshes every 15s)</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {rtLoading && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
          Loading dashboard data...
        </div>
      )}

      {realtime && (
        <>
          {/* ── Dashboard Overview ────────────────────────── */}
          {section("Dashboard Overview", "from-blue-400 to-cyan-400", [
            <StatCard key="members" icon={Users} label="Total Member" value={platform?.total_users != null ? platform?.total_users : (realtime?.total_members ?? 0)} delay={0} iconColor="text-blue-400" />,
            <StatCard key="active-kyc" icon={UserCheck} label="Total Active KYC Member" value={realtime.total_active_kyc ?? 0} delay={0.05} iconColor="text-emerald-400" />,
            <StatCard key="inactive" icon={UserX} label="Total Inactive Member" value={realtime.total_inactive ?? 0} delay={0.1} iconColor="text-amber-400" />,
            <StatCard key="sellers" icon={Store} label="Total E-Commerce Seller" value={realtime.total_ecommerce_sellers ?? 0} delay={0.15} iconColor="text-violet-400" />,
          ])}

          {/* ── Balance Area ──────────────────────────────── */}
          {section("Balance Area", "from-emerald-400 to-teal-400", [
            <StatCard key="deposits" icon={Banknote} label="Total Deposit USD" value={`$${toAmount(realtime.total_deposited).toLocaleString()}`} delay={0} iconColor="text-emerald-400" />,
            <StatCard key="withdrawals" icon={ArrowUpFromLine} label="Total Withdrawal USD" value={platform?.total_withdrawn != null ? `$${toAmount(platform?.total_withdrawn).toLocaleString()}` : `$${toAmount(realtime?.total_withdrawn).toLocaleString()}`} delay={0.05} iconColor="text-red-400" />,
            <StatCard key="transfers" icon={ArrowRightLeft} label="ID to ID Fund Transfer" value={`$${toAmount(realtime.total_transferred).toLocaleString()}`} delay={0.1} iconColor="text-cyan-400" />,
            <StatCard key="kyc-purchases" icon={CreditCard} label="Total KYC Purchase USD" value={`$${toAmount(realtime.total_kyc_purchases_usd).toLocaleString()}`} delay={0.15} iconColor="text-yellow-400" />,
            <StatCard key="package-invest" icon={Package} label="Total Paid Package Investment USD" value={`$${toAmount(realtime.total_paid_package_investment).toLocaleString()}`} delay={0.2} iconColor="text-purple-400" />,
            <StatCard key="ecommerce-wallet" icon={ShoppingCart} label="E-commerce Wallet (USD)" value={`$${toAmount(realtime.total_ecommerce_funded).toLocaleString()}`} delay={0.25} iconColor="text-orange-400" />,
          ])}

          {/* ── Distribution Identify Area ───────────────── */}
          {section("Distribution Identify Area", "from-red-400 to-rose-400", [
            <StatCard key="referral" icon={Gift} label="Total Referral Distribution" value={`$${toAmount(realtime.total_referral_distribution).toLocaleString()}`} delay={0} iconColor="text-rose-400" />,
            <StatCard key="generation" icon={Layers} label="Total Generation Bonus Distribution" value={`$${toAmount(realtime.total_generation_bonus).toLocaleString()}`} delay={0.05} iconColor="text-pink-400" />,
            <StatCard key="matching" icon={GitCompare} label="Total Matching Bonus Distribution" value={`$${toAmount(realtime.total_matching_bonus).toLocaleString()}`} delay={0.1} iconColor="text-fuchsia-400" />,
            <StatCard key="captcha" icon={Shapes} label="Captcha Typing Distribution" value={`$${toAmount(realtime.total_captcha_distribution).toLocaleString()}`} delay={0.15} iconColor="text-indigo-400" />,
            <StatCard key="adview" icon={Tv} label="Ad View Distribution" value={`$${toAmount(realtime.total_ad_view_distribution).toLocaleString()}`} delay={0.2} iconColor="text-sky-400" />,
            <StatCard key="signup-bonus" icon={Gift} label={t("admin.overview.totalSignupBonusDistributed", "Total Signup OFA Bonus Distributed")} value={`${toAmount(realtime.total_signup_bonus_distributed ?? 0).toLocaleString()} OFA`} delay={0.3} iconColor="text-emerald-400" />,
          ])}

          {/* ── Free User Earnings ───────────────────────── */}
          {section("Free User Earnings", "from-yellow-400 to-amber-400", [
            <StatCard key="free-captcha" icon={Shapes} label="Total Captcha Typing Earnings (Free Users)" value={`$${toAmount(realtime.total_free_package_captcha_earnings).toLocaleString()}`} delay={0} iconColor="text-yellow-400" />,
            <StatCard key="free-ad" icon={Tv} label="Total Ads View Earnings (Free Users)" value={`$${toAmount(realtime.total_free_package_ad_earnings).toLocaleString()}`} delay={0.05} iconColor="text-orange-400" />,
            <StatCard key="free-total" icon={Gem} label="Total Free User Earnings (Combined)" value={`$${toAmount(realtime.total_free_user_earnings).toLocaleString()}`} delay={0.1} iconColor="text-amber-400" />,
          ])}

          {/* ── Paid User Earnings ───────────────────────── */}
          {section("Paid User Earnings", "from-purple-400 to-violet-400", [
            <StatCard key="paid-captcha" icon={Shapes} label="Total Captcha Typing Earnings (Paid Users)" value={`$${toAmount(realtime.total_paid_package_captcha_earnings).toLocaleString()}`} delay={0} iconColor="text-purple-400" />,
            <StatCard key="paid-ad" icon={Tv} label="Total Ads View Earnings (Paid Users)" value={`$${toAmount(realtime.total_paid_package_ad_earnings).toLocaleString()}`} delay={0.05} iconColor="text-violet-400" />,
            <StatCard key="paid-total" icon={Gem} label="Total Paid User Earnings (Combined)" value={`$${toAmount(realtime.total_paid_user_earnings).toLocaleString()}`} delay={0.1} iconColor="text-fuchsia-400" />,
          ])}

          {/* ── Real Time Financial Summary ──────────────── */}
          <div className="mb-10">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-1">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Real Time Financial Summary
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="p-3 xs:p-4 md:p-5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 backdrop-blur-xl border border-amber-500/30 col-span-1 xs:col-span-2 md:col-span-3"
              >
                <div className="flex items-center gap-2 text-sm text-amber-300 mb-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-base">Total Distribution (USD)</span>
                </div>
                <div className="text-2xl xs:text-3xl md:text-4xl font-bold text-amber-300">
                  ${toAmount(realtime.total_distribution ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-amber-500/70 mt-1">
                  {t("admin.overview.totalDistributionSubtitle", "Package Commission + Referral Bonus + Generation Bonus + Matching Bonus + Rewards and Incentives")}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 xs:p-4 md:p-5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 backdrop-blur-xl border border-emerald-500/30 col-span-1 xs:col-span-2 md:col-span-3"
              >
                <div className="flex items-center gap-2 text-sm text-emerald-300 mb-2">
                  <Gem className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-base">Total Mining OFA Coin by Users</span>
                </div>
                <div className="text-2xl xs:text-3xl md:text-4xl font-bold text-emerald-300">
                  {toAmount(realtime.total_mining_ofa ?? 0).toLocaleString()} <span className="text-lg text-emerald-400/70">OFA</span>
                </div>
                <div className="text-xs text-emerald-500/70 mt-1">
                  Total OFA coins mined across all users
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-3 xs:p-4 md:p-5 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Gem className="w-4 h-4 text-emerald-400" />
                  <span>{t("admin.overview.totalMiningOFADistributed", "Total Mining OFA Tokens Distributed")}</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {toAmount(realtime.total_mining_ofa_distributed ?? 0).toLocaleString()} <span className="text-base text-emerald-400/70">OFA</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 xs:p-4 md:p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 backdrop-blur-xl border border-amber-500/20"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>{t("admin.overview.totalOfaDistribution", "Total OFA Distribution")}</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {toAmount(realtime.total_ofa_distribution ?? 0).toLocaleString()} <span className="text-base text-amber-400/70">OFA</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t("admin.overview.totalOfaDistributionSubtitle", "Signup Bonus + Daily Mining")}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-3 xs:p-4 md:p-5 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <span>{t("admin.overview.onlineMembersLive", "Online Members (Live)")}</span>
                </div>
                <div className="text-2xl font-bold text-white">{realtime.online_users_live ?? 0}</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-3 xs:p-4 md:p-5 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <CircleDollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Total Profit Distribution (USD)</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  ${toAmount(realtime.total_profit_distribution).toLocaleString()}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="p-3 xs:p-4 md:p-5 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Company Running Profit USD</span>
                </div>
                <div className={`text-2xl font-bold ${profitColor}`}>
                  ${toAmount(realtime.company_running_profit).toLocaleString()}
                </div>
              </motion.div>
            </div>

            {/* Company Running Profit Detail */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 relative"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-40"></div>
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Company Running Profit USD</div>
                  <div className={`text-3xl font-bold ${profitColor}`}>
                    ${toAmount(realtime.company_running_profit).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Total Deposits − Total Withdrawals − Total Distributions
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}