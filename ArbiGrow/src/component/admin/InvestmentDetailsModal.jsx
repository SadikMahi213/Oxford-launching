import { motion, AnimatePresence } from 'motion/react';
import { X, User, Package, TrendingUp, Plus, CheckCircle } from 'lucide-react';

export function InvestmentDetailsModal({ investment, onClose, onAddProfit }) {
  if (!investment) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="sticky top-0 bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border-b border-white/10 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-white">Investment Details</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6">

            {/* User Information */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                User Information
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Name</div>
                  <div className="text-white font-semibold">{investment.userName}</div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Email</div>
                  <div className="text-white font-semibold break-all">{investment.userEmail}</div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">User ID</div>
                  <div className="text-white font-semibold font-mono">{investment.userNo || investment.userId}</div>
                </div>
              </div>
            </div>

            {/* Investment Information */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                Investment Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4">

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Package Name</div>
                  <div className="text-cyan-400 font-bold">{investment.packageName}</div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Invested Amount</div>
                  <div className="text-white font-bold">
                    ${investment.amount.toLocaleString()} USDT
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Start Date</div>
                  <div className="text-white font-semibold">{investment.startDate}</div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">ROI</div>
                  <div className="text-green-400 font-bold text-xl">
                    {investment.roi}%
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Expected Profit</div>
                  <div className="text-green-400 font-bold">
                    ${investment.expectedProfit.toLocaleString()} USDT
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30">
                  <div className="text-xs text-gray-400 mb-1">Profit Paid</div>
                  <div className="text-blue-400 font-bold">
                    ${investment.profitPaid.toLocaleString()} USDT
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30">
                  <div className="text-xs text-gray-400 mb-1">Remaining Profit</div>
                  <div className="text-purple-400 font-bold">
                    ${(investment.expectedProfit - investment.profitPaid).toLocaleString()} USDT
                  </div>
                </div>

              </div>
            </div>

            {/* Add Profit Button */}
            {investment.status === 'active' &&
              investment.profitPaid < investment.expectedProfit && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                  <div className="flex items-center justify-between">

                    <div>
                      <h4 className="font-bold text-white mb-1">
                        Distribute Profit
                      </h4>
                      <p className="text-sm text-gray-400">
                        Manually add profit to user's main wallet
                      </p>
                    </div>

                    <button
                      onClick={onAddProfit}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Profit
                    </button>

                  </div>
                </div>
              )}

            {/* Profit History */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Profit History
              </h3>

              {investment.profitHistory.length === 0 ? (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400">
                  No profit distributions yet
                </div>
              ) : (
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                          Amount (USDT)
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {investment.profitHistory.map((profit) => (
                        <tr key={profit.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-sm text-white">
                            {profit.date}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-green-400">
                            ${profit.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center">
              <span
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${
                  investment.status === 'active'
                    ? 'text-green-400 bg-green-500/10 border-green-500/30'
                    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
                }`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {investment.status === 'active'
                  ? 'Investment Active'
                  : 'Investment Completed'}
              </span>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
