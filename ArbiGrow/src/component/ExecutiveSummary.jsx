import { motion } from "framer-motion";
import { useInView } from 'react-intersection-observer';
import { useTranslation } from "react-i18next";

export default function ExecutiveSummary() {
  const { t } = useTranslation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  return (
    <section ref={ref} className="py-20 px-2 sm:px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative p-4 md:p-12 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-600/10 to-cyan-600/10 blur-xl"></div>
          
          <div className="relative z-10">
            <div className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
              <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">{t("home.executiveSummary.badge")}</span>
            </div>
            
            <p className="text-[20px] leading-relaxed text-gray-300">
              {t("home.executiveSummary.paragraph")}
            </p>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: t("home.executiveSummary.activities"), value: t("home.executiveSummary.activitiesVal") },
                { label: t("home.executiveSummary.network"), value: t("home.executiveSummary.networkVal") },
                { label: t("home.executiveSummary.opportunities"), value: t("home.executiveSummary.opportunitiesVal") },
                { label: t("home.executiveSummary.goal"), value: t("home.executiveSummary.goalVal") }
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
