import { motion } from 'motion/react';
import { Eye } from 'lucide-react';

export function InvestmentsTable({ investments, onViewDetails }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Package</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Start Date</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Expected Profit</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Profit Paid</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {investments.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                  No investments found
                </td>
              </tr>
            ) : (
              investments.map((investment, index) => (
                <motion.tr
                  key={investment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 md:px-6 py-4">
                    <div>
                      <div className="font-semibold text-white">{investment.userName}</div>
                      <div className="text-xs text-gray-400">{investment.userEmail}</div>
                    </div>
                  </td>

                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-cyan-400 font-semibold">
                      {investment.packageName}
                    </span>
                  </td>

                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-purple-400 font-semibold">
                      {investment.tierName}
                    </span>
                  </td>

                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-white">
                      ${investment.amount.toLocaleString()}
                    </span>
                    <div className="text-xs text-gray-400">USDT</div>
                  </td>

                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {investment.startDate}
                  </td>

                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-green-400">
                      ${investment.expectedProfit.toLocaleString()}
                    </span>
                    <div className="text-xs text-gray-400">
                      {investment.roi}% ROI
                    </div>
                  </td>

                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-blue-400">
                      ${investment.profitPaid.toLocaleString()}
                    </span>
                    <div className="text-xs text-gray-400">
                      {((investment.profitPaid / investment.expectedProfit) * 100).toFixed(1)}%
                    </div>
                  </td>

                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        investment.status === 'active'
                          ? 'text-green-400 bg-green-500/10 border-green-500/30'
                          : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
                      }`}
                    >
                      {investment.status.charAt(0).toUpperCase() +
                        investment.status.slice(1)}
                    </span>
                  </td>

                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onViewDetails(investment)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-600/30 transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}
