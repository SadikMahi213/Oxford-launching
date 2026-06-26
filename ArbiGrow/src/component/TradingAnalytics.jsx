import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Activity, Zap } from 'lucide-react';

export function TradingAnalytics() {
  const { t } = useTranslation();

  const stats = [
    { icon: Activity, value: '$2.4M', label: t("tradingAnalytics.totalVolume"), change: '+12.5%' },
    { icon: TrendingUp, value: '1,247', label: t("tradingAnalytics.activeTraders"), change: '+8.3%' },
    { icon: DollarSign, value: '$847K', label: t("tradingAnalytics.dailyVolume"), change: '+15.2%' },
    { icon: Zap, value: '98.7%', label: t("tradingAnalytics.successRate"), change: '+2.1%' },
  ];

  const chartData = [
    { x: 'Jan', value: 20 },
    { x: 'Feb', value: 35 },
    { x: 'Mar', value: 45 },
    { x: 'Apr', value: 55 },
    { x: 'May', value: 70 },
    { x: 'Jun', value: 85 },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value));

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400 font-semibold mb-4">
            {t("tradingAnalytics.badge")}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("tradingAnalytics.title")}{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("tradingAnalytics.titleHighlight")}
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4">
                  <stat.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="mb-2">
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative p-8 rounded-2xl bg-gradient-to-br from-blue-900/30 to-blue-950/20 backdrop-blur-xl border border-blue-500/20"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {t("tradingAnalytics.chartTitle")}
              </h3>
              <p className="text-sm text-gray-400">{t("tradingAnalytics.chartSubtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
                {t("tradingAnalytics.returnsLabel")}
              </div>
            </div>
          </div>

          <div className="relative h-64">
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            <div className="ml-12 h-full relative">
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-px bg-white/5"></div>
                ))}
              </div>
              <div className="relative h-full flex items-end justify-around gap-2">
                {chartData.map((data, index) => {
                  const height = (data.value / maxValue) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className="w-full bg-gradient-to-t from-cyan-500/40 to-blue-500/40 rounded-t-lg relative overflow-hidden"
                        style={{ minHeight: '4px' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-400/20 to-blue-400/20"></div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <motion.path
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.3 }}
                  d={`M 0 ${100 - (chartData[0].value / maxValue) * 100} ${chartData
                    .map(
                      (d, i) =>
                        `L ${((i + 1) / chartData.length) * 100} ${100 - (d.value / maxValue) * 100}`
                    )
                    .join(' ')}`}
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="ml-12 mt-4 flex justify-around">
              {chartData.map((data, index) => (
                <span key={index} className="text-xs text-gray-500">{data.x}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">$1.2M</div>
              <div className="text-xs text-gray-400">{t("tradingAnalytics.totalInvested")}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">342</div>
              <div className="text-xs text-gray-400">{t("tradingAnalytics.activePositions")}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">$45K</div>
              <div className="text-xs text-gray-400">{t("tradingAnalytics.avgTradeSize")}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400 mb-1">+24.5%</div>
              <div className="text-xs text-gray-400">{t("tradingAnalytics.totalGain")}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
