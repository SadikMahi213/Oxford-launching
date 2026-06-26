import { useState } from "react";
import { motion } from "motion/react";
import { Search, Send, User, ArrowLeft, Loader, CheckCircle, AlertCircle, Award } from "lucide-react";
import { transferMatchingBonus, searchUsers } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";
import KycWarningBanner from "./KycWarningBanner.jsx";
import { useTranslation } from "react-i18next";

export default function MatchingBonusTransfer({ setActivePage }) {
  const { t } = useTranslation();
  const { user, setUser } = useUserStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null);
  const [transferChargePercent, setTransferChargePercent] = useState(5);
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const matchingBonusBalance = Number(user?.matching_bonus_wallet || 0);

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
        setMsg(t("matchingBonusTransfer.err_self"));
      } else {
        setMsg(t("matchingBonusTransfer.err_noUser", { query: q }));
      }
    } catch (err) {
      setMsg(t("matchingBonusTransfer.err_search", { error: err?.response?.data?.detail || err.message }));
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchedUser) return;
    const kycStatus = user?.kyc_status;
    if (!kycStatus || kycStatus !== "approved") {
      setMsg("KYC verification required. Please complete KYC verification before transferring.");
      return;
    }
    setLoading(true);
    setMsg("");
    setIsSuccess(false);
    try {
      const res = await transferMatchingBonus({
        recipient: searchedUser.email,
        amount: parseFloat(amount),
        note: note || undefined,
      });
      setUser({ matching_bonus_wallet: res.data.new_mb_balance });
      setMsg(t("matchingBonusTransfer.success", { amount, name: searchedUser.full_name }));
      setIsSuccess(true);
      setAmount("");
      setNote("");
      setRecipient("");
      setSearchedUser(null);
    } catch (err) {
      setMsg(err.response?.data?.detail || t("matchingBonusTransfer.err_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen p-4 md:p-6">
      <div className="max-w-xl mx-auto">
        <KycWarningBanner />
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setActivePage?.("overview")} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center">
            <Award className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t("matchingBonusTransfer.title")}</h1>
            <p className="text-sm text-gray-400">{t("matchingBonusTransfer.subtitle")}</p>
          </div>
        </div>

        <div className="mb-4 p-4 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center gap-3">
          <Award className="w-5 h-5 text-purple-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-400">{t("matchingBonusTransfer.available")}</p>
            <p className="text-lg font-bold text-white">${matchingBonusBalance.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 space-y-4">
            <label className="block text-sm text-gray-400">{t("matchingBonusTransfer.searchLabel")}</label>
            <div className="flex gap-2">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={t("matchingBonusTransfer.search_plh")}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !recipient.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 flex items-center gap-2"
              >
                {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {t("matchingBonusTransfer.search")}
              </button>
            </div>

            {searchedUser && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{searchedUser.full_name}</p>
                  <p className="text-xs text-gray-400">{searchedUser.email}</p>
                </div>
              </motion.div>
            )}
          </div>

          {searchedUser && (
            <form onSubmit={handleSubmit} className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t("matchingBonusTransfer.amount")}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t("matchingBonusTransfer.amount_plh")}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">USDT</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t("matchingBonusTransfer.available_balance", { balance: matchingBonusBalance.toFixed(2) })}</p>
              </div>

              {amount > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{t("matchingBonusTransfer.transferAmount")}</span>
                    <span className="text-white">${Number(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>{t("matchingBonusTransfer.charge", { percentage: transferChargePercent })}</span>
                    <span className="text-amber-400">-${(Number(amount) * transferChargePercent / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-sm">
                    <span className="text-gray-300 font-semibold">{t("matchingBonusTransfer.receiverGets")}</span>
                    <span className="text-green-400 font-bold">${(Number(amount) * (1 - transferChargePercent / 100)).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">{t("matchingBonusTransfer.note")}</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("matchingBonusTransfer.note_plh")}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {msg && (
                <p className={`flex items-center gap-2 text-sm ${isSuccess ? "text-emerald-400" : "text-red-400"}`}>
                  {isSuccess ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {msg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? t("matchingBonusTransfer.transferring") : t("matchingBonusTransfer.transfer", { amount: amount || "0" })}
              </button>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}