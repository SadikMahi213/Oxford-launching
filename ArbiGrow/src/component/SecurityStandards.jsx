import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Lock,
  Eye,
  KeyRound,
  TrendingUp,
  ShieldAlert,
  Zap,
  Globe,
  CheckCircle2,
} from "lucide-react";

export function SecurityStandards() {
  const { t } = useTranslation();
  const features = [
    {
      icon: KeyRound,
      title: t("securityStandards.feature1Title"),
      subtitle: t("securityStandards.feature1Sub"),
      description: t("securityStandards.feature1Desc"),
      gradient: "from-blue-600/20 to-cyan-600/20",
      border: "border-blue-500/30",
      iconColor: "text-cyan-400",
    },
    {
      icon: TrendingUp,
      title: t("securityStandards.feature2Title"),
      subtitle: t("securityStandards.feature2Sub"),
      description: t("securityStandards.feature2Desc"),
      gradient: "from-emerald-600/20 to-teal-600/20",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-400",
    },
    {
      icon: ShieldAlert,
      title: t("securityStandards.feature3Title"),
      subtitle: t("securityStandards.feature3Sub"),
      description: t("securityStandards.feature3Desc"),
      gradient: "from-amber-600/20 to-orange-600/20",
      border: "border-amber-500/30",
      iconColor: "text-amber-400",
    },
    {
      icon: Zap,
      title: t("securityStandards.feature4Title"),
      subtitle: t("securityStandards.feature4Sub"),
      description: t("securityStandards.feature4Desc"),
      gradient: "from-purple-600/20 to-violet-600/20",
      border: "border-purple-500/30",
      iconColor: "text-purple-400",
    },
  ];

  const badges = [
    { icon: Lock, label: t("securityStandards.badge1") },
    { icon: KeyRound, label: t("securityStandards.badge2") },
    { icon: Eye, label: t("securityStandards.badge3") },
    { icon: ShieldCheck, label: t("securityStandards.badge4") },
  ];

  return (
    <section className="relative py-8 md:py-12 px-2 sm:px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-[600px] h-[600px] bg-blue-500/4 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/2 rounded-full blur-3xl"></div>
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-sm uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-6">
            <Lock className="w-4 h-4" />
            {t("securityStandards.badge")}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 max-w-4xl mx-auto">
            {t("securityStandards.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t("securityStandards.titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto leading-relaxed mb-8 px-2">
            {t("securityStandards.description")}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {badges.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all duration-300"
              >
                <b.icon className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-300 font-medium whitespace-nowrap">
                  {b.label}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-sm text-gray-500 tracking-wider"
          >
            {t("securityStandards.motto")}
          </motion.p>
        </motion.div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2 mt-16">
          {features.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.12 }}
              className="group relative"
            >
              <div className="relative h-full p-4 md:p-7 lg:p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden">
                <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative flex gap-5">
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} ${item.border} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-sm text-cyan-400/80 font-medium mb-3">
                      {item.subtitle}
                    </p>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
