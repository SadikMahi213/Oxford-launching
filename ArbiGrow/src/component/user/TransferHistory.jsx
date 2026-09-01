import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Send, Download, ArrowUpRight, ArrowDownLeft, CalendarDays, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { getTransferHistory } from "../../api/user.api.js";
import { useTranslation } from "react-i18next";

function TransferCard({ tr }) {
  const isSent = tr.dir === "sent";
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      key={`${tr.dir}-${tr.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden"
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isSent ? "bg-red-500/10" : "bg-emerald-500/10"
          }`}>
            {isSent ? <ArrowUpRight className="w-5 h-5 text-red-400" /> : <ArrowDownLeft className="w-5 h-5 text-emerald-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">
              {isSent ? (tr.receiver_full_name || tr.receiver_name || `User #${tr.receiver_id}`) : (tr.sender_full_name || tr.sender_name || `User #${tr.sender_id}`)}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <CalendarDays className="w-3 h-3" />
              {new Date(tr.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`text-right ${isSent ? "text-red-400" : "text-emerald-400"}`}>
            <p className="font-bold">{isSent ? "-" : "+"}{tr.amount.toFixed(2)} USDT</p>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">#{tr.id}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Sender */}
            <div className="rounded-lg bg-white/[0.03] p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Sender</p>
              {(tr.sender_full_name || tr.sender_name) && <p className="text-sm text-white">{tr.sender_full_name || tr.sender_name}</p>}
              {tr.sender_user_no && <p className="text-xs text-gray-400">User ID: <span className="text-gray-300">{tr.sender_user_no}</span></p>}
              {tr.sender_username && <p className="text-xs text-gray-400">Member ID: <span className="text-gray-300">{tr.sender_username}</span></p>}
              {tr.sender_email && <p className="text-xs text-gray-400">Email: <span className="text-gray-300">{tr.sender_email}</span></p>}
              {tr.sender_mobile && <p className="text-xs text-gray-400">Mobile: <span className="text-gray-300">{tr.sender_mobile}</span></p>}
              {!tr.sender_full_name && !tr.sender_name && !tr.sender_user_no && !tr.sender_username && !tr.sender_email && !tr.sender_mobile && (
                <p className="text-xs text-gray-500">User #{tr.sender_id}</p>
              )}
            </div>
            {/* Receiver */}
            <div className="rounded-lg bg-white/[0.03] p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Receiver</p>
              {(tr.receiver_full_name || tr.receiver_name) && <p className="text-sm text-white">{tr.receiver_full_name || tr.receiver_name}</p>}
              {tr.receiver_user_no && <p className="text-xs text-gray-400">User ID: <span className="text-gray-300">{tr.receiver_user_no}</span></p>}
              {tr.receiver_username && <p className="text-xs text-gray-400">Member ID: <span className="text-gray-300">{tr.receiver_username}</span></p>}
              {tr.receiver_email && <p className="text-xs text-gray-400">Email: <span className="text-gray-300">{tr.receiver_email}</span></p>}
              {tr.receiver_mobile && <p className="text-xs text-gray-400">Mobile: <span className="text-gray-300">{tr.receiver_mobile}</span></p>}
              {!tr.receiver_full_name && !tr.receiver_name && !tr.receiver_user_no && !tr.receiver_username && !tr.receiver_email && !tr.receiver_mobile && (
                <p className="text-xs text-gray-500">User #{tr.receiver_id}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            <span>Amount: <span className="text-white font-semibold">{tr.amount.toFixed(2)} USDT</span></span>
            <span>Transaction ID: <span className="text-gray-300 font-mono">#{tr.id}</span></span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] ${tr.status === "completed" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" : "text-amber-300 bg-amber-500/10 border-amber-500/20"}`}>{tr.status || "completed"}</span>
            {tr.source_wallet && <span>From: <span className="text-gray-300">{tr.source_wallet}</span></span>}
            {tr.destination_wallet && <span>To: <span className="text-gray-300">{tr.destination_wallet}</span></span>}
          </div>

          {tr.note && (
            <p className="text-xs text-gray-500 flex items-center gap-1"><FileText className="w-3 h-3" /> {tr.note}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

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
                <TransferCard key={`${tr.dir}-${tr.id}`} tr={tr} />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
