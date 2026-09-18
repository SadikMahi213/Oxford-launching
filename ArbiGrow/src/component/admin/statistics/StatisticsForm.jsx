import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  Download,
  Save,
  RefreshCw,
  UserCheck,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { StatInputField } from "./StatInputField";

const formatForDisplay = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

export function StatisticsForm({ initialStats, onSave }) {

  const [totalUsers, setTotalUsers] = useState(
    formatForDisplay(initialStats?.total_users)
  );

  const [activeInvestors, setActiveInvestors] = useState(
    formatForDisplay(initialStats?.active_investors)
  );

  const [totalInvested, setTotalInvested] = useState(
    formatForDisplay(initialStats?.total_invested)
  );

  const [totalProfitShared, setTotalProfitShared] = useState(
    formatForDisplay(initialStats?.total_profit_shared)
  );

  const [totalWithdrawn, setTotalWithdrawn] = useState(
    formatForDisplay(initialStats?.total_withdrawn)
  );

  /* Re-sync form state when initialStats changes (after save re-fetch) */
  useEffect(() => {
    setTotalUsers(formatForDisplay(initialStats?.total_users));
    setActiveInvestors(formatForDisplay(initialStats?.active_investors));
    setTotalInvested(formatForDisplay(initialStats?.total_invested));
    setTotalProfitShared(formatForDisplay(initialStats?.total_profit_shared));
    setTotalWithdrawn(formatForDisplay(initialStats?.total_withdrawn));
  }, [initialStats]);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* Detect change — compare raw string values */
  const isChanged =
    totalUsers !== formatForDisplay(initialStats?.total_users) ||
    activeInvestors !== formatForDisplay(initialStats?.active_investors) ||
    totalInvested !== formatForDisplay(initialStats?.total_invested) ||
    totalProfitShared !== formatForDisplay(initialStats?.total_profit_shared) ||
    totalWithdrawn !== formatForDisplay(initialStats?.total_withdrawn);

  /* Save */
  const handleSave = async () => {

    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    const payload = {
      total_users: totalUsers || "0",
      active_investors: activeInvestors || "0",
      total_invested: totalInvested || "0",
      total_profit_shared: totalProfitShared || "0",
      total_withdrawn: totalWithdrawn || "0",
    };

    try {

      await onSave(payload);

      setSuccessMessage("Statistics updated successfully!");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

    } catch (err) {

      const serverError =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to update statistics";

      setErrorMessage(serverError);

      setTimeout(() => {
        setErrorMessage("");
      }, 4000);

    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-400 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Input Fields — labels renamed to Oxford Financial Ads Live Statistics (values unchanged) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <StatInputField
          icon={Users}
          label="Total Registered Members"
          value={totalUsers}
          onChange={setTotalUsers}
          placeholder="1250000"
          color="blue"
        />

        <StatInputField
          icon={UserCheck}
          label="Verified Freelancers"
          value={activeInvestors}
          onChange={setActiveInvestors}
          placeholder="793247"
          color="green"
        />

        <StatInputField
          icon={TrendingUp}
          label="Package Investment Overview"
          value={totalInvested}
          onChange={setTotalInvested}
          placeholder="9884731"
          color="red"
          isCurrency
        />

        <StatInputField
          icon={Download}
          label="Successful Withdrawals"
          value={totalWithdrawn}
          onChange={setTotalWithdrawn}
          placeholder="22438296"
          color="orange"
          isCurrency
        />

        <StatInputField
          icon={DollarSign}
          label="Countries Connected"
          value={totalProfitShared}
          onChange={setTotalProfitShared}
          placeholder="93"
          color="green"
        />

      </div>

      {/* Save Button */}
      <div className="flex pt-4 border-t border-white/10">

        <button
          onClick={handleSave}
          disabled={!isChanged || saving}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >

          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}

        </button>

      </div>

    </div>
  );
}