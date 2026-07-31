import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MessageCircle, Save, Loader2, RefreshCw } from "lucide-react";
import useUserStore from "../../store/userStore";
import api from "../../api/axiosInstance";

const authHeaders = () => {
  const token = useUserStore.getState().token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export default function AdminWhatsAppConfig() {
  const [config, setConfig] = useState({
    enabled: false,
    whatsapp_number: "",
    default_message: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get("v1/whatsapp/config", authHeaders());
      if (res?.data?.config) {
        setConfig(res.data.config);
      }
    } catch (err) {
      console.error("Failed to load WhatsApp config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("v1/whatsapp/config", config, authHeaders());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save WhatsApp config:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
        <p className="text-gray-400 text-sm mt-2">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className="text-2xl md:text-3xl font-bold">
        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          WhatsApp Configuration
        </span>
      </h1>
      <p className="text-gray-400 text-sm">Configure the WhatsApp chat button for users</p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-5"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-semibold text-sm">Enable WhatsApp</label>
              <p className="text-gray-400 text-xs mt-0.5">Show the WhatsApp floating button to users</p>
            </div>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative w-12 h-6 rounded-full transition-all ${
                config.enabled ? "bg-green-500" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  config.enabled ? "left-6.5 translate-x-0.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="text-white font-semibold text-sm block mb-1">WhatsApp Number</label>
            <input
              type="text"
              value={config.whatsapp_number || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, whatsapp_number: e.target.value }))}
              placeholder="+1234567890"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="text-white font-semibold text-sm block mb-1">Default Message</label>
            <textarea
              value={config.default_message || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, default_message: e.target.value }))}
              placeholder="Hello, I have a question about..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? "Saved!" : saving ? "Saving..." : "Save Configuration"}
            </button>
            <button
              onClick={fetchConfig}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
