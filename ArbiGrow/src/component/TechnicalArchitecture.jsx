import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import { Layers, Cpu, Zap, Shield, TrendingUp, Database } from "lucide-react";

export default function TechnicalArchitecture() {
  const { t } = useTranslation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const archItems = [
    { icon: Layers, title: t("technicalArchitecture.arch1Title") },
    { icon: Shield, title: t("technicalArchitecture.arch2Title") },
    { icon: Zap, title: t("technicalArchitecture.arch3Title") },
    { icon: TrendingUp, title: t("technicalArchitecture.arch4Title") },
  ];

  const engineItems = [
    { icon: Database, title: t("technicalArchitecture.engine1Title") },
    { icon: Cpu, title: t("technicalArchitecture.engine2Title") },
    { icon: Zap, title: t("technicalArchitecture.engine3Title") },
    { icon: TrendingUp, title: t("technicalArchitecture.engine4Title") },
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
          <div className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6">
            <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              {t("technicalArchitecture.badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("technicalArchitecture.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t("technicalArchitecture.titleHighlight")}
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative p-8 rounded-3xl bg-gradient-to-br from-blue-600/10 to-blue-900/10 backdrop-blur-xl border border-blue-500/30"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 to-transparent blur-xl"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                <Layers className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t("technicalArchitecture.archTitle")}</h3>
              <p className="text-gray-300 mb-8 leading-relaxed">{t("technicalArchitecture.archDesc")}</p>
              <div className="space-y-4">
                {archItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 + idx * 0.1 }}
                    className="flex md:flex-row flex-col items-center md:text-left text-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="font-semibold text-white">{item.title}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative p-8 rounded-3xl bg-gradient-to-br from-cyan-600/10 to-cyan-900/10 backdrop-blur-xl border border-cyan-500/30"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-l from-cyan-500/20 to-transparent blur-xl"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                <Cpu className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4">
                {t("technicalArchitecture.engineTitle")}
              </h3>
              <p className="text-gray-300 mb-8 leading-relaxed">{t("technicalArchitecture.engineDesc")}</p>
              <div className="space-y-4">
                {engineItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 + idx * 0.1 }}
                    className="flex md:flex-row flex-col items-center md:text-left text-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="font-semibold text-white">{item.title}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 relative"
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cyan-400 blur-sm"
          />
        </motion.div>
      </div>
    </section>
  );
}
