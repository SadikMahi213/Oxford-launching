import { motion } from "motion/react";
import {
  BadgeCheck,
  ShieldCheck,
  Globe,
  FileCheck,
  ScrollText,
  Lock,
  Award,
  Download,
  ExternalLink,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export function GlobalCertifications({ children }) {
  const { t } = useTranslation();
  const [showCertModal, setShowCertModal] = useState(false);
  const certifications = [
    {
      icon: BadgeCheck,
      label: t("home.globalCertifications.cert1Label"),
      sublabel: t("home.globalCertifications.cert1Sub"),
      color: "from-blue-500/20 to-cyan-500/20",
      border: "border-blue-500/30",
      iconColor: "text-blue-400",
    },
    {
      icon: ScrollText,
      label: t("home.globalCertifications.cert2Label"),
      sublabel: t("home.globalCertifications.cert2Sub"),
      color: "from-emerald-500/20 to-teal-500/20",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-400",
    },
    {
      icon: Lock,
      label: t("home.globalCertifications.cert3Label"),
      sublabel: t("home.globalCertifications.cert3Sub"),
      color: "from-purple-500/20 to-violet-500/20",
      border: "border-purple-500/30",
      iconColor: "text-purple-400",
    },
    {
      icon: FileCheck,
      label: t("home.globalCertifications.cert4Label"),
      sublabel: t("home.globalCertifications.cert4Sub"),
      color: "from-amber-500/20 to-orange-500/20",
      border: "border-amber-500/30",
      iconColor: "text-amber-400",
    },
    {
      icon: Globe,
      label: t("home.globalCertifications.cert5Label"),
      sublabel: t("home.globalCertifications.cert5Sub"),
      color: "from-cyan-500/20 to-blue-500/20",
      border: "border-cyan-500/30",
      iconColor: "text-cyan-400",
    },
  ];

  const documents = [
    { name: t("home.globalCertifications.doc1"), icon: Award },
    { name: t("home.globalCertifications.doc2"), icon: ShieldCheck },
    { name: t("home.globalCertifications.doc3"), icon: Lock },
    { name: t("home.globalCertifications.doc4"), icon: FileCheck },
  ];

  return (
    <>
    <section className="relative py-8 md:py-12 px-2 sm:px-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-emerald-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-cyan-500/2 rounded-full blur-3xl"></div>
      </div>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-sm uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-6">
            <Award className="w-4 h-4" />
            {t("home.globalCertifications.badge")}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("home.globalCertifications.title")}{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t("home.globalCertifications.titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-full md:max-w-2xl mx-auto leading-relaxed px-2">
            {t("home.globalCertifications.description")}
          </p>
        </motion.div>

        {/* Certification Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-16">
          {certifications.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative p-4 md:p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 text-center"
            >
              {/* Hover glow */}
              <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/15 group-hover:to-cyan-500/15 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative">
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${item.color} ${item.border} mb-5 group-hover:scale-110 transition-transform duration-300`}
                >
                  <item.icon className={`w-8 h-8 ${item.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1.5 leading-tight">
                    {item.label}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {item.sublabel}
                  </p>
                </div>

                {/* Decorative bottom line */}
                <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mx-auto mt-4 transition-all duration-500"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {children}

        {/* Trust Statement + Document Downloads */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
        >
          {/* Inner glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-3xl blur-xl opacity-40"></div>

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            {/* Left side — description */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                  {t("home.globalCertifications.statementBadge")}
                </span>
              </div>
              <p className="text-gray-300 text-base leading-relaxed mb-6">
                {t("home.globalCertifications.statement")}
              </p>

              {/* Verified badges row */}
              <div className="flex flex-wrap gap-3 mb-6">
                {[BadgeCheck, ShieldCheck, Lock].map((Icon, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
                  >
                    <Icon className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-gray-400">{t("home.globalCertifications.verified")}</span>
                  </div>
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

            {/* Right side — document list */}
            <div className="space-y-3">
              {documents.map((doc, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                  className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                      <doc.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-500">{t("home.globalCertifications.pdfLabel")}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>

      {/* Certificate Modal */}
      {showCertModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
          onClick={() => setShowCertModal(false)}
        >
          <div
            className="relative w-full max-w-[92vw] sm:max-w-[85vw] lg:max-w-[75vw] max-h-[90vh] rounded-2xl overflow-auto bg-gray-900 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCertModal(false)}
              className="sticky top-2 float-right mr-2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-gray-300 hover:text-white hover:bg-black/80 transition-all"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <img
              src="/revised.jpeg"
              alt="Certificate"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
