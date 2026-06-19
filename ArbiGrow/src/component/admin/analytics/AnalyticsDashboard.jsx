import { useEffect, useState, useCallback } from "react";
import { RefreshCw, BarChart3 } from "lucide-react";
import useUserStore from "../../../store/userStore.js";
import {
  getAnalyticsOverview,
  getAnalyticsCountries,
  getAnalyticsDevices,
  getAnalyticsTrafficSources,
} from "../../../api/admin.api.js";
import SummaryCards from "./SummaryCards.jsx";
import DailyVisitorsChart from "./DailyVisitorsChart.jsx";
import DevicePieChart from "./DevicePieChart.jsx";
import TrafficSourcesBarChart from "./TrafficSourcesBarChart.jsx";
import CountriesTable from "./CountriesTable.jsx";
import RealtimeWidget from "./RealtimeWidget.jsx";

export default function AnalyticsDashboard() {
  const token = useUserStore((s) => s.token);
  const [overview, setOverview] = useState(null);
  const [countries, setCountries] = useState(null);
  const [devices, setDevices] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [ovRes, coRes, dvRes, trRes] = await Promise.all([
        getAnalyticsOverview(token),
        getAnalyticsCountries(token),
        getAnalyticsDevices(token),
        getAnalyticsTrafficSources(token),
      ]);

      if (ovRes.success) setOverview(ovRes.data);
      if (coRes.success) setCountries(coRes.data);
      if (dvRes.success) setDevices(dvRes.data);
      if (trRes.success) setTraffic(trRes.data);
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
              Google Analytics
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Website traffic &amp; engagement insights</p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeWidget />
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
          {error}
        </div>
      )}

      {loading && !overview && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-400 animate-pulse" />
            <p className="text-gray-400 text-sm">Loading analytics...</p>
          </div>
        </div>
      )}

      {!loading && !overview && !error && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <BarChart3 className="w-12 h-12 text-gray-500" />
            <p className="text-gray-400 text-lg font-medium">Analytics Not Configured</p>
            <p className="text-gray-500 text-sm max-w-md">
              Set <code className="px-2 py-0.5 rounded bg-white/5 text-cyan-400 text-xs">GOOGLE_ANALYTICS_CREDENTIALS</code>{" "}
              and <code className="px-2 py-0.5 rounded bg-white/5 text-cyan-400 text-xs">GOOGLE_ANALYTICS_PROPERTY_ID</code>{" "}
              in your .env file to enable analytics.
            </p>
          </div>
        </div>
      )}

      {overview && (
        <>
          <SummaryCards data={overview} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DailyVisitorsChart data={overview.dailyVisitors} />
            </div>
            <div>
              <DevicePieChart
                devices={devices?.devices}
                operatingSystems={devices?.operatingSystems}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrafficSourcesBarChart sources={traffic?.sources} />
            <CountriesTable countries={countries?.countries} />
          </div>

          {overview.topPages && overview.topPages.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top Pages</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="pb-3 text-gray-400 font-medium">Page</th>
                      <th className="pb-3 text-gray-400 font-medium text-right">Views</th>
                      <th className="pb-3 text-gray-400 font-medium text-right">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.topPages.slice(0, 15).map((page) => (
                      <tr key={page.pagePathPlusQueryString} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 text-white font-medium max-w-[400px] truncate">
                          {page.pagePathPlusQueryString}
                        </td>
                        <td className="py-3 text-right text-white">
                          {parseInt(page.screenPageViews || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-gray-300">
                          {parseInt(page.totalUsers || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
