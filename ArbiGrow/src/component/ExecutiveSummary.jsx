import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function ExecutiveSummary() {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-2 sm:px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative p-6 sm:p-10 md:p-14 rounded-[2.5rem] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-hidden group"
        >
          {/* Subtle animated background glow */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-1000"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/20 transition-all duration-1000"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            
            {/* Left Column: Badge & Text */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-4 w-fit">
                {t("home.executiveSummary.badge")}
              </div>
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                About <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Oxford Financial Ads</span>
              </h2>
              
              <div className="relative">
                {/* Decorative Quote Mark */}
                <div className="absolute -top-6 -left-4 text-7xl text-cyan-500/20 font-serif leading-none select-none pointer-events-none">
                  "
                </div>
                <p className="relative z-10 text-base sm:text-lg md:text-xl leading-relaxed text-gray-300 font-light text-left">
                  {t("home.executiveSummary.paragraph")}
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Stats/Features Grid */}
          <div className="relative z-10 mt-12 pt-10 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { label: t("home.executiveSummary.activities"), value: t("home.executiveSummary.activitiesVal") },
              { label: t("home.executiveSummary.network"), value: t("home.executiveSummary.networkVal") },
              { label: t("home.executiveSummary.opportunities"), value: t("home.executiveSummary.opportunitiesVal") },
              { label: t("home.executiveSummary.goal"), value: t("home.executiveSummary.goalVal") }
            ].map((item, idx) => (
              <div
                key={idx}
                className="group/stat relative p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-center"
              >
                {/* Subtle top accent line on hover */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent group-hover/stat:w-1/2 transition-all duration-500"></div>
                
                <div className="text-xs text-cyan-400/80 uppercase tracking-wider mb-2 font-semibold">
                  {item.label}
                </div>
                <div className="font-bold text-sm sm:text-base text-white leading-tight">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

        </motion.div>
      </div>
    </section>
  );
}
