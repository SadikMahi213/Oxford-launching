import { useTranslation } from "react-i18next";
import {
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Handshake,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
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

// Strip emoji characters so the premium card only ever renders SVG icons.
const stripEmojis = (value) =>
  String(value || "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

// Split "Deposit Request Successful" into white leading words + gold final word.
const splitHeading = (title) => {
  const words = String(title || "").split(" ").filter(Boolean);
  if (words.length <= 1) return { lead: "", accent: words[0] || "" };
  return {
    lead: words.slice(0, -1).join(" "),
    accent: words[words.length - 1],
  };
};

const detectVariant = (title, message) => {
  const haystack = `${title || ""} ${message || ""}`;
  if (/withdraw/i.test(haystack)) return "withdrawal";
  if (/deposit/i.test(haystack)) return "deposit";
  return "generic";
};

// Subtle financial chart watermark (inline SVG, no external assets).
const WatermarkGraphic = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 220 160"
    className="pointer-events-none absolute -bottom-8 -right-8 h-52 w-52 opacity-[0.07] sm:h-60 sm:w-60"
    fill="none"
  >
    <g stroke="#D4AF37" strokeWidth="1.5">
      <path d="M8 132 L60 100 L105 112 L150 64 L212 40" strokeLinecap="round" />
      <path d="M8 146 L60 118 L105 128 L150 88 L212 66" strokeLinecap="round" opacity="0.6" />
      {Array.from({ length: 6 }).map((_, row) => (
        <line
          key={row}
          x1="8"
          y1={20 + row * 22}
          x2="212"
          y2={20 + row * 22}
          stroke="#FFFFFF"
          strokeWidth="0.6"
          opacity="0.5"
        />
      ))}
    </g>
    <g fill="#D4AF37">
      <circle cx="60" cy="100" r="4" />
      <circle cx="105" cy="112" r="4" />
      <circle cx="150" cy="64" r="4" />
      <circle cx="212" cy="40" r="4" />
    </g>
    <g stroke="#FFFFFF" strokeWidth="1" opacity="0.8">
      <circle cx="168" cy="118" r="34" />
      <ellipse cx="168" cy="118" rx="34" ry="12" />
      <line x1="168" y1="84" x2="168" y2="152" />
    </g>
  </svg>
);

const ShieldBadge = () => (
  <span className="relative inline-flex flex-shrink-0">
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#F6E27A] via-[#D4AF37] to-[#8A6D1B] p-[1.5px] shadow-[0_0_18px_rgba(212,175,55,0.35)]">
      <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#0A1128] to-[#001F3F]">
        <ShieldCheck className="h-6 w-6 text-[#E9C767]" strokeWidth={1.8} />
      </span>
    </span>
    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0A1128] bg-gradient-to-br from-emerald-400 to-green-600 shadow-[0_0_10px_rgba(34,197,94,0.6)]">
      <Check className="h-3 w-3 text-white" strokeWidth={3} />
    </span>
  </span>
);

const StatusPill = () => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-green-500/40 bg-[#06121F]/80 px-3.5 py-2 shadow-[0_0_14px_rgba(34,197,94,0.18),inset_0_0_12px_rgba(34,197,94,0.06)]">
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.9)]" />
    </span>
    <p className="min-w-0 break-words text-xs font-medium leading-5 sm:text-[13px]">
      <span className="font-semibold text-white">Status: </span>
      <span className="text-green-200">Pending – OFA Management Review</span>
    </p>
  </div>
);

const InfoRow = ({ icon, children, isLast }) => (
  <div
    className={`flex items-start gap-3 py-3.5 ${isLast ? "" : "border-b border-white/[0.07]"}`}
  >
    <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {icon}
    </span>
    <div className="min-w-0 flex-1 break-words text-[13px] leading-6 text-slate-200/90 sm:text-sm">
      {children}
    </div>
  </div>
);

