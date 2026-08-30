import { useState } from "react";
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

/* Remove comma before sending API */
const cleanNumber = (value) => {
  return Number(String(value).replace(/,/g, ""));
};

/* Format number for UI - integer comma formatting, no fractional digits */
const formatDecimal = (value) => {
  const num = Number(value || 0);
  if (num === 0) return "0";
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

export function StatisticsForm({ initialStats, onSave }) {

  const [totalUsers, setTotalUsers] = useState(
    (initialStats?.total_users || 0).toString()
  );

  const [activeInvestors, setActiveInvestors] = useState(
    (initialStats?.active_investors || 0).toString()
  );

  const [totalInvested, setTotalInvested] = useState(
    formatDecimal(initialStats?.total_invested)
  );

  const [totalProfitShared, setTotalProfitShared] = useState(
    formatDecimal(initialStats?.total_profit_shared)
  );

  const [totalWithdrawn, setTotalWithdrawn] = useState(
    formatDecimal(initialStats?.total_withdrawn)
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* Detect change — compare cleaned numeric values to handle comma-formatted input */
  const isChanged =
    parseInt(totalUsers || "0", 10) !== (initialStats?.total_users || 0) ||
    parseInt(activeInvestors || "0", 10) !== (initialStats?.active_investors || 0) ||
    cleanNumber(totalInvested) !== (initialStats?.total_invested || 0) ||
    cleanNumber(totalProfitShared) !== (initialStats?.total_profit_shared || 0) ||
    cleanNumber(totalWithdrawn) !== (initialStats?.total_withdrawn || 0);

  /* Save */
  const handleSave = async () => {

    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    const payload = {
      total_users: parseInt(totalUsers || "0"),
      active_investors: parseInt(activeInvestors || "0"),
      total_invested: cleanNumber(totalInvested),
      total_profit_shared: cleanNumber(totalProfitShared),
      total_withdrawn: cleanNumber(totalWithdrawn),
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