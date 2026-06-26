import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { CurrencyListItem } from './CurrencyListItem';

export default function CurrencyList({ currencies }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
    >
      <div className="grid grid-cols-[24px_1fr_auto_auto] lg:grid-cols-[24px_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 border-b border-white/10 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <span>{t("currencyList.hash")}</span>
        <span>{t("currencyList.asset")}</span>
        <span className="hidden lg:block text-right">{t("currencyList.volume24h")}</span>
        <span className="text-right">{t("currencyList.price")}</span>
        <span className="text-right w-20">{t("currencyList.change24h")}</span>
      </div>

      <div className="divide-y divide-white/5">
        {currencies.map((currency, idx) => (
          <CurrencyListItem key={currency.id} currency={currency} rank={idx + 1} />
        ))}
      </div>
    </motion.div>
  );
}
