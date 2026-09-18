import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Clock, XCircle, AlertCircle, ArrowLeft, ArrowRight, MessageSquare } from "lucide-react";
import { getFeeInfo } from "../api/user.api.js";
import useUserStore from "../store/userStore";
import KycSuccessCard from "../component/user/KycSuccessCard.jsx";

export function VerificationPending({ embedded, onEdit }) {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const [kycStatus, setKycStatus] = useState("pending");
  const [kycNote, setKycNote] = useState("");

  useEffect(() => {
    getFeeInfo().then((res) => {
      const data = res?.data;
      if (data) {
        setKycStatus(data.kyc_status || "pending");
        setKycNote(data.kyc_note || "");
      }
    }).catch(() => {});
  }, []);

  const isApproved = kycStatus === "approved";
  const isRejected = kycStatus === "rejected";

  if (isApproved) {
    return (
      <div className={`${embedded ? "" : "min-h-screen "}bg-[#0a0e27] text-white overflow-hidden ${embedded ? "p-4 rounded-2xl" : "flex items-center justify-center px-4 py-12"}`}>
        {!embedded && (
          <motion.a
            href="/"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed top-6 left-6 z-20 inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span>{t("verificationPending.backToHome")}</span>
          </motion.a>
        )}
        <KycSuccessCard user={user} />
      </div>
    );
  }

  /* ---- Pending / Rejected states (unchanged) ---- */
  return (
    <div className={`${embedded ? "" : "min-h-screen "}bg-gradient-to-b from-[#0a0e27] via-[#0d1137] to-[#0a0e27] text-white overflow-hidden ${embedded ? "p-4 rounded-2xl" : "flex items-center justify-center px-4 py-12"}`}>
      {!embedded && (
        <>
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-1/3 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl"></div>
          </div>
          <motion.a
            href="/"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 mb-8 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span>{t("verificationPending.backToHome")}</span>
          </motion.a>
        </>
      )}
      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-50"></div>
          <div className="relative text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative p-8 md:p-12 rounded-3xl flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
                className={`flex items-center justify-center w-24 h-24 rounded-full border-2 mb-6 ${
                  isRejected
                    ? "bg-red-500/10 border-red-500/50"
                    : "bg-yellow-500/10 border-yellow-500/50"
                }`}
              >
                {isRejected ? (
                  <XCircle className="w-12 h-12 text-red-400" />
                ) : (
                  <Clock className="w-12 h-12 text-yellow-400" />
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className={`px-6 py-2 rounded-full border font-semibold text-sm ${
                  isRejected
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                }`}>
                  {isRejected
                    ? t("verificationPending.rejectedBadge")
                    : t("verificationPending.badge")}
                </div>
              </motion.div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              {isRejected
                ? t("verificationPending.rejectedTitle")
                : t("verificationPending.title")}{" "}
              <span className={`bg-clip-text text-transparent ${
                isRejected
                  ? "bg-gradient-to-r from-red-400 to-orange-400"
                  : "bg-gradient-to-r from-yellow-400 to-orange-400"
              }`}>
                {isRejected
                  ? t("verificationPending.rejectedHighlight")
                  : t("verificationPending.titleHighlight")}
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-gray-400 text-lg mb-8 max-w-xl mx-auto leading-relaxed"
            >
              {isRejected
                ? t("verificationPending.rejectedBody")
                : t("verificationPending.body")}
            </motion.p>

            {isRejected && kycNote && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 mb-6 text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-white">{t("verificationPending.rejectionReason")}</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{kycNote}</p>
              </motion.div>
            )}

            {!isRejected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="p-4 sm:p-6 md:p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 mb-6"
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {t("verificationPending.estimatedTime")}
                  </h3>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-1">
                  {t("verificationPending.timeValue")}
                </p>
                <p className="text-sm sm:text-sm text-gray-400 text-center">
                  {t("verificationPending.timeDesc")}
                </p>
              </motion.div>
            )}

            {!isApproved && onEdit && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <button
                  onClick={onEdit}
                  className="group inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white transition-all duration-300 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
                >
                  <span>{isRejected ? t("verificationPending.resubmitButton") : t("verificationPending.editButton")}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default VerificationPending;
