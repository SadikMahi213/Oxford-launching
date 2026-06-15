import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { Building2, FileText, AlertCircle, Scale } from 'lucide-react';

export default function Legal() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const legalItems = [
    {
      icon: Building2,
      title: 'C-Corporation (Delaware)',
      description: 'Registered corporate entity under Delaware General Corporation Law, providing legal clarity and investor protection.'
    },
    {
      icon: FileText,
      title: 'AML & KYC Compliance',
      description: 'Anti-Money Laundering and Know Your Customer procedures implemented in accordance with applicable regulatory frameworks.'
    },
    {
      icon: AlertCircle,
      title: 'Non-Financial Advisory Disclaimer',
      description: 'Oxford Financial Ads does not provide investment advice, financial planning, or portfolio management services. Users trade at their own discretion.'
    },
    {
      icon: Scale,
      title: 'Decentralized Responsibility Clause',
      description: 'Smart contracts operate autonomously. Users maintain full responsibility for their trading decisions and outcomes.'
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
          <div className="inline-block px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
            <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Legal & Compliance</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Regulatory Framework</span> & Transparency
          </h2>
        </motion.div>

        {/* Legal Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {legalItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10"
            >
              <div className="flex md:flex-row flex-col md:items-start items-center md:text-left text-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Risk Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative p-8 rounded-2xl bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-xl border border-red-500/30"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-3 text-red-400">Investment Risk Warning</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Trading digital assets involves substantial risk and may result in partial or total loss of capital. Past performance 
                does not guarantee future results. Oxford Financial Ads' AI algorithms are probabilistic models and cannot predict market outcomes 
                with certainty. Users should only allocate capital they can afford to lose and should conduct independent research before 
                engaging with the platform.
              </p>
              <p className="text-sm text-gray-400">
                This platform is not available to residents of restricted jurisdictions. Users are responsible for compliance with local 
                laws and regulations.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
