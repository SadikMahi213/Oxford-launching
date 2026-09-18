import { motion } from 'motion/react';
import { Keyboard, Eye, Database, Palette, Film, Megaphone, Globe, Award, Store } from 'lucide-react';
import { useTranslation } from "react-i18next";

export function WhyChooseUs() {
  const { t } = useTranslation();
  const features = [
    {
      icon: Keyboard,
      title: t("home.whyChooseUs.captchaTitle"),
      description: t("home.whyChooseUs.captchaDesc"),
    },
    {
      icon: Eye,
      title: t("home.whyChooseUs.watchAdsTitle"),
      description: t("home.whyChooseUs.watchAdsDesc"),
    },
    {
      icon: Database,
      title: t("home.whyChooseUs.dataEntryTitle"),
      description: t("home.whyChooseUs.dataEntryDesc"),
    },
    {
      icon: Palette,
      title: t("home.whyChooseUs.graphicsTitle"),
      description: t("home.whyChooseUs.graphicsDesc"),
    },
    {
      icon: Film,
      title: t("home.whyChooseUs.videoTitle"),
      description: t("home.whyChooseUs.videoDesc"),
    },
    {
      icon: Megaphone,
      title: t("home.whyChooseUs.marketingTitle"),
      description: t("home.whyChooseUs.marketingDesc"),
    },
    {
      icon: Globe,
      title: t("home.whyChooseUs.networkTitle"),
      description: t("home.whyChooseUs.networkDesc"),
    },
    {
      icon: Award,
      title: t("home.whyChooseUs.benefitsTitle"),
      description: t("home.whyChooseUs.benefitsDesc"),
    },
    {
      icon: Store,
      title: t("home.whyChooseUs.ecommerceTitle"),
      description: t("home.whyChooseUs.ecommerceDesc"),
    },
  ];

  return (
    <section className="relative py-24 px-2 sm:px-4 lg:px-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.whyChooseUs.title")}{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.whyChooseUs.titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-full md:max-w-3xl mx-auto px-2">
            {t("home.whyChooseUs.subtitle")}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
  {features.map((feature, index) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative"
    >
      {/* Glass card */}
      <div className="relative h-full p-4 sm:p-6 md:p-8 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2">

        <div className="relative flex flex-col items-center text-center md:items-start md:text-left">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-6 group-hover:scale-110 transition-transform duration-300">
            <feature.icon className="w-8 h-8 text-cyan-400" />
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors duration-300">
            {feature.title}
          </h3>
          <p className="text-gray-400 leading-relaxed text-sm">
            {feature.description}
          </p>

          {/* Decorative element */}
          <div className="mt-6 h-1 w-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full group-hover:w-20 transition-all duration-300"></div>
        </div>

      </div>
    </motion.div>
  ))}
</div>
      </div>
    </section>
  );
}
