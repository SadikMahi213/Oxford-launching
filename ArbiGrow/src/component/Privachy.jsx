import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'react-i18next';
import { Key, Lock, Eye, Wallet } from 'lucide-react';

export default function Privacy() {
  const { t } = useTranslation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const privacyFeatures = [
    {
      icon: Key,
      title: t("privacyHome.feature1Title"),
      description: t("privacyHome.feature1Desc")
    },
    {
      icon: Lock,
      title: t("privacyHome.feature2Title"),
      description: t("privacyHome.feature2Desc")
    },
    {
      icon: Eye,
      title: t("privacyHome.feature3Title"),
      description: t("privacyHome.feature3Desc")
    },
    {
      icon: Wallet,
      title: t("privacyHome.feature4Title"),
      description: t("privacyHome.feature4Desc")
    }
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
          <div className="inline-block px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-6">
            <span className="text-sm font-semibold text-green-400 uppercase tracking-wider">{t("privacyHome.badge")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("privacyHome.title")} <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t("privacyHome.titleHighlight")}</span>
          </h2>
        </motion.div>

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
      </div>
    </section>
  );
}
