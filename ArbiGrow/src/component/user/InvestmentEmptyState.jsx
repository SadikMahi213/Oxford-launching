import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';

export function InvestmentEmptyState({ onBrowsePackages }) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center">
        <Package className="w-10 h-10 text-cyan-400" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">
        {t("investmentEmptyState.title")}
      </h3>

      <p className="text-gray-400 mb-6">
        {t("investmentEmptyState.description")}
      </p>

      <button
        onClick={onBrowsePackages}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all"
      >
        {t("investmentEmptyState.browsePackages")}
      </button>
    </div>
  );
}
