import { useTranslation } from 'react-i18next';
import { TrendingUp, RefreshCw } from 'lucide-react';

export function MarketHeader({ lastUpdated, onRefresh, loading, wsStatus }) {
  const { t } = useTranslation();

  const fmtTime = (d) =>
    d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;

  const dotClass = {
    open:       'bg-green-400',
    connecting: 'bg-yellow-400 animate-pulse',
    error:      'bg-red-400 animate-pulse',
  }[wsStatus] ?? 'bg-gray-400';

  const statusLabel = {
    open:       t("marketHeader.live"),
    connecting: t("marketHeader.connecting"),
    error:      t("marketHeader.reconnecting"),
  }[wsStatus] ?? t("marketHeader.offline");

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {t("marketHeader.title")}
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
              <span className="text-gray-400 text-xs">{statusLabel}</span>
              {lastUpdated && (
                <span className="text-gray-600 text-xs">· {fmtTime(lastUpdated)}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t("marketHeader.refresh")}
        </button>
      </div>
    </div>
  );
}
