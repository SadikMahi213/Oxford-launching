import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Send, Download, ArrowUpRight, ArrowDownLeft, CalendarDays, FileText } from "lucide-react";
import { getTransferHistory } from "../../api/user.api.js";
import { useTranslation } from "react-i18next";

export default function TransferHistory({ setActivePage }) {
  const { t } = useTranslation();
  const [data, setData] = useState({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    getTransferHistory()
      .then((res) => setData(res.data || { sent: [], received: [] }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const all = [...(data.sent || []).map((tr) => ({ ...tr, dir: "sent" })), ...(data.received || []).map((tr) => ({ ...tr, dir: "received" }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filtered = tab === "all" ? all : tab === "sent" ? all.filter((tr) => tr.dir === "sent") : all.filter((tr) => tr.dir === "received");

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setActivePage?.("overview")} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center">
            <Download className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t("transferHistory.title")}</h1>
            <p className="text-sm text-gray-400">{t("transferHistory.subtitle")}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-12">{t("transferHistory.loading")}</p>
        ) : all.length === 0 ? (
          <div className="text-center py-12">
            <Send className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">{t("transferHistory.noTransfers")}</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {["all", "sent", "received"].map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${
                    tab === tabKey ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10"
                  }`}
                >
                  {tabKey === "sent" ? t("transferHistory.sent", { count: data.sent?.length || 0 }) : tabKey === "received" ? t("transferHistory.received", { count: data.received?.length || 0 }) : t("transferHistory.all")}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filtered.map((tr) => (
                <motion.div
                  key={`${tr.dir}-${tr.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tr.dir === "sent" ? "bg-red-500/10" : "bg-emerald-500/10"
                    }`}>
                      {tr.dir === "sent" ? (
                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {tr.dir === "sent" ? t("transferHistory.to", { name: tr.receiver_name || t("transferHistory.user", { id: tr.receiver_id }) }) : t("transferHistory.from", { name: tr.sender_name || t("transferHistory.user", { id: tr.sender_id }) })}
                      </p>
                      {tr.note && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3" /> {tr.note}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(tr.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right flex-shrink-0 ${tr.dir === "sent" ? "text-red-400" : "text-emerald-400"}`}>
                    <p className="font-bold">{tr.dir === "sent" ? "-" : "+"}{tr.amount.toFixed(2)} USDT</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
