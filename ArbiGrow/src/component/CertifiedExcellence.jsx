import { motion } from "motion/react";
import {
  ShieldCheck,
  Award,
  Lock,
  Download,
  ExternalLink,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const VERIFIED_BADGES = [
  { icon: ShieldCheck },
  { icon: Award },
  { icon: Lock },
];

export function CertifiedExcellence() {
  const { t } = useTranslation();
  const [showCertModal, setShowCertModal] = useState(false);

  return (
    <>
    <section className="relative py-8 md:py-12 px-2 sm:px-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[550px] h-[550px] bg-blue-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative p-5 sm:p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden"
        >
          {/* Premium glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-40 pointer-events-none"></div>

          <div className="relative flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
            {/* Left — text content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Top badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-400 uppercase tracking-[0.2em]">
                  {t("home.globalCertifications.statementBadge")}
                </span>
              </div>

              <p className="text-gray-300 text-base leading-relaxed mb-6">
                {t("home.globalCertifications.statement")}
              </p>

              {/* Verified badges */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-6">
                {VERIFIED_BADGES.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                    whileHover={{ scale: 1.05 }}
                    className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-[#0a0e27] border border-cyan-500/40"
                  >
                    <div className="absolute -inset-[1px] bg-cyan-500/15 rounded-full blur-md opacity-60 pointer-events-none"></div>
                    <item.icon className="relative w-4 h-4 text-cyan-400" />
                    <span className="relative text-xs font-semibold text-cyan-300">
                      {t("home.globalCertifications.verified")}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCertModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
              >
                <Download className="w-4 h-4" />
                {t("home.globalCertifications.viewAll")}
              </motion.button>
            </div>

            {/* Right — certificate preview card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="w-full lg:w-[360px] flex-shrink-0"
            >
              <button
                type="button"
                onClick={() => setShowCertModal(true)}
                className="group relative w-full text-left flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer"
                aria-label={t("home.globalCertifications.viewAll")}
              >
                <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/15 group-hover:to-cyan-500/15 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Award className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="relative flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                    {t("home.globalCertifications.doc1")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("home.globalCertifications.pdfLabel")}
                  </p>
                </div>
                <ExternalLink className="relative flex-shrink-0 w-4 h-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>

      {/* Certificate Modal */}
      {showCertModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
          onClick={() => setShowCertModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("home.globalCertifications.doc1")}
        >
          <div
            className="relative w-full max-w-[92vw] sm:max-w-[85vw] lg:max-w-[75vw] max-h-[90vh] rounded-2xl overflow-auto bg-gray-900 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCertModal(false)}
              className="sticky top-2 float-right mr-2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-gray-300 hover:text-white hover:bg-black/80 transition-all"
              aria-label={t("common.close")}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <img
              src="/revised.jpeg"
              alt={t("home.globalCertifications.doc1")}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
