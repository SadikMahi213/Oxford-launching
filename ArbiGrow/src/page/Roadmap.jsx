import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle } from "lucide-react";
import { phases } from "../constants/phases.js";

export default function Roadmap() {
  const { t } = useTranslation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6">
            <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
              {t("roadmap.badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("roadmap.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t("roadmap.titleHighlight")}
            </span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500"></div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-4">
            {phases.map((phase, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="relative"
              >
                <div className="flex flex-col items-center mb-8">
                  <div
                    className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                      idx === 0
                        ? "from-blue-600 to-blue-800"
                        : idx === 1
                          ? "from-cyan-600 to-cyan-800"
                          : idx === 2
                            ? "from-purple-600 to-purple-800"
                            : "from-pink-600 to-rose-800"
                    } border-4 border-[#0a0e27] flex items-center justify-center relative z-10`}
                  >
                    <span className="text-xl font-bold">{idx + 1}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-3 uppercase tracking-wider">
                    {phase.phase}
                  </div>
                </div>

                <div
                  className={`p-8 rounded-2xl bg-gradient-to-br ${
                    idx === 0
                      ? "from-blue-900/20 to-blue-950/20 border-blue-500/30"
                      : idx === 1
                        ? "from-cyan-900/20 to-cyan-950/20 border-cyan-500/30"
                        : idx === 2
                          ? "from-purple-900/20 to-purple-950/20 border-purple-500/30"
                          : "from-pink-900/20 to-rose-950/20 border-pink-500/30"
                  } backdrop-blur-xl border`}
                >
                  <h3 className="text-2xl font-bold mb-6 text-center">
                    {phase.title}
                  </h3>

                  <ul className="space-y-3">
                    {phase.items.map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        className="flex items-start gap-3 text-gray-300"
                      >
                        {idx === 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle
                            className={`w-5 h-5 ${
                              idx === 1
                                ? "text-cyan-400"
                                : idx === 2
                                  ? "text-purple-400"
                                  : "text-pink-400"
                            } flex-shrink-0 mt-0.5`}
                          />
                        )}
                        <span className="text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>

                  {idx === 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-semibold">{t("roadmap.inProgress")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
