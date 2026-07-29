import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { X, ShieldCheck, CheckCircle, XCircle, Clock, FileText, MessageSquare, DollarSign, Hash, Calendar } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import { updateKYCStatus } from "../../api/admin.api.js";

const KYC_NOTICE_TEMPLATES = [
  { id: "doc_unclear", key: "admin.kycReview.templates.doc_unclear" },
  { id: "doc_expired", key: "admin.kycReview.templates.doc_expired" },
  { id: "doc_mismatch", key: "admin.kycReview.templates.doc_mismatch" },
  { id: "missing_info", key: "admin.kycReview.templates.missing_info" },
  { id: "approved_std", key: "admin.kycReview.templates.approved_std" },
];

export default function AdminKycDetailDrawer({ kyc, user, onClose, onRefresh }) {
  const { t } = useTranslation();
  const token = useUserStore((s) => s.token);
  const [status, setStatus] = useState(kyc?.status || "pending");
  const [adminNote, setAdminNote] = useState(kyc?.admin_note || "");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (selectedTemplate) {
      const tmpl = KYC_NOTICE_TEMPLATES.find((tpl) => tpl.id === selectedTemplate);
      if (tmpl) setAdminNote(t(tmpl.key));
    }
  }, [selectedTemplate, t]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setMessage("");
    try {
      const res = await updateKYCStatus(token, user.id, status, "", adminNote);
      setMessage(res?.message || t("admin.kycReview.statusUpdated"));
      onRefresh?.();
    } catch (err) {
      setMessage(err.response?.data?.detail || err.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const documentImages = [kyc?.front_image_url, kyc?.back_image_url].filter(Boolean);

  const statusIcon = {
    approved: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    rejected: <XCircle className="w-5 h-5 text-red-400" />,
    pending: <Clock className="w-5 h-5 text-amber-400" />,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 h-full w-full max-w-lg bg-[#0a0e27] border-l border-white/10 shadow-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#0a0e27]/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">{t("admin.kycReview.title")}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* User Info */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <p className="text-sm text-gray-400">{t("admin.kycReview.user")}</p>
              <p className="text-white font-semibold">{user?.full_name || user?.user_no || `#${user?.id}`}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>

            {/* KYC Full Name */}
            {kyc?.full_name && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                <p className="text-sm text-gray-400">{t("admin.kycReview.kycFullName")}</p>
                <p className="text-white font-semibold">{kyc.full_name}</p>
              </div>
            )}

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {statusIcon[kyc?.status] || <Clock className="w-5 h-5 text-gray-400" />}
              <span className={`text-sm font-medium capitalize ${
                kyc?.status === "approved" ? "text-emerald-400" :
                kyc?.status === "rejected" ? "text-red-400" :
                "text-amber-400"
              }`}>
                {kyc?.status || "pending"}
              </span>
            </div>

            {/* Submission Date */}
            {kyc?.created_at && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">{t("admin.kycReview.submittedAt")}</span>
                </div>
                <p className="text-sm text-white mt-1">{new Date(kyc.created_at).toLocaleString()}</p>
              </div>
            )}

            {/* Package Info */}
            {kyc?.kyc_package && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/[0.02] border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">{kyc.kyc_package.name}</span>
                </div>
                <p className="text-xs text-gray-400">{t("admin.kycReview.price")}: <span className="text-white">{kyc.kyc_package.price} USDT</span></p>
              </div>
            )}

            {/* Transaction ID */}
            {kyc?.transaction_id && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">{t("admin.kycReview.transactionId")}</span>
                </div>
                <p className="text-sm text-white font-mono mt-1 break-all">{kyc.transaction_id}</p>
              </div>
            )}

            {/* Document Images */}
            {documentImages.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> {t("admin.kycReview.documents")}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {documentImages.map((img, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border border-white/10">
                      <img src={img} alt={`${t("admin.kycReview.documents")} ${idx + 1}`} className="w-full h-48 object-cover" />
                      <div className="p-2 bg-white/5 text-center text-xs text-gray-400">
                        {kyc?.document_type === "passport" ? t("admin.kycReview.passport") :
                         idx === 0 ? `${kyc?.document_type?.toUpperCase() || t("admin.kycReview.documents")} ${t("admin.kycReview.front")}` : t("admin.kycReview.back")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Note / Notice Templates */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> {t("admin.kycReview.adminNote")}
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white text-sm focus:outline-none focus:border-cyan-500/50 mb-3"
              >
                <option value="">{t("admin.kycReview.noticeTemplate")}</option>
                {KYC_NOTICE_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{t(tpl.key).substring(0, 50)}...</option>
                ))}
              </select>
              <textarea
                value={adminNote}
                onChange={(e) => { setAdminNote(e.target.value); setSelectedTemplate(""); }}
                placeholder={t("admin.kycReview.notePlaceholder")}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#0C1035] border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>

            {/* Status Update */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 space-y-3">
              <h3 className="text-sm font-medium text-gray-300">{t("admin.kycReview.updateStatus")}</h3>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="pending">{t("admin.kycReview.statusPending")}</option>
                <option value="approved">{t("admin.kycReview.statusApproved")}</option>
                <option value="rejected">{t("admin.kycReview.statusRejected")}</option>
              </select>
              <button
                onClick={handleUpdate}
                disabled={isUpdating || status === kyc?.status}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? t("admin.kycReview.updating") : t("admin.kycReview.updateButton")}
              </button>
              {message && (
                <p className={`text-sm ${message.includes("Error") || message.includes("fail") ? "text-red-400" : "text-green-400"}`}>
                  {message}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
