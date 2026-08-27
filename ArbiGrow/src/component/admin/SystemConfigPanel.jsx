import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Settings, ToggleLeft, ToggleRight, Clock, Coins, Users, DollarSign, Gift } from "lucide-react";
import useUserStore from "../../store/userStore";
import {
  getSystemConfig, updateSystemConfig,
  getMiningConfig, updateMiningConfig, getMiningStats,
  getFeeConfig, updateFeeConfig,
} from "../../api/admin.api.js";

const FEATURE_LABELS = {
  system_daily_work_enabled: "Daily Work (Mining)",
  system_daily_earning_enabled: "Daily Earnings (ROI)",
  system_withdrawal_enabled: "Withdrawals",
  system_weekend_restricted: "Weekend Restriction (Sat/Sun)",
};

const SystemConfigPanel = () => {
  const token = useUserStore((s) => s.token);
  const [config, setConfig] = useState({});
  const [miningConfig, setMiningConfig] = useState({});
  const [miningStats, setMiningStats] = useState({ data: [], total_active_miners: 0 });
  const [feeConfig, setFeeConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [capInput, setCapInput] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [cooldownInput, setCooldownInput] = useState("");
  const [signupBonusInput, setSignupBonusInput] = useState("");
  const [kycFeeInput, setKycFeeInput] = useState("");
  const [minDepositInput, setMinDepositInput] = useState("");
  const [minTransferInput, setMinTransferInput] = useState("");
  const [captchaTimerInput, setCaptchaTimerInput] = useState("");
  const [miningPage, setMiningPage] = useState(1);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getSystemConfig(token).then((r) => setConfig(r.data || {})),
      getMiningConfig(token).then((r) => setMiningConfig(r.data || {})),
      getMiningStats(token, 1).then((r) => setMiningStats(r)),
      getFeeConfig(token).then((r) => setFeeConfig(r.data || {})),
    ])
      .catch(() => setMsg("Failed to load config"))
      .finally(() => setLoading(false));
  }, [token]);

  const toggle = async (key) => {
    const current = config[key];
    const newValue = current === "true" ? "false" : "true";
    try {
      await updateSystemConfig(token, key, newValue);
      setConfig({ ...config, [key]: newValue });
      setMsg(`${FEATURE_LABELS[key] || key} ${newValue === "true" ? "enabled" : "disabled"}`);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const toggleMining = async () => {
    const current = miningConfig.mining_enabled;
    const newValue = current === "true" ? "false" : "true";
    try {
      await updateMiningConfig(token, "mining_enabled", newValue);
      setMiningConfig({ ...miningConfig, mining_enabled: newValue });
      setMsg(`Mining ${newValue === "true" ? "enabled" : "disabled"}`);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveCap = async () => {
    if (!capInput.trim()) return;
    try {
      await updateMiningConfig(token, "mining_daily_cap", capInput.trim());
      setMiningConfig({ ...miningConfig, mining_daily_cap: capInput.trim() });
      setMsg(`Mining cap set to ${capInput.trim()} OFA`);
      setCapInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveRate = async () => {
    if (!rateInput.trim()) return;
    try {
      await updateMiningConfig(token, "ofa_to_usdt_rate", rateInput.trim());
      setMiningConfig({ ...miningConfig, ofa_to_usdt_rate: rateInput.trim() });
      setMsg(`Conversion rate set to ${rateInput.trim()} USDT per OFA`);
      setRateInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveCooldown = async () => {
    if (!cooldownInput.trim()) return;
    try {
      await updateMiningConfig(token, "mining_claim_cooldown_minutes", cooldownInput.trim());
      setMiningConfig({ ...miningConfig, mining_claim_cooldown_minutes: cooldownInput.trim() });
      setMsg(`Claim cooldown set to ${cooldownInput.trim()} minutes`);
      setCooldownInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveSignupBonus = async () => {
    if (!signupBonusInput.trim()) return;
    try {
      await updateMiningConfig(token, "ofa_signup_bonus", signupBonusInput.trim());
      setMiningConfig({ ...miningConfig, ofa_signup_bonus: signupBonusInput.trim() });
      setMsg(`Signup bonus set to ${signupBonusInput.trim()} OFA`);
      setSignupBonusInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveCaptchaTimer = async () => {
    if (!captchaTimerInput.trim()) return;
    try {
      await updateMiningConfig(token, "captcha_timer_seconds", captchaTimerInput.trim());
      setMiningConfig({ ...miningConfig, captcha_timer_seconds: captchaTimerInput.trim() });
      setMsg("Captcha timer set to " + captchaTimerInput.trim() + " seconds");
      setCaptchaTimerInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveKycFee = async () => {
    if (!kycFeeInput.trim()) return;
    try {
      await updateFeeConfig(token, "kyc_fee", kycFeeInput.trim());
      setFeeConfig({ ...feeConfig, kyc_fee: kycFeeInput.trim() });
      setMsg(`KYC fee set to ${kycFeeInput.trim()} USDT`);
      setKycFeeInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveMinDeposit = async () => {
    if (!minDepositInput.trim()) return;
    try {
      await updateFeeConfig(token, "min_deposit_amount", minDepositInput.trim());
      setFeeConfig({ ...feeConfig, min_deposit_amount: minDepositInput.trim() });
      setMsg(`Minimum deposit amount set to ${minDepositInput.trim()} USDT`);
      setMinDepositInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveMinTransfer = async () => {
    if (!minTransferInput.trim()) return;
    try {
      await updateFeeConfig(token, "min_user_transfer_amount", minTransferInput.trim());
      setFeeConfig({ ...feeConfig, min_user_transfer_amount: minTransferInput.trim() });
      setMsg(`Minimum user-to-user transfer amount set to ${minTransferInput.trim()} USDT`);
      setMinTransferInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const loadMiningStats = async (page) => {
    try {
      const res = await getMiningStats(token, page);
      setMiningStats(res);
      setMiningPage(page);
    } catch {}
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            System Settings
          </span>
        </h1>
        <p className="text-sm text-gray-400">
          Override weekend rules and configure mining. UK timezone (Sat-Sun) auto-pauses features unless overridden.
        </p>
      </motion.div>

      {msg && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">{msg}</p>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <>
          {/* System Feature Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
              const enabled = config[key] === "true";
              const isOverridden = config[key] !== undefined && config[key] !== null;
              return (
                <motion.div key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">{label}</h3>
                    <Settings className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${enabled ? "text-green-400" : "text-red-400"}`}>
                      {enabled ? "Active" : "Paused"}
                    </span>
                    <button onClick={() => toggle(key)}
                      className={`p-2 rounded-lg transition-colors ${enabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                  {isOverridden && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Admin override active
                    </p>
                  )}
                  {!isOverridden && (
                    <p className="text-xs text-gray-500">Follows UK weekend schedule</p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Mining Settings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" /> Mining Configuration
              </h3>
              <button onClick={toggleMining}
                className={`p-2 rounded-lg transition-colors ${miningConfig.mining_enabled === "true" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
              >
                {miningConfig.mining_enabled === "true" ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Daily Cap (OFA):</label>
              <input
                value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                placeholder={miningConfig.mining_daily_cap || "20"}
                className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              />
              <button onClick={saveCap}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
              >Save</button>
              <span className="text-xs text-gray-500">Current: {miningConfig.mining_daily_cap || "20"} OFA/day</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">OFA → USDT Rate:</label>
              <input
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder={miningConfig.ofa_to_usdt_rate || "0.0001"}
                className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              />
              <button onClick={saveRate}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
              >Save</button>
              <span className="text-xs text-gray-500">1 OFA = {miningConfig.ofa_to_usdt_rate || "0.0001"} USDT</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Claim Cooldown (min):</label>
              <input
                value={cooldownInput}
                onChange={(e) => setCooldownInput(e.target.value)}
                placeholder={miningConfig.mining_claim_cooldown_minutes || "1"}
                className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                type="number"
                min="0"
                max="1440"
              />
              <button onClick={saveCooldown}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
              >Save</button>
              <span className="text-xs text-gray-500">Min wait: {miningConfig.mining_claim_cooldown_minutes || "1"} min</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-pink-400" /> Signup Bonus (OFA):
              </label>
              <input
                value={signupBonusInput}
                onChange={(e) => setSignupBonusInput(e.target.value)}
                placeholder={miningConfig.ofa_signup_bonus || "0"}
                className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                type="number"
                min="0"
                step="0.01"
              />
              <button onClick={saveSignupBonus}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
              >Save</button>
              <span className="text-xs text-gray-500">Current: {miningConfig.ofa_signup_bonus || "0"} OFA (0 = disabled)</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Captcha Timer (sec):
              </label>
              <input
                value={captchaTimerInput}
                onChange={(e) => setCaptchaTimerInput(e.target.value)}
                placeholder={miningConfig.captcha_timer_seconds || "60"}
                className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                type="number"
                min="5"
                max="300"
              />
              <button onClick={saveCaptchaTimer}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
              >Save</button>
              <span className="text-xs text-gray-500">Current: {miningConfig.captcha_timer_seconds || "60"}s (5–300)</span>
            </div>
          </motion.div>

          {/* Fee Configuration */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
          >
            <h3 className="text-white font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" /> Fee Configuration
            </h3>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">KYC Fee (USDT):</label>
              <input
                value={kycFeeInput}
                onChange={(e) => setKycFeeInput(e.target.value)}
                placeholder={feeConfig.kyc_fee || "0"}
                className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                type="number"
                min="0"
                step="0.01"
              />
              <button onClick={saveKycFee}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
              >Save</button>
              <span className="text-xs text-gray-500">Current: {feeConfig.kyc_fee || "0"} USDT</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Min Deposit (USDT):</label>
              <input
                value={minDepositInput}
                onChange={(e) => setMinDepositInput(e.target.value)}
                placeholder={feeConfig.min_deposit_amount || "10"}
                className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                type="number"
                min="0"
                step="0.01"
              />
              <button onClick={saveMinDeposit}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
              >Save</button>
              <span className="text-xs text-gray-500">Current: {feeConfig.min_deposit_amount || "10"} USDT</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Min User Transfer (USDT):</label>
              <input
                value={minTransferInput}
                onChange={(e) => setMinTransferInput(e.target.value)}
                placeholder={feeConfig.min_user_transfer_amount || "0"}
                className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                type="number"
                min="0"
                step="0.01"
              />
              <button onClick={saveMinTransfer}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
                >Save</button>
              <span className="text-xs text-gray-500">Current: {feeConfig.min_user_transfer_amount || "0"} USDT</span>
            </div>

            {/* Withdrawal Mode */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Withdrawal Mode:</label>
              <select
                value={feeConfig.withdrawal_mode || "both"}
                onChange={(e) => updateFeeConfig(token, "withdrawal_mode", e.target.value).then(() => {
                  setFeeConfig({ ...feeConfig, withdrawal_mode: e.target.value });
                  setMsg(`Withdrawal mode set to ${e.target.value}`);
                }).catch((err) => {
                  setMsg("Error: " + (err.response?.data?.detail || err.message));
                })}
                className="w-40 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              >
                <option value="banking_only" style={{ color: "#0f172a" }}>Banking Only</option>
                <option value="network_only" style={{ color: "#0f172a" }}>Network Only</option>
                <option value="both" style={{ color: "#0f172a" }}>Banking + Network</option>
              </select>
              <span className="text-xs text-gray-500">Changes take effect immediately</span>
            </div>
          </motion.div>

          {/* Active Miners */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-3"
          >
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Active Miners ({miningStats.total_active_miners || 0})
            </h3>
            {!miningStats.data || miningStats.data.length === 0 ? (
              <p className="text-gray-400 text-sm">No active miners</p>
            ) : (
              <div className="space-y-2">
                {miningStats.data.map((m) => (
                  <div key={m.user_no} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                    <div>
                      <span className="text-white font-medium">{m.full_name}</span>
                      <span className="text-gray-500 ml-2">{m.email}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-cyan-400">{m.daily_mined} OFA mined</span>
                      <span className="text-gray-500 ml-2">Wallet: {m.arbx_wallet}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-2">
        <h3 className="text-white font-semibold">Schedule Rule</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Saturday &amp; Sunday (UK time): Daily Work, Daily Earnings, and Withdrawals are automatically paused.</li>
          <li>• Mining is capped at 20 OFA/day (configurable above). Users can claim every 60 seconds.</li>
          <li>• Toggle any feature above to "Active" to override the weekend rule.</li>
          <li>• Deposits, marketplace, login/register, and wallet features are always active.</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemConfigPanel;
