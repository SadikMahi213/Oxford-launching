import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Repeat, Coins, Wallet } from "lucide-react";
import { convertOFAtoUSDT, getOFAConversionRate } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";
import KycWarningBanner from "./KycWarningBanner.jsx";

export default function ConvertOFA() {
  const { t } = useTranslation();
  const { user, setUser } = useUserStore();
  const [ofaAmount, setOfaAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [conversionRate, setConversionRate] = useState(null);

  const arbxBalance = Number(user?.arbx_wallet ?? 0);
  const mainBalance = Number(user?.main_wallet ?? 0);
  const usdtAmount = ofaAmount ? (parseFloat(ofaAmount) * (conversionRate || 0)) : 0;

  useEffect(() => {
    let active = true;
    getOFAConversionRate()
      .then((res) => {
        if (active) setConversionRate(Number(res.data?.ofa_to_usdt_rate));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (!ofaAmount || parseFloat(ofaAmount) <= 0) {
      setMessage(t('convertOFA.err_amount'));
      return;
    }
    if (parseFloat(ofaAmount) > arbxBalance) {
      setMessage(t('convertOFA.err_balance'));
      return;
    }

    try {
      setLoading(true);
      const res = await convertOFAtoUSDT({ ofa_amount: parseFloat(ofaAmount) });

      setUser({
        ...user,
        arbx_wallet: res.data.arbx_wallet_balance,
        main_wallet: res.data.main_wallet_balance,
      });

      setMessage(res.data.message);
      setIsSuccess(true);
      setOfaAmount("");
    } catch (err) {
      const msg = err.response?.data?.detail || t('convertOFA.err_failed');
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
      <KycWarningBanner />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center">
            <Repeat className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('convertOFA.title')}</h1>
            <p className="text-sm text-gray-400">{t('convertOFA.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Coins className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-sm text-gray-400">{t('convertOFA.ofaBalance')}</div>
                <div className="text-xl font-bold text-white">{arbxBalance.toFixed(7)} OFA</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-sm text-gray-400">{t('convertOFA.usdtBalance')}</div>
                <div className="text-xl font-bold text-white">${mainBalance.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-center mb-2">
              <span className="text-sm text-gray-400">{t('convertOFA.rate')}</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-lg">
              <span className="text-yellow-400 font-semibold">1 OFA</span>
              <Repeat className="w-5 h-5 text-cyan-400" />
              <span className="text-green-400 font-semibold">
                {conversionRate != null ? `${conversionRate} USDT` : "—"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('convertOFA.ofaAmount')}</label>
            <div className="relative">
              <input
                type="number"
                step="0.0000001"
                min="0"
                value={ofaAmount}
                onChange={(e) => setOfaAmount(e.target.value)}
                placeholder={t('convertOFA.amount_plh')}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:outline-none focus:border-cyan-500/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">OFA</span>
            </div>
          </div>

          {ofaAmount > 0 && (
            <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-center">
              <span className="text-sm text-gray-400">{t('convertOFA.youReceive')} </span>
              <span className="text-lg font-bold text-green-400">${usdtAmount.toFixed(6)} USDT</span>
            </div>
          )}

          {message && (
            <p className={`text-center text-sm ${isSuccess ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? t('convertOFA.converting') : t('convertOFA.convert')}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
