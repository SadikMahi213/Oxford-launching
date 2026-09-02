import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, Fragment } from "react";
import { motion } from "motion/react";
import { Search, Send, User, ArrowLeft, Loader, CheckCircle, AlertCircle, CalendarDays, ArrowUpRight, ArrowDownLeft, FileText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { sendFunds, searchUsers, getTransferMinimum, getTransferHistory } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";
import KycWarningBanner from "./KycWarningBanner.jsx";

function InlineTransferCard({ tr }) {
  const isSent = tr.dir === "sent";
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-white/[0.03]" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSent ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
            {isSent ? <ArrowUpRight size={14} className="text-red-400" /> : <ArrowDownLeft size={14} className="text-emerald-400" />}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{isSent ? (tr.receiver_full_name || tr.receiver_name || `User #${tr.receiver_id}`) : (tr.sender_full_name || tr.sender_name || `User #${tr.sender_id}`)}</div>
            <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5"><CalendarDays size={10} />{formatHistoryDate(tr.created_at)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`text-xs font-bold ${isSent ? "text-red-300" : "text-emerald-300"}`}>{isSent ? "-" : "+"}{Number(tr.amount).toFixed(2)} USDT</div>
          {expanded ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-2.5">
          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-lg bg-white/[0.03] p-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Sender</p>
              {(tr.sender_full_name || tr.sender_name) && <p className="text-xs text-white">{tr.sender_full_name || tr.sender_name}</p>}
              {tr.sender_user_no && <p className="text-[11px] text-gray-400">User ID: <span className="text-gray-300">{tr.sender_user_no}</span></p>}
              {tr.sender_username && <p className="text-[11px] text-gray-400">Member ID: <span className="text-gray-300">{tr.sender_username}</span></p>}
              {tr.sender_email && <p className="text-[11px] text-gray-400">Email: <span className="text-gray-300">{tr.sender_email}</span></p>}
              {tr.sender_mobile && <p className="text-[11px] text-gray-400">Mobile: <span className="text-gray-300">{tr.sender_mobile}</span></p>}
              {!tr.sender_full_name && !tr.sender_name && !tr.sender_user_no && !tr.sender_username && !tr.sender_email && !tr.sender_mobile && (
                <p className="text-[11px] text-gray-500">User #{tr.sender_id}</p>
              )}
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Receiver</p>
              {(tr.receiver_full_name || tr.receiver_name) && <p className="text-xs text-white">{tr.receiver_full_name || tr.receiver_name}</p>}
              {tr.receiver_user_no && <p className="text-[11px] text-gray-400">User ID: <span className="text-gray-300">{tr.receiver_user_no}</span></p>}
              {tr.receiver_username && <p className="text-[11px] text-gray-400">Member ID: <span className="text-gray-300">{tr.receiver_username}</span></p>}
              {tr.receiver_email && <p className="text-[11px] text-gray-400">Email: <span className="text-gray-300">{tr.receiver_email}</span></p>}
              {tr.receiver_mobile && <p className="text-[11px] text-gray-400">Mobile: <span className="text-gray-300">{tr.receiver_mobile}</span></p>}
              {!tr.receiver_full_name && !tr.receiver_name && !tr.receiver_user_no && !tr.receiver_username && !tr.receiver_email && !tr.receiver_mobile && (
                <p className="text-[11px] text-gray-500">User #{tr.receiver_id}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
            <span>Tx: <span className="text-gray-300 font-mono">#{tr.id}</span></span>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] ${tr.status === "completed" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" : "text-amber-300 bg-amber-500/10 border-amber-500/20"}`}>{tr.status || "completed"}</span>
            {tr.source_wallet && <span>From: <span className="text-gray-300">{tr.source_wallet}</span></span>}
            {tr.destination_wallet && <span>To: <span className="text-gray-300">{tr.destination_wallet}</span></span>}
          </div>
          {tr.note && <p className="text-[11px] text-gray-500 flex items-center gap-1"><FileText className="w-3 h-3" /> {tr.note}</p>}
        </div>
      )}
    </div>
  );
}

function formatHistoryDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes} ${ampm}`;
}

export default function SendFunds({ setActivePage }) {
  const { t } = useTranslation();
  const { user, setUser } = useUserStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null);
  const [transferChargePercent, setTransferChargePercent] = useState(5);
  const [minTransfer, setMinTransfer] = useState(0);
  const [minCurrency, setMinCurrency] = useState("OFA");
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [transferHistory, setTransferHistory] = useState({ sent: [], received: [] });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const historyPageSize = 10;

  const loadTransferHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getTransferHistory();
      setTransferHistory(res.data || { sent: [], received: [] });
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    getTransferMinimum()
      .then((res) => {
        setMinTransfer(Number(res?.data?.min_user_transfer_amount) || 0);
        if (res?.data?.currency) setMinCurrency(res.data.currency);
      })
      .catch(() => setMinTransfer(0));
    loadTransferHistory();
  }, [loadTransferHistory]);

  const handleSearch = async () => {
    if (!recipient.trim()) return;
    setSearching(true);
    setSearchedUser(null);
    setMsg("");
    try {
      const q = recipient.trim();
      const res = await searchUsers(q);
      const allUsers = res?.data?.users || [];
      const others = allUsers.filter((u) => u.id !== user?.id);
      if (others.length > 0) {
        setSearchedUser(others[0]);
        setMsg("");
      } else if (allUsers.length > 0 && allUsers[0].id === user?.id) {
        setMsg(t('sendFunds.err_self'));
      } else {
        setMsg(t('sendFunds.err_noUser', { query: q }));
      }
    } catch (err) {
      setMsg(t('sendFunds.err_search', { error: err?.response?.data?.detail || err.message }));
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchedUser) return;
    const kycStatus = user?.kyc_status;
    if (!kycStatus || kycStatus !== "approved") {
      setMsg(t('sendFunds.err_kyc'));
      return;
    }
    if (minTransfer > 0 && Number(amount) < minTransfer) {
      setMsg(t('sendFunds.err_min', { min: minTransfer, currency: minCurrency }));
      return;
    }
    setLoading(true);
    setMsg("");
    setIsSuccess(false);
    try {
      const res = await sendFunds({
        recipient: searchedUser.email,
        amount: parseFloat(amount),
        note: note || undefined,
      });
      setUser({ main_wallet: res.data.new_balance });
      setMsg(t('sendFunds.success', { amount, name: searchedUser.full_name }));
      setIsSuccess(true);
      setAmount("");
      setNote("");
      setRecipient("");
      setSearchedUser(null);
      loadTransferHistory();
    } catch (err) {
      setMsg(err.response?.data?.detail || t('sendFunds.err_failed'));
    } finally {
      setLoading(false);
    }
  };

  const allTransfers = [
    ...(transferHistory.sent || []).map((tr) => ({ ...tr, dir: "sent" })),
    ...(transferHistory.received || []).map((tr) => ({ ...tr, dir: "received" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalHistory = allTransfers.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistory / historyPageSize));
  const paginatedTransfers = allTransfers.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen p-3 md:p-6">
      <div className="max-w-lg mx-auto">
        <KycWarningBanner />
        <div className="flex items-center gap-3 mb-5 md:mb-8">
          <button onClick={() => setActivePage?.("overview")} className="p-1.5 md:p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          </button>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-white truncate">{t('sendFunds.title')}</h1>
            <p className="text-xs md:text-sm text-gray-400 truncate">{t('sendFunds.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4 md:p-5 space-y-3 md:space-y-4">
            <label className="block text-xs md:text-sm text-gray-400">{t('sendFunds.searchLabel')}</label>
            <div className="flex gap-2">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={t('sendFunds.search_plh')}
                className="flex-1 px-3 md:px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm md:text-base text-white focus:outline-none focus:border-emerald-500/50"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !recipient.trim()}
                className="px-3 md:px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 flex items-center gap-1.5 md:gap-2 text-sm md:text-base flex-shrink-0"
              >
                {searching ? <Loader className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                <span className="hidden xs:inline">{t('sendFunds.search')}</span>
              </button>
            </div>

            {searchedUser && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
              >
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm md:text-base text-white font-medium truncate">{searchedUser.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{searchedUser.email}</p>
                </div>
              </motion.div>
            )}
          </div>

          {searchedUser && (
            <form onSubmit={handleSubmit} className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4 md:p-5 space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm text-gray-400 mb-1.5 md:mb-2">{t('sendFunds.amount')}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t('sendFunds.amount_plh')}
                    required
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base md:text-lg focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-400">USDT</span>
                </div>
                  <p className="text-xs text-gray-500 mt-1">{t('sendFunds.available', { balance: Number(user?.main_wallet || 0).toFixed(2) })}</p>
                  {minTransfer > 0 && (
                    <p className="text-xs text-amber-400 mt-1">{t('sendFunds.minTransfer', { min: minTransfer, currency: minCurrency })}</p>
                  )}
                </div>

              {amount > 0 && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex justify-between text-xs md:text-sm text-gray-400">
                    <span>{t('sendFunds.transferAmount')}</span>
                    <span className="text-white">${Number(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm text-gray-400">
                    <span>{t('sendFunds.charge', { percentage: transferChargePercent })}</span>
                    <span className="text-amber-400">-${(Number(amount) * transferChargePercent / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex justify-between text-xs md:text-sm">
                    <span className="text-gray-300 font-semibold">{t('sendFunds.receiverGets')}</span>
                    <span className="text-green-400 font-bold">${(Number(amount) * (1 - transferChargePercent / 100)).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs md:text-sm text-gray-400 mb-1.5 md:mb-2">{t('sendFunds.note')}</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('sendFunds.note_plh')}
                  className="w-full px-3 md:px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm md:text-base text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {msg && (
                <p className={`flex items-center gap-2 text-xs md:text-sm ${isSuccess ? "text-emerald-400" : "text-red-400"}`}>
                  {isSuccess ? <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  {msg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm md:text-base font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
                {loading ? t('sendFunds.sending') : t('sendFunds.send', { amount: amount || "0" })}
              </button>
            </form>
          )}
        </div>

        {/* Fund Transfer History */}
        <div className="mt-6 md:mt-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-white/10">
            <h2 className="text-sm md:text-base font-bold text-white">{t('sendFunds.historyTitle', 'Fund Transfer History')}</h2>
            <p className="text-xs text-gray-400 mt-1">{t('sendFunds.historySubtitle', 'Your complete fund transfer records')}</p>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400">
              <Loader className="w-4 h-4 animate-spin" />
              {t('sendFunds.loadingHistory', 'Loading history...')}
            </div>
          ) : allTransfers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">{t('sendFunds.noHistory', 'No fund transfers yet.')}</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-xs font-semibold text-gray-400">#</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-400">Date/Time</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-400">User</th>
                      <th className="text-right p-3 text-xs font-semibold text-gray-400">Amount</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-400">Tx ID</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-400">Status</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-400">Direction</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransfers.map((tr, idx) => {
                      const serial = (historyPage - 1) * historyPageSize + idx + 1;
                      const isSent = tr.dir === "sent";
                      const rowKey = `${tr.dir}-${tr.id}`;
                      const isExpanded = expandedRow === rowKey;
                      return (
                        <Fragment key={rowKey}>
                          <tr
                            className={`border-b border-white/5 hover:bg-white/[0.03] cursor-pointer ${isExpanded ? "bg-white/[0.04]" : ""}`}
                            onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                          >
                            <td className="p-3 text-xs text-gray-400">{serial}</td>
                            <td className="p-3 text-xs text-gray-300 whitespace-nowrap">{formatHistoryDate(tr.created_at)}</td>
                            <td className="p-3 text-xs text-white max-w-[150px] truncate">{isSent ? (tr.receiver_full_name || tr.receiver_name || `#${tr.receiver_id}`) : (tr.sender_full_name || tr.sender_name || `#${tr.sender_id}`)}</td>
                            <td className={`p-3 text-xs font-semibold text-right ${isSent ? "text-red-300" : "text-emerald-300"}`}>{isSent ? "-" : "+"}{Number(tr.amount).toFixed(2)} USDT</td>
                            <td className="p-3 text-xs text-gray-400 font-mono">#{tr.id}</td>
                            <td className="p-3 text-xs"><span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] ${tr.status === "completed" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" : "text-amber-300 bg-amber-500/10 border-amber-500/20"}`}>{tr.status || "completed"}</span></td>
                            <td className="p-3 text-xs"><span className={`inline-flex items-center gap-1 ${isSent ? "text-red-300" : "text-emerald-300"}`}>{isSent ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}{isSent ? "Sent" : "Received"}</span></td>
                            <td className="p-3 text-xs text-gray-500">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="px-4 pb-3 pt-1 bg-white/[0.02]">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="rounded-lg bg-white/[0.03] p-3 space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Sender</p>
                                    {(tr.sender_full_name || tr.sender_name) && <p className="text-xs text-white">{tr.sender_full_name || tr.sender_name}</p>}
                                    {tr.sender_user_no && <p className="text-[11px] text-gray-400">User ID: <span className="text-gray-300">{tr.sender_user_no}</span></p>}
                                    {tr.sender_username && <p className="text-[11px] text-gray-400">Member ID: <span className="text-gray-300">{tr.sender_username}</span></p>}
                                    {tr.sender_email && <p className="text-[11px] text-gray-400">Email: <span className="text-gray-300">{tr.sender_email}</span></p>}
                                    {tr.sender_mobile && <p className="text-[11px] text-gray-400">Mobile: <span className="text-gray-300">{tr.sender_mobile}</span></p>}
                                    {!tr.sender_full_name && !tr.sender_name && !tr.sender_user_no && !tr.sender_username && !tr.sender_email && !tr.sender_mobile && (
                                      <p className="text-[11px] text-gray-500">User #{tr.sender_id}</p>
                                    )}
                                  </div>
                                  <div className="rounded-lg bg-white/[0.03] p-3 space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Receiver</p>
                                    {(tr.receiver_full_name || tr.receiver_name) && <p className="text-xs text-white">{tr.receiver_full_name || tr.receiver_name}</p>}
                                    {tr.receiver_user_no && <p className="text-[11px] text-gray-400">User ID: <span className="text-gray-300">{tr.receiver_user_no}</span></p>}
                                    {tr.receiver_username && <p className="text-[11px] text-gray-400">Member ID: <span className="text-gray-300">{tr.receiver_username}</span></p>}
                                    {tr.receiver_email && <p className="text-[11px] text-gray-400">Email: <span className="text-gray-300">{tr.receiver_email}</span></p>}
                                    {tr.receiver_mobile && <p className="text-[11px] text-gray-400">Mobile: <span className="text-gray-300">{tr.receiver_mobile}</span></p>}
                                    {!tr.receiver_full_name && !tr.receiver_name && !tr.receiver_user_no && !tr.receiver_username && !tr.receiver_email && !tr.receiver_mobile && (
                                      <p className="text-[11px] text-gray-500">User #{tr.receiver_id}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-3 text-[11px] text-gray-400 mt-2">
                                  {tr.source_wallet && <span>From: <span className="text-gray-300">{tr.source_wallet}</span></span>}
                                  {tr.destination_wallet && <span>To: <span className="text-gray-300">{tr.destination_wallet}</span></span>}
                                  {tr.note && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {tr.note}</span>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-3 space-y-2">
                {paginatedTransfers.map((tr) => (
                  <InlineTransferCard key={`${tr.dir}-${tr.id}`} tr={tr} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-3 md:p-4 border-t border-white/10">
                <div className="text-xs text-gray-400">Page {historyPage} of {totalHistoryPages} • {totalHistory} records</div>
                <div className="flex items-center gap-2">
                  <button disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-40 hover:border-white/20"><ChevronLeft size={16} /></button>
                  <button disabled={historyPage >= totalHistoryPages} onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-40 hover:border-white/20"><ChevronRight size={16} /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
