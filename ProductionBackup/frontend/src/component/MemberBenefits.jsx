import { motion } from "motion/react";
import { Gift, Users, Globe, Sparkles, Clock, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";
import Button from "./Button";
import { useTranslation } from "react-i18next";

export function MemberBenefits() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUserStore();

  const cards = [
    {
      icon: Gift,
      badge: t("home.memberBenefits.card1Badge"),
      title: t("home.memberBenefits.card1Title"),
      description: t("home.memberBenefits.card1Desc"),
      highlights: [t("home.memberBenefits.card1H1"), t("home.memberBenefits.card1H2"), t("home.memberBenefits.card1H3")],
      gradient: "from-blue-600/20 to-cyan-600/20",
      border: "border-blue-500/30",
      iconColor: "text-cyan-400",
      badgeColor: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      number: "01",
    },
    {
      icon: Users,
      badge: t("home.memberBenefits.card2Badge"),
      title: t("home.memberBenefits.card2Title"),
      description: t("home.memberBenefits.card2Desc"),
      highlights: [t("home.memberBenefits.card2H1"), t("home.memberBenefits.card2H2"), t("home.memberBenefits.card2H3")],
      gradient: "from-emerald-600/20 to-teal-600/20",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-400",
      badgeColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      number: "02",
    },
    {
      icon: Globe,
      badge: t("home.memberBenefits.card3Badge"),
      title: t("home.memberBenefits.card3Title"),
      description: t("home.memberBenefits.card3Desc"),
      highlights: [t("home.memberBenefits.card3H1"), t("home.memberBenefits.card3H2"), t("home.memberBenefits.card3H3")],
      gradient: "from-purple-600/20 to-violet-600/20",
      border: "border-purple-500/30",
      iconColor: "text-purple-400",
      badgeColor: "bg-purple-500/10 border-purple-500/30 text-purple-400",
      number: "03",
    },
  ];

  return (
    <section className="relative py-24 px-2 sm:px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-emerald-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-purple-500/2 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-cyan-500/20">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-base md:text-lg uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              {t("home.memberBenefits.badge")}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.memberBenefits.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t("home.memberBenefits.titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto leading-relaxed px-2">
            {t("home.memberBenefits.subtitle")}
          </p>
        </motion.div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.15 }}
              className="group relative"
            >
              <div className="relative h-full p-4 md:p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden">
                <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} ${card.border} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                    </div>
                    <span className="text-5xl font-bold text-white/5 select-none">
                      {card.number}
                    </span>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${card.badgeColor} mb-4`}>
                    <Zap className="w-3 h-3" />
                    {card.badge}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3 leading-snug group-hover:text-cyan-400 transition-colors duration-300">
                    {card.title}
                  </h3>

                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    {card.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {card.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-300"
                      >
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          {!user && (
            <>
              <p className="text-gray-400 text-sm mb-6 max-w-2xl mx-auto">
                {t("home.memberBenefits.cta")}
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigate("/login")}
                  fullWidth={false}
                  variant="gradient"
                >
                  {t("home.memberBenefits.ctaButton")}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
