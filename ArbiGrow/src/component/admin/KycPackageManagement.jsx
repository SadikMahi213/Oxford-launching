import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ShieldCheck, ToggleLeft, ToggleRight, DollarSign, Users, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import useUserStore from "../../store/userStore";
import { getFeeConfig, updateFeeConfig } from "../../api/admin.api.js";
import { getUserStatistics } from "../../api/admin.api.js";

export default function KycPackageManagement({ setActivePage }) {
  const token = useUserStore((s) => s.token);
  const [feeConfig, setFeeConfig] = useState({});
  const [stats, setStats] = useState({ kyc: { pending: 0, approved: 0, rejected: 0, without_kyc: 0 } });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [feeInput, setFeeInput] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getFeeConfig(token).then((r) => setFeeConfig(r.data || {})),
      getUserStatistics(token).then((r) => setStats(r || {})),
    ])
      .catch(() => setMsg("Failed to load config"))
      .finally(() => setLoading(false));
  }, [token]);

  const togglePackage = async () => {
    const current = feeConfig.kyc_package_enabled;
    const newValue = current === "true" ? "false" : "true";
    try {
      await updateFeeConfig(token, "kyc_package_enabled", newValue);
      setFeeConfig({ ...feeConfig, kyc_package_enabled: newValue });
      setMsg(`KYC package ${newValue === "true" ? "enabled" : "disabled"}`);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveFee = async () => {
    if (!feeInput.trim()) return;
    try {
      await updateFeeConfig(token, "kyc_fee", feeInput.trim());
      setFeeConfig({ ...feeConfig, kyc_fee: feeInput.trim() });
      setMsg(`KYC fee set to ${feeInput.trim()} USDT`);
      setFeeInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const enabled = feeConfig.kyc_package_enabled === "true";
  const kyc = stats.kyc || {};

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            KYC Package Management
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure the KYC verification package — price, availability, and status tracking.
        </p>
      </motion.div>

      {msg && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">{msg}</p>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] backdrop-blur-xl border border-emerald-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-400">{kyc.approved || 0}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Verified</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] backdrop-blur-xl border border-amber-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{kyc.pending || 0}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Pending</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/[0.02] backdrop-blur-xl border border-red-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <XCircle className="w-8 h-8 text-red-400" />
                <span className="text-2xl font-bold text-red-400">{kyc.rejected || 0}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Rejected</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" /> Package Price
              </h3>
              <div className="flex items-center gap-3">
                <input
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  placeholder={feeConfig.kyc_fee || "0"}
                  className="w-28 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-gray-400">USDT</span>
                <button onClick={saveFee}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
                >Save</button>
              </div>
              <p className="text-xs text-gray-500">Current price: <strong className="text-white">{feeConfig.kyc_fee || "0"} USDT</strong> — deducted from user's main wallet on KYC submission.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Package Status</h3>
                <button onClick={togglePackage}
                  className={`p-2 rounded-lg transition-colors ${enabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                >
                  {enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <div className={`text-sm ${enabled ? "text-green-400" : "text-red-400"}`}>
                {enabled ? "KYC package is active — users can submit verification" : "KYC package is disabled — submissions blocked"}
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-3"
          >
            <h3 className="text-white font-semibold">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setActivePage?.("kyc-requests")}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> View KYC Requests
              </button>
              <button onClick={() => setActivePage?.("users")}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> User Management
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl bg-gradient-to-br from-blue-500/5 to-blue-500/[0.02] backdrop-blur-xl border border-blue-500/20 p-5 space-y-2"
          >
            <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> KYC Policy
            </h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• KYC is only required for: user-to-user fund transfers and withdrawal requests.</li>
              <li>• Package purchases, deposits, earnings, referrals, and daily activities do NOT require KYC.</li>
              <li>• The fee is deducted once per user at the time of KYC submission.</li>
              <li>• Users with existing KYC records are grandfathered — no additional fee.</li>
            </ul>
          </motion.div>
        </>
      )}
    </div>
  );
}