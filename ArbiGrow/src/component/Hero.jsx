import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Zap, ArrowRight, Shield, Sparkles } from "lucide-react";
import Button from "./Button";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";
import heroImg from "../assets/hero.jpeg";

export const Hero = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-dark-bg">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-bg via-blue-950/30 to-dark-bg" />
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-blue-500/20 text-xs text-blue-300 mb-6 sm:mb-8"
            >
              <Shield className="w-3.5 h-3.5" />
              Smart Contract Secured
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
            >
              <span className="text-white">{t("hero.title")}</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {t("hero.subtitle")}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              {t("hero.description")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              {!user && (
                <>
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
                    Learn More
                  </Button>
                </>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="mt-10 sm:mt-12 flex flex-wrap items-center gap-6 justify-center lg:justify-start text-gray-500"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs">Secure Platform</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs">Global Access</span>
              </div>
            </motion.div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative group"
            >
              <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-3xl blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

              <div className="relative">
                <img
                  src={heroImg}
                  alt={t("homePage.imageAlt")}
                  className="w-full max-w-lg lg:max-w-xl h-auto rounded-2xl shadow-2xl shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:-translate-y-2 transition-all duration-500 ease-out"
                  loading="eager"
                />

                <motion.div
                  className="absolute -top-4 -right-4 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-500/30 flex items-center justify-center"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xs text-gray-500">Scroll to explore</span>
          <div className="w-6 h-10 border-2 border-gray-700 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
