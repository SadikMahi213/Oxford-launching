import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import Button from "./Button";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";

export const Hero = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const navigate = useNavigate();
  // const [timeLeft, setTimeLeft] = useState({
  //   days: 0,
  //   hours: 0,
  //   minutes: 0,
  //   seconds: 0,
  // });

  // count down related useEffect code
  // useEffect(() => {
  //   const targetDate = new Date("2026-03-06T00:00:00").getTime();

  //   const updateCountdown = () => {
  //     const now = new Date().getTime();
  //     const difference = targetDate - now;

  //     if (difference > 0) {
  //       setTimeLeft({
  //         days: Math.floor(difference / (1000 * 60 * 60 * 24)),
  //         hours: Math.floor(
  //           (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  //         ),
  //         minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
  //         seconds: Math.floor((difference % (1000 * 60)) / 1000),
  //       });
  //     }
  //   };

  //   updateCountdown();
  //   const interval = setInterval(updateCountdown, 1000);

  //   return () => clearInterval(interval);
  // }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center px-2 sm:px-4 py-20 bg-dark-bg">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-1/3 w-2 h-2 bg-blue-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto text-center relative z-10">
        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-snug sm:leading-tight text-white px-4 text-center"
        >
          {t("hero.title")}
          <br className="hidden sm:block" />
          <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {t("hero.subtitle")}
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-gray-300 mb-12 max-w-full md:max-w-3xl mx-auto px-2"
        >
          {t("hero.description")}
        </motion.p>

        {/* Countdown Timer */}
        {/* <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <div className="text-sm text-gray-400 mb-4 tracking-wider uppercase">
            Launch Countdown
          </div>
          <div className="flex justify-center gap-4 md:gap-8">
            {[
              { label: "Days", value: timeLeft.days },
              { label: "Hours", value: timeLeft.hours },
              { label: "Minutes", value: timeLeft.minutes },
              { label: "Seconds", value: timeLeft.seconds },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-md border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    {String(item.value).padStart(2, "0")}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-2 uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div> */}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {!user && (
            <Button
              variant="gradient"
              icon={<Zap />}
              fullWidth={false}
              className="px-6 py-3"
              onClick={() => navigate("/register")}
            >
              {t("hero.cta")}
            </Button>
          )}

        </motion.div>

        {/* Bottom indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-20 hidden md:block"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-gray-600 rounded-full mx-auto flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-3 bg-blue-400 rounded-full"></div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
