import { motion } from "framer-motion";
import { useInView } from 'react-intersection-observer';

export default function ExecutiveSummary() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative p-12 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-600/10 to-cyan-600/10 blur-xl"></div>
          
          <div className="relative z-10">
            <div className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
              <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Executive Summary</span>
            </div>
            
            <p className="text-[20px] leading-relaxed text-gray-300">
              <span className="text-2xl font-semibold text-white">Oxford Financial Ads</span> represents a paradigm shift in decentralized finance infrastructure, 
              combining <span className="text-cyan-400 font-medium">advanced artificial intelligence</span> with the robust security and efficiency of 
              <span className="text-blue-400 font-medium"> Arbitrum Layer-2 technology</span>. Our platform delivers institutional-grade automated trading 
              solutions through a <span className="text-white font-medium">fully non-custodial architecture</span>, ensuring users maintain complete control 
              over their assets while benefiting from sophisticated AI-driven market strategies. Built on a foundation of decentralized principles, 
              transparent operations, and rigorous security standards, Oxford Financial Ads provides sustainable automation for the next generation of digital asset management.
            </p>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'AI-Powered', value: 'Arbi-Core' },
                { label: 'Network', value: 'Arbitrum L2' },
                { label: 'Security', value: 'Non-Custodial' },
                { label: 'Architecture', value: 'Decentralized' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="text-center px-3 py-4 sm:p-4 rounded-xl bg-white/5 border border-white/10 min-h-[104px] flex flex-col justify-center"
                >
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">
                    {item.label}
                  </div>
                  <div className="font-semibold text-[12px] sm:text-[13px] md:text-[14px] text-white leading-tight break-normal">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
