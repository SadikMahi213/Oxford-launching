import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Eye, Target, Layers, ShieldCheck, Sparkles } from "lucide-react";

export default function ExecutiveSummary() {
  const { t } = useTranslation();

  const builtForItems = t("home.about.builtForItems", { returnObjects: true });
  const closingTaglines = t("home.about.closingTaglines", { returnObjects: true });

  return (
    <section className="relative py-8 md:py-12 px-2 sm:px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* ===== Company Overview ===== */}
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
            {t("home.about.title")}
            {t("home.about.titleHighlight") && (
              <>{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {t("home.about.titleHighlight")}
              </span>
              </>
            )}
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed">
            {t("home.about.overview1")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed mt-4">
            {t("home.about.overview2")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed mt-4">
            {t("home.about.overview3")}
          </p>
        </motion.div>

        {/* ===== Our Vision ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 mx-auto">
            <Eye className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.visionHeading")}
            </span>
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed">
            {t("home.about.vision1")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed mt-4">
            {t("home.about.vision2")}
          </p>
        </motion.div>

        {/* ===== Our Mission ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 mx-auto">
            <Target className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.missionHeading")}
            </span>
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed">
            {t("home.about.mission1")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed mt-4">
            {t("home.about.mission2")}
          </p>
        </motion.div>

        {/* ===== Our Platform is Built For ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 mx-auto">
            <Layers className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.builtForHeading")}
            </span>
          </h2>
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
            {Array.isArray(builtForItems) &&
              builtForItems.map((item) => (
                <div key={item} className="flex items-start gap-3 text-left w-full max-w-md">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <p className="text-gray-300 text-base md:text-lg leading-relaxed">{item}</p>
                </div>
              ))}
          </div>
        </motion.div>

        {/* ===== Our Commitment ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 mx-auto">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.about.commitmentHeading")}
            </span>
          </h2>
          <p className="text-cyan-300 text-lg md:text-xl font-semibold max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed">
            {t("home.about.commitmentTagline")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed mt-4">
            {t("home.about.commitment1")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed mt-4">
            {t("home.about.commitment2")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed mt-4">
            {t("home.about.commitment3")}
          </p>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-3xl mx-auto px-2 leading-relaxed mt-4">
            {t("home.about.commitment4")}
          </p>
        </motion.div>

        {/* ===== Closing Statement ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative text-center p-6 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 overflow-hidden"
        >
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-5 mx-auto">
              <Sparkles className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              {t("home.about.closingHeading")}
            </h3>
            {Array.isArray(closingTaglines) &&
              closingTaglines.map((line) => (
                <p key={line} className="text-cyan-300 text-lg md:text-xl leading-relaxed">
                  {line}
                </p>
              ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
