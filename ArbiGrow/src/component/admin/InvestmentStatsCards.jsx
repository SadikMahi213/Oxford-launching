import { motion } from 'motion/react';
import { Package, TrendingUp, CheckCircle, DollarSign, Wallet } from 'lucide-react';

export function InvestmentStatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
      >
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-5 h-5 text-blue-400" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Total Investments
          </span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.total}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
      >
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Active
          </span>
        </div>
        <div className="text-2xl font-bold text-green-400">{stats.active}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20"
      >
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="w-5 h-5 text-cyan-400" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Completed
          </span>
        </div>
        <div className="text-2xl font-bold text-cyan-400">{stats.completed}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
      >
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-5 h-5 text-blue-400" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Total Invested
          </span>
        </div>
        <div className="text-2xl font-bold text-blue-400">
          ${stats.totalInvested.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 mt-1">USDT</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
      >
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-5 h-5 text-purple-400" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Profit Distributed
          </span>
        </div>
        <div className="text-2xl font-bold text-purple-400">
          ${stats.totalProfitPaid.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 mt-1">USDT</div>
      </motion.div>

    </div>
  );
}