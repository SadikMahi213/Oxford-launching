import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";
import { createPortal } from "react-dom";

const normalizeMessage = (value, t) => {
  const fallback = t("statusFeedbackModal.error");
  if (typeof value === "string" && value.trim()) return value;

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          if (typeof item.msg === "string") return item.msg;
          try {
            return JSON.stringify(item);
          } catch {
            return "";
          }
        }
        return "";
      })
      .filter(Boolean);

    if (parts.length > 0) return parts.join(" ");
  }

  if (value && typeof value === "object") {
    if (typeof value.message === "string" && value.message.trim()) {
      return value.message;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export default function StatusFeedbackModal({ feedback, onClose }) {
  const { t } = useTranslation();
  if (!feedback) return null;
  if (typeof document === "undefined") return null;

  const isSuccess = feedback.type === "success";
  const Icon = isSuccess ? CheckCircle2 : XCircle;
  const message = normalizeMessage(feedback.message, t);
  const title = isSuccess ? t("statusFeedbackModal.success") : t("statusFeedbackModal.rejected");

  const handleClose = () => {
    if (typeof onClose === "function") onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />

      <div
        className={`relative w-full max-w-sm rounded-2xl border px-5 py-5 shadow-2xl ${
          isSuccess
            ? "border-green-500/50 bg-[#0F2B25] text-green-100"
            : "border-red-500/50 bg-[#2E1416] text-red-100"
        }`}
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-live="assertive"
        aria-modal="true"
      >
        <div className="mb-2 flex items-center gap-3">
          <span
            className={`rounded-full p-1.5 ${
              isSuccess ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <p className="text-sm leading-6 opacity-95">{message}</p>
      </div>
    </div>,
    document.body,
  );
}
