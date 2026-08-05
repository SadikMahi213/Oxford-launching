import { useTranslation } from "react-i18next";
import { Zap, ArrowRight } from "lucide-react";
import Button from "./Button";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";
import heroBg from "../assets/hero-bg.jpeg";

export const Hero = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const navigate = useNavigate();

  return (
    <>
      {/* ── MOBILE (hidden on lg+) ───────────────────────── */}
      <div className="lg:hidden">

        {/* Push content below fixed navbar — white so top gradient blends */}
        <div className="h-16 bg-white" />

        {/* Image section — full width, natural aspect ratio, no zoom */}
        <div className="relative w-full">
          <img
            src={heroBg}
            alt={t("homePage.altHero")}
            className="w-full h-auto block"
            loading="eager"
          />
          {/* White gradient at TOP — fully opaque white fading into image */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none" />
          {/* Dark gradient at BOTTOM — matches site bg */}
          <div className="absolute -bottom-1 left-0 right-0 h-48 bg-gradient-to-t from-dark-bg via-dark-bg/80 to-transparent pointer-events-none" />
        </div>

        {/* Text section — transparent, pulled up 2px to close subpixel gap */}
        <div className="px-5 pb-10 pt-2 text-center -mt-[2px]">
          <h1 className="text-3xl font-bold leading-tight">
            <span className="text-white">{t("hero.title")}</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {t("hero.subtitle")}
            </span>
          </h1>
          <p className="mt-3 text-sm text-gray-300 leading-relaxed max-w-xs mx-auto">
            {t("hero.description")}
          </p>
          {!user && (
            <div className="mt-6 flex flex-row gap-3 items-center justify-center">
              <Button
                variant="gradient"
                icon={<Zap />}
                fullWidth={false}
                className="text-sm px-5"
                onClick={() => navigate("/register")}
              >
                {t("hero.cta")}
              </Button>
              <Button
                variant="frosted"
                icon={<ArrowRight />}
                fullWidth={false}
                className="text-sm px-5"
                onClick={() => {
                  const el = document.getElementById("services");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t("common.learnMore")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP (hidden below lg) ───────────────────── */}
      <section className="hidden lg:flex items-center relative overflow-hidden bg-[#0a0e27] min-h-[85vh]">
        <img
          src={heroBg}
          alt={t("homePage.altHero")}
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 py-20">
          <div className="max-w-[540px] text-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="text-white">{t("hero.title")}</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {t("hero.subtitle")}
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 leading-relaxed max-w-[480px]">
              {t("hero.description")}
            </p>
            {!user && (
              <div className="mt-10 flex flex-row gap-4 items-center">
                <Button
                  variant="gradient"
                  icon={<Zap />}
                  fullWidth={false}
                  onClick={() => navigate("/register")}
                >
                  {t("hero.cta")}
                </Button>
                <Button
                  variant="frosted"
                  icon={<ArrowRight />}
                  fullWidth={false}
                  onClick={() => {
                    const el = document.getElementById("services");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {t("common.learnMore")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};
