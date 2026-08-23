import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { InvestmentSummaryCards } from "./InvestmentSummaryCards";
import { InvestmentCard } from "./InvestmentCard";
import { InvestmentEmptyState } from "./InvestmentEmptyState";
import { InvestmentDetailsModal } from "./InvestmentDetailsModal";
import { getMyInvestments as fetchMyInvestments } from "../../api/user.api.js";

const toNumber = (value) => Number(value ?? 0);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const mapInvestment = (investment) => {
  const investedAmount = toNumber(investment.invested_amount);
  const expectedProfit = toNumber(investment.expected_profit);
  const profitEarned = toNumber(investment.profit_earned);
  const roiPercent = toNumber(investment.roi_percent);
  const profitPercentagePaid = toNumber(investment.profit_percentage_paid);
  const remainingPercentage = Math.max(
    0,
    toNumber(investment.remaining_percentage) || roiPercent - profitPercentagePaid,
  );
  const progressPercentage = Math.min(
    100,
    toNumber(investment.progress_percentage) ||
      (roiPercent > 0 ? (profitPercentagePaid / roiPercent) * 100 : 0),
  );

  return {
    id: investment.id,
    packageName: investment.package_name,
    status: investment.status,
    packageIsActive: investment.package_is_active !== false,
    investedAmount,
    expectedProfit,
    profitEarned,
    dailyPayment: toNumber(investment.daily_payment),
    captchaRequiredPerDay: investment.daily_captcha_limit || 0,
    startDate: formatDate(investment.start_date),
    endDate: formatDate(investment.end_date),
    roiPercent,
    profitPercentagePaid,
    remainingPercentage,
    remainingProfit: toNumber(investment.remaining_profit),
    progressPercentage,
    profitHistory: [],
  };
};

export function MyInvestments({ refreshKey, onNavigateToPackages }) {
  const { t } = useTranslation();
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInvestments = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchMyInvestments();
      const items = Array.isArray(response?.data) ? response.data : [];
      setInvestments(items.map(mapInvestment).filter((inv) => inv.packageIsActive));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || t('investments.error'));
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, [refreshKey]);

  const summary = useMemo(() => {
    const activeInvestments = investments.filter((inv) => inv.status === "active");

    return {
      totalInvested: investments.reduce((sum, inv) => sum + inv.investedAmount, 0),
      totalExpectedProfit: investments.reduce(
        (sum, inv) => sum + inv.expectedProfit,
        0,
      ),
      totalProfitEarned: investments.reduce((sum, inv) => sum + inv.profitEarned, 0),
      activeInvestmentsCount: activeInvestments.length,
    };
  }, [investments]);

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t('investments.title')}
            </span>
          </h1>
          <p className="text-sm text-gray-400">
            {t('investments.subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
            {t('investments.loading')}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
            {error}
          </div>
        ) : (
          <>
            <InvestmentSummaryCards
              totalInvested={summary.totalInvested}
              totalExpectedProfit={summary.totalExpectedProfit}
              totalProfitEarned={summary.totalProfitEarned}
              activeInvestmentsCount={summary.activeInvestmentsCount}
            />

            {investments.length > 0 ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {investments.map((investment, index) => (
                  <InvestmentCard
                    key={investment.id}
                    investment={investment}
                    index={index}
                    onViewDetails={setSelectedInvestment}
                  />
                ))}
              </div>
            ) : (
              <InvestmentEmptyState onBrowsePackages={onNavigateToPackages} />
            )}
          </>
        )}
      </div>

      <InvestmentDetailsModal
        investment={selectedInvestment}
        onClose={() => setSelectedInvestment(null)}
      />
    </>
  );
}
