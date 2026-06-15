import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { Key, Lock, Eye, Wallet } from 'lucide-react';

export default function Privacy() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const privacyFeatures = [
    {
      icon: Key,
      title: 'No Private Key Access',
      description: 'Oxford Financial Ads never has access to your private keys. Your wallet remains fully under your control at all times.'
    },
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'All communication between your wallet and smart contracts is encrypted using industry-standard protocols.'
    },
    {
      icon: Eye,
      title: 'Blockchain Transparency',
      description: 'All transactions are publicly verifiable on-chain while maintaining user pseudonymity through wallet addresses.'
    },
    {
      icon: Wallet,
      title: 'Wallet-based Authentication',
      description: 'Sign in with your Web3 wallet. No email, password, or personal information required for platform access.'
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
          <div className="inline-block px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-6">
            <span className="text-sm font-semibold text-green-400 uppercase tracking-wider">Privacy & Data Protection</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Your Data, <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Your Control</span>
          </h2>
        </motion.div>

        {/* Privacy Features */}
        <div className="grid md:grid-cols-2 gap-6">
          {privacyFeatures.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-green-500/50 transition-all duration-300"
            >
              <div className="flex md:flex-row flex-col md:items-start items-center md:text-left text-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Privacy Statement */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-blue-900/20 to-green-900/20 backdrop-blur-xl border border-green-500/30"
        >
          <h3 className="text-2xl font-bold mb-4 text-center">Decentralized Privacy Architecture</h3>
          <p className="text-gray-300 leading-relaxed text-center max-w-3xl mx-auto">
            Unlike traditional fintech platforms, Oxford Financial Ads operates on a fully decentralized, non-custodial model. 
            We do not collect, store, or process personal information. All interactions occur directly between your wallet 
            and blockchain smart contracts. Your trading activity is pseudonymous and recorded only on the public blockchain, 
            ensuring maximum privacy while maintaining complete transparency and auditability.
          </p>
        </motion.div> */}
      </div>
    </section>
  );
}
