import { useEffect, useState } from "react";
import useUserStore from "../../store/userStore.js";
import {
  applyRoiByPackage,
  getScheduledRoi,
  getAdminPackages,
} from "../../api/admin.api.js";

const ALL_PACKAGES = "all";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

export default function RoiManagement() {
  const token = useUserStore((state) => state.token);

  const [packages, setPackages] = useState([]);
  const [selectedPackageName, setSelectedPackageName] = useState(ALL_PACKAGES);
  const [categoryPercentage, setCategoryPercentage] = useState("3");
  const [applyingCategory, setApplyingCategory] = useState(false);
  const [scheduledRates, setScheduledRates] = useState({});

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pkgsData, scheduledData] = await Promise.all([
          getAdminPackages(token),
          getScheduledRoi(token),
        ]);
        setPackages(pkgsData?.packages || []);
        if (scheduledData?.scheduled) {
          const rates = {};
          Object.entries(scheduledData.scheduled).forEach(([pkg, info]) => {
            rates[pkg] = info.percentage;
          });
          setScheduledRates(rates);
        }
      } catch {
        // Non-critical
      }
    };
    if (token) loadData();
  }, [token]);

  const handleApplyToSelection = async () => {
    const numeric = Number(categoryPercentage);
    if (Number.isNaN(numeric) || numeric <= 0 || numeric > 25) {
      setErrorMessage("ROI percentage must be between 0.01 and 25.");
      return;
    }
    try {
      setApplyingCategory(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (selectedPackageName === ALL_PACKAGES) {
        for (const pkg of packages) {
          await applyRoiByPackage(token, pkg.name, numeric);
          setScheduledRates((prev) => ({ ...prev, [pkg.name]: numeric }));
        }
        setSuccessMessage(
          `Saved ${numeric}% daily ROI for all packages — applies tonight at 12:00 AM UTC.`,
        );
      } else {
        await applyRoiByPackage(token, selectedPackageName, numeric);
        setScheduledRates((prev) => ({ ...prev, [selectedPackageName]: numeric }));
        setSuccessMessage(
          `Saved ${numeric}% daily ROI for "${selectedPackageName}" — applies tonight at 12:00 AM UTC.`,
        );
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setApplyingCategory(false);
    }
  };

  const applyButtonLabel = () => {
    if (applyingCategory) return "Saving...";
    if (selectedPackageName === ALL_PACKAGES)
      return `Save ${categoryPercentage}% Daily Rate for All Packages`;
    return `Save ${categoryPercentage}% Daily Rate for "${selectedPackageName}"`;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          ROI{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Management
          </span>
        </h1>
        <p className="text-gray-400">
          Set daily ROI rates per package — profits are distributed automatically at 12:00 AM UTC every day
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/80">
        <span className="mt-0.5 shrink-0 text-amber-400">&#9200;</span>
        <span>
          Rates saved here are{" "}
          <strong className="text-amber-300">not applied immediately</strong>. The
          system automatically distributes profits to all active investments once
          daily at{" "}
          <strong className="text-amber-300">12:00 AM UTC</strong>.
        </span>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {successMessage}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 space-y-5">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">
            Distribute Profit by Package
          </h3>
          <p className="text-sm text-gray-400">
            Select a specific package or leave on{" "}
            <span className="text-cyan-300 font-medium">All Packages</span> to
            set the rate for every package. Saved rates are applied once
            automatically at{" "}
            <span className="text-cyan-300 font-medium">12:00 AM UTC</span> every day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Select Package
            </label>
            <select
              value={selectedPackageName}
              onChange={(e) => setSelectedPackageName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/50"
            >
              <option value={ALL_PACKAGES} className="bg-[#0A122C] text-cyan-300">
                All Packages
              </option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.name} className="bg-[#0A122C] text-white">
                  {pkg.name} — ${Number(pkg.investment_amount).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Daily ROI Percentage (%)
            </label>
            <input
              type="number"
              min="0.01"
              max="25"
              step="0.01"
              value={categoryPercentage}
              onChange={(e) => setCategoryPercentage(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
            />
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-3">
            Packages
            <span className="text-gray-500 ml-2 text-xs">(click a card to select)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => setSelectedPackageName(ALL_PACKAGES)}
              className={`rounded-xl border p-4 flex flex-col gap-1 text-left transition-all ${
                selectedPackageName === ALL_PACKAGES
                  ? "border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/40"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                All
              </p>
              <p className="text-base font-bold text-white">All Packages</p>
              <p className="text-xs text-cyan-400 mt-auto">Every package</p>
            </button>

            {packages.map((pkg) => {
              const isSelected = selectedPackageName === pkg.name;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageName(pkg.name)}
                  className={`rounded-xl border p-4 flex flex-col gap-1 text-left transition-all ${
                    isSelected
                      ? "border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/40"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    {pkg.name}
                  </p>
                  <p className="text-lg font-bold text-white">
                    ${Number(pkg.investment_amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-cyan-400 mt-auto">
                    {scheduledRates[pkg.name] != null
                      ? `Daily: ${scheduledRates[pkg.name]}%`
                      : "Not set"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={handleApplyToSelection}
            disabled={applyingCategory}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 transition-opacity"
          >
            {applyButtonLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
