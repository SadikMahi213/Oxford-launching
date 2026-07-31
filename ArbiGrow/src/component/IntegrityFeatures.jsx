import { motion } from "motion/react";
import { Shield, Building2, Users, Handshake, Award } from "lucide-react";
import { useTranslation } from "react-i18next";

const FEATURES = [
  { icon: Shield, key: "principle1" },
  { icon: Building2, key: "principle2" },
  { icon: Users, key: "principle3" },
  { icon: Handshake, key: "principle4" },
  { icon: Award, key: "principle5" },
];

export function IntegrityFeatures() {
  const { t } = useTranslation();

  return (
    <section className="relative py-8 md:py-12 px-2 sm:px-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-[450px] h-[450px] bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-sm uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-6">
            <Shield className="w-4 h-4" />
            {t("home.integrityFeatures.badge")}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.integrityFeatures.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t("home.integrityFeatures.titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto leading-relaxed">
            {t("home.integrityFeatures.description")}
          </p>
        </motion.div>

        {/* Feature list */}
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-5">
          {FEATURES.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="group relative"
            >
              <div className="relative flex items-center gap-4 sm:gap-5 p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 hover:bg-white/[0.09] hover:border-cyan-500/30 transition-all duration-500">
                {/* Teal glow */}
                <div className="absolute -inset-[1px] bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/15 group-hover:to-teal-500/15 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Circular outline icon */}
                <div className="relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 group-hover:border-cyan-400/70 transition-all duration-500">
                  <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
                </div>

                <h3 className="relative flex-1 min-w-0 text-base sm:text-lg md:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors duration-300">
                  {t(`corporateIntegrity.${item.key}`)}
                </h3>

                <div className="relative hidden md:block h-8 w-0.5 bg-gradient-to-b from-cyan-500/0 via-cyan-500/40 to-cyan-500/0 scale-y-0 group-hover:scale-y-100 origin-center transition-transform duration-500"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
