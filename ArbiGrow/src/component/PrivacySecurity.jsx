import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Cpu,
  Wallet,
  AlertTriangle,
  FileText,
  Award,
  Zap,
  RefreshCw,
  CheckCircle2,
  Scale,
} from "lucide-react";

export function PrivacySecurity() {
  const { t } = useTranslation();
  const sections = [
    {
      icon: KeyRound,
      title: t("privacySecurity.section1Title"),
      description: t("privacySecurity.section1Desc"),
      gradient: "from-blue-600/20 to-cyan-600/20",
      border: "border-blue-500/30",
      iconColor: "text-cyan-400",
    },
    {
      icon: Cpu,
      title: t("privacySecurity.section2Title"),
      description: t("privacySecurity.section2Desc"),
      gradient: "from-emerald-600/20 to-teal-600/20",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-400",
    },
    {
      icon: Wallet,
      title: t("privacySecurity.section3Title"),
      description: t("privacySecurity.section3Desc"),
      gradient: "from-amber-600/20 to-orange-600/20",
      border: "border-amber-500/30",
      iconColor: "text-amber-400",
    },
    {
      icon: AlertTriangle,
      title: t("privacySecurity.section4Title"),
      description: t("privacySecurity.section4Desc"),
      gradient: "from-rose-600/20 to-pink-600/20",
      border: "border-rose-500/30",
      iconColor: "text-rose-400",
    },
  ];

  const features = [
    {
      icon: Zap,
      title: t("privacySecurity.feature1Title"),
      description: t("privacySecurity.feature1Desc"),
    },
    {
      icon: RefreshCw,
      title: t("privacySecurity.feature2Title"),
      description: t("privacySecurity.feature2Desc"),
    },
    {
      icon: Award,
      title: t("privacySecurity.feature3Title"),
      description: t("privacySecurity.feature3Desc"),
    },
    {
      icon: ShieldCheck,
      title: t("privacySecurity.feature4Title"),
      description: t("privacySecurity.feature4Desc"),
    },
  ];

  return (
    <section className="relative py-8 md:py-12 px-2 sm:px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-[600px] h-[600px] bg-blue-500/4 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-emerald-500/2 rounded-full blur-3xl"></div>
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
            {t("privacySecurity.badge")}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 max-w-4xl mx-auto">
            {t("privacySecurity.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t("privacySecurity.titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto leading-relaxed px-2">
            {t("privacySecurity.description")}
          </p>
        </motion.div>

        <div className="grid gap-4 md:gap-5 md:grid-cols-2 mt-14">
          {sections.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
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
                    <h3 className="text-lg font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center"></div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 p-8 md:p-10 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10"
        >
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">{t("privacySecurity.featuresTitle")}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">
                    {f.title}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-500/5 to-rose-500/5 border border-amber-500/20"
        >
          <div className="flex items-start gap-3">
            <Scale className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-2">
                {t("privacySecurity.legalNotice")}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                {t("privacySecurity.legalNoticeDesc")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
