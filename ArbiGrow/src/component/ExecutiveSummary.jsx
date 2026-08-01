import { motion } from "motion/react";
import {
  Eye,
  Target,
  CheckCircle2,
  Keyboard,
  MonitorPlay,
  Database,
  Palette,
  Film,
  Megaphone,
  Store,
  Pickaxe,
  Globe,
  GraduationCap,
  Layers,
  Rocket,
  TrendingUp,
  Coins,
  Cpu,
  Users,
  Clock,
  Award,
  BadgeCheck,
  Lightbulb,
  Handshake,
  ShieldCheck,
  Sprout,
  HeartHandshake,
  Star,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const serviceIcons = [Keyboard, MonitorPlay, Database, Palette, Film, Megaphone, Store, Pickaxe, Globe, GraduationCap];
const whyIcons = [Rocket, TrendingUp, Coins, Cpu, Users, Clock, Award, BadgeCheck];
const valueIcons = [Lightbulb, Handshake, ShieldCheck, Sprout, HeartHandshake, Star];

export default function ExecutiveSummary() {
  const { t } = useTranslation();

  const services = Array.from({ length: 10 }, (_, i) => ({
    icon: serviceIcons[i],
    title: t(`home.about.service${i + 1}Title`),
    description: t(`home.about.service${i + 1}Desc`),
  }));

  const whyItems = Array.from({ length: 8 }, (_, i) => ({
    icon: whyIcons[i],
    title: t(`home.about.why${i + 1}Title`),
    description: t(`home.about.why${i + 1}Desc`),
  }));

  const values = Array.from({ length: 6 }, (_, i) => ({
    icon: valueIcons[i],
    title: t(`home.about.value${i + 1}Title`),
    description: t(`home.about.value${i + 1}Desc`),
  }));

  const audiences = Array.from({ length: 9 }, (_, i) => t(`home.about.audience${i + 1}`));

  const missionPoints = [
    t("home.about.missionPoint1"),
    t("home.about.missionPoint2"),
    t("home.about.missionPoint3"),
    t("home.about.missionPoint4"),
  ];

  return (
    <section className="relative py-8 md:py-12 px-2 sm:px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* ===== Section Header ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 mb-6">
            <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              {t("home.about.badge")}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.about.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.titleHighlight")}
            </span>
          </h2>
          <p className="text-lg md:text-xl text-cyan-300/90 font-medium mb-4">
            {t("home.about.headline")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed">
            {t("home.about.intro")}
          </p>
        </motion.div>

        {/* ===== Vision & Mission Cards ===== */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2"
          >
            <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-5 group-hover:scale-110 transition-transform duration-300">
                <Eye className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{t("home.about.visionTitle")}</h3>
              <p className="text-gray-300 leading-relaxed">{t("home.about.visionText")}</p>
            </div>
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="group relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2"
          >
            <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-5 group-hover:scale-110 transition-transform duration-300">
                <Target className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{t("home.about.missionTitle")}</h3>
              <p className="text-gray-300 leading-relaxed mb-5">{t("home.about.missionText")}</p>
              <ul className="space-y-3">
                {missionPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300 leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        {/* ===== Services Grid ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.servicesTitle")}
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-full md:max-w-3xl mx-auto px-2">
            {t("home.about.servicesSubtitle")}
          </p>
        </motion.div>

        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-12">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (index % 5) * 0.1 }}
              className="group relative p-5 md:p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="relative flex flex-col items-center text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">{service.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ===== Platform Highlight Card ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative p-6 md:p-10 lg:p-14 rounded-[2.5rem] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden group mb-12"
        >
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-1000"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/20 transition-all duration-1000"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Layers className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
              {t("home.about.platformTitle")}
            </h3>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-4xl">
              {t("home.about.platformText")}
            </p>
          </div>
        </motion.div>

        {/* ===== Why OFA ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.about.whyTitle")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              OFA
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-full md:max-w-3xl mx-auto px-2">
            {t("home.about.whySubtitle")}
          </p>
        </motion.div>

        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {whyItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (index % 4) * 0.1 }}
              className="group relative p-5 md:p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ===== Who We Serve ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.whoTitle")}
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-full md:max-w-3xl mx-auto px-2 mb-8">
            {t("home.about.whoSubtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto mb-12">
            {audiences.map((audience, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/25 text-sm font-medium text-gray-200 hover:border-cyan-400/40 hover:text-white transition-all duration-300"
              >
                {audience}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* ===== Core Values ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.about.valuesTitle")}
          </h2>
          <p className="text-gray-400 text-lg max-w-full md:max-w-3xl mx-auto px-2">
            {t("home.about.valuesSubtitle")}
          </p>
        </motion.div>

        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (index % 3) * 0.1 }}
              className="group relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <value.icon className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors duration-300">
                  {value.title}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">{value.description}</p>
                <div className="mt-6 h-1 w-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full group-hover:w-20 transition-all duration-300"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ===== Commitment Highlighted Card ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative p-6 md:p-10 lg:p-14 rounded-[2.5rem] overflow-hidden group mb-12"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-cyan-500/15 to-blue-700/25"></div>
          <div className="absolute -inset-[1px] bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-[2.5rem] blur-xl opacity-40"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-cyan-300/30 mb-6">
              <ShieldCheck className="w-7 h-7 text-cyan-300" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              {t("home.about.commitmentTitle")}
            </h3>
            <p className="text-gray-200 text-base md:text-lg leading-relaxed max-w-4xl">
              {t("home.about.commitmentText")}
            </p>
          </div>
        </motion.div>

        {/* ===== Final Tagline ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <p className="text-base md:text-lg font-semibold bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
              {t("home.about.tagline")}
            </p>
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
