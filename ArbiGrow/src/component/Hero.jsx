import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Zap, ArrowRight } from "lucide-react";
import Button from "./Button";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";
import heroBg from "../assets/hero-bg.jpg";

export const Hero = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const navigate = useNavigate();

  return (
    <section className="relative flex items-center overflow-hidden bg-dark-bg min-h-[60vh] lg:min-h-[85vh]">
      <div className="absolute inset-0 overflow-hidden">
        <motion.img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1 }}
          animate={{ scale: 1.05 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-[540px] text-center lg:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
          >
            <span className="text-white">{t("hero.title")}</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {t("hero.subtitle")}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed max-w-[480px] lg:mx-0 mx-auto"
          >
            {t("hero.description")}
          </motion.p>

          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
              className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button
                variant="gradient"
                icon={<Zap />}
                fullWidth={false}
                className="px-8 py-3.5 text-base"
                onClick={() => navigate("/register")}
              >
                {t("hero.cta")}
              </Button>
              <Button
                variant="frosted"
                icon={<ArrowRight />}
                fullWidth={false}
                className="px-8 py-3.5 text-base"
                onClick={() => {
                  const el = document.getElementById("services");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t("learnMore")}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};
