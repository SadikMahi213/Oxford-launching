import { motion } from "motion/react";
import {
  Keyboard,
  MonitorPlay,
  Database,
  Palette,
  Film,
  Megaphone,
  Store,
  Globe,
  GraduationCap,
  Rocket,
  TrendingUp,
  Coins,
  Cpu,
  Users,
  Clock,
  Award,
  BadgeCheck,
  UserRoundPlus,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import Button from "./Button";

const serviceIcons = [Keyboard, MonitorPlay, Database, Palette, Film, Megaphone, Store, Globe, GraduationCap, Cpu];
const whyIcons = [Rocket, TrendingUp, Coins, Cpu, Users, Clock, Award, BadgeCheck];
const howIcons = [UserRoundPlus, UserCheck, MonitorPlay, Coins];

export default function ExecutiveSummary() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  const howSteps = Array.from({ length: 4 }, (_, i) => ({
    icon: howIcons[i],
    title: t(`home.about.howTitle${i + 1}`),
    description: t(`home.about.howStep${i + 1}`),
  }));

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
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed">
            {t("home.about.intro")}
          </p>
        </motion.div>

        {/* ===== What You Can Do ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.about.servicesTitle")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.servicesHighlight")}
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

        {/* ===== Why Choose OFA ===== */}
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
              {t("home.about.whyHighlight")}
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
              <div className="relative flex flex-col items-center text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ===== How It Works ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.about.howTitle")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.howHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-full md:max-w-3xl mx-auto px-2">
            {t("home.about.howSubtitle")}
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-4 mb-12">
          {howSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              <div className="h-full p-6 md:p-8 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2">
                <div className="relative">
                  <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-5 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ===== Community ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative text-center p-6 md:p-12 mb-12 rounded-[2.5rem] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 overflow-hidden"
        >
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-5 mx-auto">
              <Users className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              {t("home.about.communityTitle")}
            </h3>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-3xl mx-auto">
              {t("home.about.communityText")}
            </p>
          </div>
        </motion.div>

        {/* ===== CTA ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative text-center p-6 md:p-12 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-blue-600/20 via-cyan-500/15 to-blue-700/25"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-[2.5rem] blur-xl opacity-40"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-cyan-300/30 mb-6 mx-auto">
              <Sparkles className="w-7 h-7 text-cyan-300" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              {t("home.about.ctaTitle")}
            </h3>
            <p className="text-gray-200 text-base md:text-lg leading-relaxed max-w-3xl mx-auto mb-8">
              {t("home.about.ctaText")}
            </p>
            <Button
              variant="gradient"
              icon={<Sparkles />}
              fullWidth={false}
              onClick={() => navigate("/register")}
              className="mx-auto"
            >
              {t("home.about.ctaButton")}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}