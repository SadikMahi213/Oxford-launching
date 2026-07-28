import { useState, useEffect } from "react";
import { getCommissionConfig, updateCommissionConfig } from "../../api/admin.api.js";
import useUserStore from "../../store/userStore.js";
import { Percent, Save, RefreshCw } from "lucide-react";

const LEVEL_LABELS = {
  1: { label: "Direct Referral Bonus", desc: "Level 1 — paid to direct upline" },
  2: { label: "Generation Bonus Level 2", desc: "Indirect referral (upline of upline)" },
  3: { label: "Generation Bonus Level 3", desc: "3rd-level upline" },
  4: { label: "Generation Bonus Level 4", desc: "4th-level upline" },
  5: { label: "Generation Bonus Level 5", desc: "5th-level upline" },
};

export default function CommissionConfig() {
  const [configs, setConfigs] = useState({});
  const [saving, setSaving] = useState({});
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [globalMsg, setGlobalMsg] = useState("");

  const token = useUserStore((s) => s.token);

  const loadConfig = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getCommissionConfig(token);
      setConfigs(res?.data || {});
    } catch (err) {
      console.error("Failed to load commission config", err);
      setGlobalMsg("Failed to load commission configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [token]);

  const handleSave = async (key) => {
    if (!token) return;
    const raw = String(configs[key] || "").trim();
    if (!raw || raw === "") {
      setMessages((prev) => ({ ...prev, [key]: "Value is required." }));
      return;
    }
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0 || val > 100) {
      setMessages((prev) => ({ ...prev, [key]: "Must be between 0 and 100." }));
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, [key]: true }));
      setMessages((prev) => ({ ...prev, [key]: "" }));
      const res = await updateCommissionConfig(token, key, raw);
      setMessages((prev) => ({ ...prev, [key]: res?.message || "Saved." }));
    } catch (err) {
      const detail = err?.response?.data?.detail || "Failed to save";
      setMessages((prev) => ({ ...prev, [key]: detail }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleChange = (key, value) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setConfigs((prev) => ({ ...prev, [key]: value }));
      setMessages((prev) => ({ ...prev, [key]: "" }));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Bonus{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Configuration
            </span>
          </h1>
          <p className="text-gray-400">
            Manage referral and generation bonus percentages
          </p>
        </div>
        <button
          type="button"
          onClick={loadConfig}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {globalMsg && (
        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {globalMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading configuration...</div>
      ) : (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((level) => {
            const key = `commission_l${level}`;
            const info = LEVEL_LABELS[level];
            const isSaving = saving[key];
            const msg = messages[key];

            return (
              <div
                key={key}
                className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-lg font-semibold text-white">
                        {info.label}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400">{info.desc}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={configs[key] ?? ""}
                        onChange={(e) => handleChange(key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(key);
                        }}
                        className="w-24 px-3 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white text-center font-semibold text-lg focus:border-cyan-500/50 focus:outline-none"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        %
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSave(key)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {msg && (
                  <div className={`mt-3 text-sm ${msg.includes("Failed") || msg.includes("Invalid") || msg.includes("required") || msg.includes("Must be") ? "text-red-400" : "text-green-400"}`}>
                    {msg}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 p-4">
        <p className="text-sm text-blue-200">
          <strong>Note:</strong> Changes take effect immediately for all new bonus calculations.
          Existing bonus history is not affected. The referral bonus (Level 1) is paid to the
          direct upline's referral wallet. Generation bonuses (Levels 2-5) are paid to the
          respective upline's generation wallet, subject to KYC approval.
        </p>
      </div>
    </div>
  );
}
