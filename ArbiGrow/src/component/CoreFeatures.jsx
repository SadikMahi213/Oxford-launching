import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'react-i18next';
import { Lock, TrendingUp, Boxes, Gauge, ShieldCheck } from 'lucide-react';

export default function CoreFeatures() {
  const { t } = useTranslation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const features = [
    {
      icon: Lock,
      title: t("coreFeatures.feature1Title"),
      description: t("coreFeatures.feature1Desc"),
      color: 'blue'
    },
    {
      icon: TrendingUp,
      title: t("coreFeatures.feature2Title"),
      description: t("coreFeatures.feature2Desc"),
      color: 'cyan'
    },
    {
      icon: Boxes,
      title: t("coreFeatures.feature3Title"),
      description: t("coreFeatures.feature3Desc"),
      color: 'blue'
    },
    {
      icon: Gauge,
      title: t("coreFeatures.feature4Title"),
      description: t("coreFeatures.feature4Desc"),
      color: 'cyan'
    },
    {
      icon: ShieldCheck,
      title: t("coreFeatures.feature5Title"),
      description: t("coreFeatures.feature5Desc"),
      color: 'blue'
    }
  ];

  const stats = [
    { value: t("coreFeatures.stat1Value"), label: t("coreFeatures.stat1Label") },
    { value: t("coreFeatures.stat2Value"), label: t("coreFeatures.stat2Label") },
    { value: t("coreFeatures.stat3Value"), label: t("coreFeatures.stat3Label") },
    { value: t("coreFeatures.stat4Value"), label: t("coreFeatures.stat4Label") },
  ];

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">{t("coreFeatures.badge")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("coreFeatures.title")} <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t("coreFeatures.titleHighlight")}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10"
            >
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((stat, idx) => (
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
