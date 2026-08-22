import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, Send, User, ArrowLeft, Loader, CheckCircle, AlertCircle } from "lucide-react";
import { sendFunds, searchUsers, getTransferMinimum } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";
import KycWarningBanner from "./KycWarningBanner.jsx";

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

  useEffect(() => {
    getTransferMinimum()
      .then((res) => {
        setMinTransfer(Number(res?.data?.min_user_transfer_amount) || 0);
        if (res?.data?.currency) setMinCurrency(res.data.currency);
      })
      .catch(() => setMinTransfer(0));
  }, []);

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
    } catch (err) {
      setMsg(err.response?.data?.detail || t('sendFunds.err_failed'));
    } finally {
      setLoading(false);
    }
  };

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
      </div>
    </motion.div>
  );
}
