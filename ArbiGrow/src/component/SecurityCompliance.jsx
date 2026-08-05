import { motion } from "motion/react";
import { Shield, Target, HeartHandshake, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export function SecurityCompliance() {
  const { t } = useTranslation();
  const commitments = [
    {
      icon: Shield,
      label: t("home.securityCompliance.card1Label"),
      sublabel: t("home.securityCompliance.card1Sub"),
    },
    {
      icon: Target,
      label: t("home.securityCompliance.card2Label"),
      sublabel: t("home.securityCompliance.card2Sub"),
    },
    {
      icon: HeartHandshake,
      label: t("home.securityCompliance.card3Label"),
      sublabel: t("home.securityCompliance.card3Sub"),
    },
    {
      icon: TrendingUp,
      label: t("home.securityCompliance.card4Label"),
      sublabel: t("home.securityCompliance.card4Sub"),
    },
  ];

  return (
    <section className="relative py-8 md:py-12 px-2 sm:px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-blue-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 relative"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400 font-semibold mb-4">
            {t("home.securityCompliance.badge")}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.securityCompliance.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.securityCompliance.titleHighlight")}
            </span>
          </h2>
        </motion.div>

        {/* Commitment Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {commitments.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative p-4 md:p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 text-center"
            >
              {/* Glow effect */}
              <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{item.label}</h3>
                  <p className="text-xs text-gray-400">{item.sublabel}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>


        {/* Commitment Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative p-4 md:p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-40"></div>
          <div className="relative">
            <div className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
              <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">{t("home.securityCompliance.statementBadge")}</span>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed">
              {t("home.securityCompliance.statement")}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
