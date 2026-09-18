import { useEffect, useState, useCallback } from "react";
import { RefreshCw, BarChart3 } from "lucide-react";
import useUserStore from "../../../store/userStore.js";
import {
  getSelfAnalyticsSummary,
  getSelfAnalyticsCountries,
  getSelfAnalyticsDevices,
  getSelfAnalyticsSources,
  getSelfAnalyticsDaily,
  getSelfAnalyticsWeekly,
  getSelfAnalyticsMonthly,
} from "../../../api/admin.api.js";
import VisitorSummaryCards from "./VisitorSummaryCards.jsx";
import DailyVisitorsChart from "./DailyVisitorsChart.jsx";
import WeeklyVisitorsChart from "./WeeklyVisitorsChart.jsx";
import MonthlyVisitorsChart from "./MonthlyVisitorsChart.jsx";
import DevicePieChart from "./DevicePieChart.jsx";
import TrafficSourceChart from "./TrafficSourceChart.jsx";
import CountriesReport from "./CountriesReport.jsx";

export default function SelfAnalyticsDashboard() {
  const token = useUserStore((s) => s.token);
  const [summary, setSummary] = useState(null);
  const [countries, setCountries] = useState(null);
  const [devices, setDevices] = useState(null);
  const [sources, setSources] = useState(null);
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [sumRes, coRes, dvRes, srRes, daRes, weRes, moRes] = await Promise.all([
        getSelfAnalyticsSummary(token),
        getSelfAnalyticsCountries(token, 10),
        getSelfAnalyticsDevices(token),
        getSelfAnalyticsSources(token),
        getSelfAnalyticsDaily(token, 30),
        getSelfAnalyticsWeekly(token, 12),
        getSelfAnalyticsMonthly(token, 12),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (coRes.success) setCountries(coRes.data);
      if (dvRes.success) setDevices(dvRes.data);
      if (srRes.success) setSources(srRes.data);
      if (daRes.success) setDaily(daRes.data);
      if (weRes.success) setWeekly(weRes.data);
      if (moRes.success) setMonthly(moRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Visitor Analytics
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Self-hosted visitor tracking &amp; insights</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
          {error}
        </div>
      )}

      {loading && !summary && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-400 animate-pulse" />
            <p className="text-gray-400 text-sm">Loading analytics...</p>
          </div>
        </div>
      )}

      {summary && (
        <>
          <VisitorSummaryCards data={summary} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyVisitorsChart data={daily} />
            <WeeklyVisitorsChart data={weekly} />
          </div>

          <MonthlyVisitorsChart data={monthly} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DevicePieChart
              devices={devices?.devices}
              operatingSystems={devices?.operatingSystems}
            />
            <TrafficSourceChart sources={sources} />
            <CountriesReport countries={countries} />
          </div>
        </>
      )}
    </div>
  );
}
