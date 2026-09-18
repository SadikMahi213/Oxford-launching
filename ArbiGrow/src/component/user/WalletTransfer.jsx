import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeftRight, ArrowRight, Wallet, Coins, Users, TrendingUp, ShoppingCart, Pickaxe, Clock, Keyboard, Eye, Award } from "lucide-react";
import { walletTransfer } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";

const FROM_WALLET_OPTIONS = [
  { value: "main_wallet", labelKey: "walletTransfer.walletMain", icon: Wallet, currency: "USDT" },
  { value: "referral_wallet", labelKey: "walletTransfer.walletReferral", icon: Users, currency: "USDT" },
  { value: "generation_wallet", labelKey: "walletTransfer.walletGeneration", icon: TrendingUp, currency: "USDT" },
  { value: "matching_bonus_wallet", labelKey: "walletTransfer.walletMatchingBonus", icon: Award, currency: "USDT" },
  { value: "ecommerce_wallet", labelKey: "walletTransfer.walletEcommerce", icon: ShoppingCart, currency: "USDT" },
  { value: "captcha_wallet", labelKey: "walletTransfer.walletCaptcha", icon: Keyboard, currency: "USDT" },
  { value: "ad_view_wallet", labelKey: "walletTransfer.walletAdView", icon: Eye, currency: "USDT" },
];

const TO_WALLET_OPTIONS = [
  { value: "main_wallet", labelKey: "walletTransfer.walletMain", icon: Wallet, currency: "USDT" },
  { value: "deposit_wallet", labelKey: "walletTransfer.walletDeposit", icon: Wallet, currency: "USDT" },
];

const walletBalances = (user) => ({
  main_wallet: Number(user?.main_wallet ?? 0),
  deposit_wallet: Number(user?.deposit_wallet ?? 0),
  referral_wallet: Number(user?.referral_wallet ?? 0),
  generation_wallet: Number(user?.generation_wallet ?? 0),
  matching_bonus_wallet: Number(user?.matching_bonus_wallet ?? 0),
  ecommerce_wallet: Number(user?.ecommerce_wallet ?? 0),
  captcha_wallet: Number(user?.captcha_wallet ?? 0),
  ad_view_wallet: Number(user?.ad_view_wallet ?? 0),
});

export default function WalletTransfer() {
  const { t } = useTranslation();
  const { user, setUser } = useUserStore();
  const balances = walletBalances(user);
  const [fromWallet, setFromWallet] = useState("referral_wallet");
  const [toWallet, setToWallet] = useState("main_wallet");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const fromWalletData = FROM_WALLET_OPTIONS.find((w) => w.value === fromWallet);
  const toWalletData = TO_WALLET_OPTIONS.find((w) => w.value === toWallet);

  const walletLabel = (w) => (w ? t(w.labelKey) : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (!amount || parseFloat(amount) <= 0) {
      setMessage(t('walletTransfer.err_amount'));
      return;
    }
    if (parseFloat(amount) > balances[fromWallet]) {
      setMessage(t('walletTransfer.err_balance'));
      return;
    }

    try {
      setLoading(true);
      const res = await walletTransfer({
        from_wallet: fromWallet,
        to_wallet: toWallet,
        amount: parseFloat(amount),
      });

      setUser({
        ...user,
        [fromWallet]: res.data.from_balance,
        [toWallet]: res.data.to_balance,
      });

      setMessage(res.data.message);
      setIsSuccess(true);
      setAmount("");
    } catch (err) {
      const msg = err.response?.data?.detail || t('walletTransfer.err_failed');
      setMessage(msg);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen p-4 md:p-6"
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center">
            <ArrowLeftRight className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('walletTransfer.title')}</h1>
            <p className="text-sm text-gray-400">{t('walletTransfer.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">{t('walletTransfer.from')}</label>
              <select
                value={fromWallet}
                onChange={(e) => setFromWallet(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50 appearance-none"
              >
                {FROM_WALLET_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value} className="bg-gray-900">
                    {walletLabel(w)} (${balances[w.value].toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center md:col-span-1">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">{t('walletTransfer.to')}</label>
              <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-between">
                <span>{walletLabel(toWalletData)}</span>
                <span className="text-sm text-gray-400">${balances[toWallet].toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{t('walletTransfer.fromBalance')}</span>
              <span className="text-sm text-white font-medium">
                ${balances[fromWallet].toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{t('walletTransfer.toBalance')}</span>
              <span className="text-sm text-white font-medium">
                ${balances[toWallet].toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('walletTransfer.amount')}</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('walletTransfer.amount_plh')}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:outline-none focus:border-cyan-500/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">USDT</span>
            </div>
          </div>

          {message && (
            <p className={`text-center text-sm ${isSuccess ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? t('walletTransfer.transferring') : t('walletTransfer.transfer')}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
