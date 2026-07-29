import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'react-i18next';
import { Building2, FileText, AlertCircle, Scale } from 'lucide-react';

export default function Legal() {
  const { t } = useTranslation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const legalItems = [
    {
      icon: Building2,
      title: t("legalHome.item1Title"),
      description: t("legalHome.item1Desc")
    },
    {
      icon: FileText,
      title: t("legalHome.item2Title"),
      description: t("legalHome.item2Desc")
    },
    {
      icon: AlertCircle,
      title: t("legalHome.item3Title"),
      description: t("legalHome.item3Desc")
    },
    {
      icon: Scale,
      title: t("legalHome.item4Title"),
      description: t("legalHome.item4Desc")
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
          <div className="inline-block px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
            <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">{t("legalHome.badge")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t("legalHome.title")}</span> {t("legalHome.titleHighlight")}
          </h2>
        </motion.div>

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
              <h3 className="text-xl font-bold mb-3 text-red-400">{t("legalHome.riskTitle")}</h3>
              <p className="text-gray-300 leading-relaxed mb-4">{t("legalHome.riskText1")}</p>
              <p className="text-sm text-gray-400">{t("legalHome.riskText2")}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