export default function StatusFeedbackModal({ feedback, onClose }) {
  const { t } = useTranslation();
  if (!feedback) return null;
  if (typeof document === "undefined") return null;

  const isSuccess = feedback.type === "success";
  const rawMessage = normalizeMessage(feedback.message, t);
  const rawTitle =
    feedback.title || (isSuccess ? t("statusFeedbackModal.success") : t("statusFeedbackModal.rejected"));
  const title = stripEmojis(rawTitle) || (isSuccess ? "Request Successful" : "Request Update");
  const message = stripEmojis(rawMessage);
  const variant = detectVariant(rawTitle, rawMessage);
  const isRequestFlow = isSuccess && (variant === "deposit" || variant === "withdrawal");
  const { lead, accent } = splitHeading(title);

  const handleClose = () => {
    if (typeof onClose === "function") onClose();
  };

  const requestCopy =
    variant === "withdrawal"
      ? {
          row1:
            "Your withdrawal request has been successfully submitted and is currently under management review.",
          row2:
            "Verification and processing may take up to 24 hours. Once the management review is completed, your withdrawal request will continue through the required processing steps.",
        }
      : {
          row1:
            "Your deposit request has been successfully submitted and is currently under management review.",
          row2:
            "Verification and processing may take up to 24 hours. Once the management review is completed, your deposit amount will be credited to your Balance Account.",
        };

  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-4"
      onClick={handleClose}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />

      {isRequestFlow ? (
        <div
          className="animate-slide-up relative w-full max-w-md rounded-2xl bg-gradient-to-br from-[#F6E27A] via-[#D4AF37] to-[#8A6D1B] p-[1.5px] shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_30px_rgba(212,175,55,0.18)]"
          onClick={(event) => event.stopPropagation()}
          role="alertdialog"
          aria-live="assertive"
          aria-modal="true"
          aria-label={title}
        >
          <div className="relative max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-[#0A1128] to-[#001F3F] px-5 py-5 sm:px-6 sm:py-6">
            <WatermarkGraphic />

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close notification"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative mb-4 flex items-start gap-3.5 pr-8">
              <ShieldBadge />
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-bold leading-7 tracking-tight sm:text-xl">
                  {lead && <span className="text-white">{lead} </span>}
                  <span className="bg-gradient-to-r from-[#F6E27A] via-[#E9C767] to-[#D4AF37] bg-clip-text text-transparent">
                    {accent}
                  </span>
                </h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-green-300/90">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Verified request received</span>
                </div>
              </div>
            </div>

            <div className="relative mb-2">
              <StatusPill />
            </div>

            <div className="relative">
              <InfoRow icon={<FileCheck className="h-[18px] w-[18px] text-[#E9C767]" strokeWidth={1.9} />}>
                {requestCopy.row1}
              </InfoRow>
              <InfoRow icon={<Clock className="h-[18px] w-[18px] text-cyan-300" strokeWidth={1.9} />}>
                {requestCopy.row2}
              </InfoRow>
              <InfoRow
                isLast
                icon={<Handshake className="h-[18px] w-[18px] text-emerald-300" strokeWidth={1.9} />}
              >
                <p>Thank you for your patience.</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  — OFA Management
                </p>
              </InfoRow>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`animate-slide-up relative w-full max-w-sm rounded-2xl border px-5 py-5 shadow-2xl ${
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
            <h3 className="min-w-0 flex-1 break-words text-lg font-semibold">{title}</h3>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close notification"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-current opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="break-words text-sm leading-6 opacity-95" style={{ whiteSpace: "pre-line" }}>
            {message}
          </p>

          <button
            type="button"
            onClick={handleClose}
            className={`mt-4 flex min-h-[44px] w-full items-center justify-center rounded-full text-sm font-semibold text-white transition-all duration-300 hover:brightness-110 active:scale-[0.99] ${
              isSuccess
                ? "bg-gradient-to-r from-emerald-600 to-green-600 shadow-[0_8px_24px_rgba(16,185,129,0.35)]"
                : "bg-gradient-to-r from-rose-600 to-red-600 shadow-[0_8px_24px_rgba(244,63,94,0.35)]"
            }`}
          >
            Close
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
