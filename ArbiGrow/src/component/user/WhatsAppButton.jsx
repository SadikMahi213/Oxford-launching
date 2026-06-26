import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import useUserStore from "../../store/userStore";
import api from "../../api/axiosInstance";

const authHeaders = () => {
  const token = useUserStore.getState().token;
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

export default function WhatsAppFloatingButton() {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await api.get("v1/whatsapp/config", authHeaders());
        setConfig(res?.data?.config || null);
      } catch {
        // Silently fail
      }
    };
    loadConfig();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post(
        "v1/whatsapp/send",
        { message: message.trim() },
        authHeaders()
      );
      setSent(true);
      setMessage("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to send WhatsApp message:", err);
    } finally {
      setSending(false);
    }
  };

  if (!config?.enabled) return null;

  const waUrl = config.whatsapp_number
    ? `https://wa.me/${config.whatsapp_number.replace(/[^0-9]/g, "")}${
        config.default_message
          ? `?text=${encodeURIComponent(config.default_message)}`
          : ""
      }`
    : null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-2xl border border-white/10 w-72 shadow-2xl"
          >
            <div className="text-white font-semibold text-sm mb-3">
              {t("whatsappButton.chatTitle")}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("whatsappButton.placeholder")}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-green-500/50"
            />
            <div className="flex gap-2 mt-3">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-semibold text-center hover:bg-green-600/30 transition-all"
                >
                  {t("whatsappButton.openWhatsApp")}
                </a>
              )}
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="flex-1 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-600/30 transition-all disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                ) : sent ? (
                  t("whatsappButton.sent")
                ) : (
                  t("whatsappButton.send")
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 flex items-center justify-center text-white hover:shadow-xl hover:shadow-green-500/40 transition-all"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
