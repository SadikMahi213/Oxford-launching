import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { Lock, TrendingUp, Boxes, Gauge, ShieldCheck } from 'lucide-react';

export default function CoreFeatures() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const features = [
    {
      icon: Lock,
      title: 'Non-Custodial Security',
      description: 'Your assets remain in your wallet at all times. Oxford Financial Ads never has access to your private keys or funds.',
      color: 'blue'
    },
    {
      icon: TrendingUp,
      title: 'Yield Optimization',
      description: 'Advanced long/short logic that adapts to market conditions for optimal returns across all market cycles.',
      color: 'cyan'
    },
    {
      icon: Boxes,
      title: 'Scalability Infrastructure',
      description: 'Built on Arbitrum L2 to handle high-frequency trading with unlimited throughput and minimal latency.',
      color: 'blue'
    },
    {
      icon: Gauge,
      title: 'Ultra-Low Latency Execution',
      description: 'Microsecond-level order execution ensures you never miss market opportunities due to slow infrastructure.',
      color: 'cyan'
    },
    {
      icon: ShieldCheck,
      title: 'Advanced Risk Management',
      description: 'Multi-layered risk controls including position limits, volatility monitoring, and automated hedging protocols.',
      color: 'blue'
    }
  ];

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Core Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Enterprise-Grade <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Trading Infrastructure</span>
          </h2>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10"
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/0 to-cyan-600/0 group-hover:from-blue-600/10 group-hover:to-cyan-600/10 transition-all duration-300"></div>
              
              <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                <div className={`w-14 h-14 rounded-xl bg-${feature.color}-500/20 border border-${feature.color}-500/40 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-400`} />
                </div>
                
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: '<1ms', label: 'Execution Speed' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '24/7', label: 'Market Monitoring' },
            { value: '∞', label: 'Scalability' }
          ].map((stat, idx) => (
            <div key={idx} className="text-center p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
