import { motion } from "motion/react";
import { Store, ShoppingBag, User, Settings, Shield, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "./Button";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";

export function EcommercePromo() {
  const { t, i18n } = useTranslation();
  const { user } = useUserStore();
  const navigate = useNavigate();

  const features = [
    { icon: Store, text: t("home.ecommerce.freeRegistration") },
    { icon: ShoppingBag, text: t("home.ecommerce.freeStore") },
    { icon: User, text: t("home.ecommerce.yourBrand") },
    { icon: Settings, text: t("home.ecommerce.fullControl") },
    { icon: Shield, text: t("home.ecommerce.securePlatform") },
  ];

  return (
    <section key={i18n.language} className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-transparent to-cyan-900/10 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            {t("home.ecommerce.badge")}
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            {t("home.ecommerce.title")}
          </h2>

          <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t("home.ecommerce.description")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <p className="text-base text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t("home.ecommerce.longDescription")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300"
            >
              <feature.icon className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="text-sm text-gray-200">{feature.text}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            {t("home.ecommerce.callToAction")}
          </p>

          {!user && (
            <Button
              variant="gradient"
              icon={<Store />}
              onClick={() => navigate("/register")}
              className="px-8 py-3 text-lg"
            >
              {t("home.ecommerce.ctaButton")}
            </Button>
          )}
        </motion.div>
      </div>
    </section>
  );
}
