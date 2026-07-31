import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

const TransactionHistoryPage = ({
  currentTransactions,
  transactionFilter,
  setTransactionFilter,
  currentPage,
  setCurrentPage,
  totalPages,
  filteredTransactions,
  startIndex,
  endIndex,
  getStatusColor,
  isLoading,
}) => {
  const { t } = useTranslation();
  const getAmountMeta = (transaction) => {
    const explicitDirection = transaction.amountDirection;
    const isDebit =
      explicitDirection === "debit" ||
      (!explicitDirection &&
        transaction.type.toLowerCase().includes("withdrawal"));

    return {
      isDebit,
      amountClassName: isDebit ? "text-red-300" : "text-emerald-300",
      prefix: isDebit ? "-" : "+",
    };
  };

  const renderAmount = (transaction, alignRight = false) => {
    const { amountClassName, prefix } = getAmountMeta(transaction);

    return (
      <div
        className={`flex items-center gap-2 font-semibold ${amountClassName} ${
          alignRight ? "justify-end" : ""
        }`}
      >
        <span>{`${prefix}${transaction.amount}`}</span>
      </div>
    );
  };

  const totalPageCount = Math.max(1, totalPages);
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = totalPages === 0 || currentPage >= totalPages;

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-white/10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                {t('transactions.title')}
              </h2>
              <p className="text-sm text-gray-400">
                {t('transactions.subtitle')}
              </p>
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2">
              <select
                value={transactionFilter}
                onChange={(e) => {
                  setTransactionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#0A122C] border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
              >
                <option value="All">{t('transactions.filter_all')}</option>
                <option value="Deposit">{t('transactions.filter_deposits')}</option>
                <option value="Withdrawal">{t('transactions.filter_withdrawals')}</option>
                <option value="Profit">{t('transactions.filter_profit')}</option>
                <option value="Transfer">{t('transactions.filter_transfer')}</option>
                <option value="Referral">{t('transactions.filter_referral')}</option>
                <option value="Generation">{t('transactions.filter_generation')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="hidden md:block responsive-table-wrapper">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  {t('transactions.date')}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  {t('transactions.txid')}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  {t('transactions.type')}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  {t('transactions.wallet')}
                </th>
                <th className="text-right p-4 text-sm font-semibold text-gray-400">
                  {t('transactions.amount')}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  {t('transactions.currency')}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">
                  {t('transactions.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">{t('transactions.loading')}</p>
                  </td>
                </tr>
              ) : currentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-500 text-sm">
                    {t('transactions.empty')}
                  </td>
                </tr>
              ) : (
              currentTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4 text-gray-400 text-sm">
                    {transaction.date}
                  </td>
                  <td className="p-4 text-gray-300 text-xs font-mono">
                    {transaction.transactionId || "-"}
                  </td>
                  <td className="p-4 text-white text-sm">{transaction.typeLabel || transaction.type}</td>
                  <td className="p-4 text-gray-400 text-sm">
                    {transaction.walletLabel || transaction.wallet}
                  </td>
                  <td className="p-4">
                    {renderAmount(transaction, true)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        transaction.currency === "ARBX"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                          : "bg-green-500/10 text-green-400 border border-green-500/30"
                      }`}
                    >
                      {transaction.currency === "ARBX" ? t("dashboard.ofa_token") : transaction.currency}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(transaction.status)}`}
                    >
                      {transaction.statusLabel || transaction.status}
                    </span>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">{t('transactions.loading')}</p>
            </div>
          ) : currentTransactions.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm rounded-lg border border-white/10 bg-white/[0.02]">
              {t('transactions.empty')}
            </div>
          ) : (
            currentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {transaction.typeLabel || transaction.type}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {transaction.date}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(transaction.status)}`}
                  >
                    {transaction.statusLabel || transaction.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">{t('transactions.txid')}</p>
                    <p className="text-xs text-gray-300 font-mono break-all">
                      {transaction.transactionId || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('transactions.wallet')}</p>
                    <p className="text-sm text-gray-300">{transaction.walletLabel || transaction.wallet}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">{t('transactions.amount')}</p>
                    {renderAmount(transaction, true)}
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">{t('transactions.currency')}</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        transaction.currency === "ARBX"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                          : "bg-green-500/10 text-green-400 border border-green-500/30"
                      }`}
                    >
                      {transaction.currency === "ARBX" ? t("dashboard.ofa_token") : transaction.currency}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-400">
            {isLoading
              ? t('transactions.loading')
              : filteredTransactions.length === 0
              ? t('transactions.empty')
              : t('transactions.showing', { start: startIndex + 1, end: Math.min(endIndex, filteredTransactions.length), total: filteredTransactions.length })}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={isPrevDisabled}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-400 whitespace-nowrap">
              {t('transactions.page', { current: Math.min(currentPage, totalPageCount), total: totalPageCount })}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={isNextDisabled}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
  );
};

export default TransactionHistoryPage;
