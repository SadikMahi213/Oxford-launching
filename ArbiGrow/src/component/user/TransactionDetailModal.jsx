import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, X } from "lucide-react";

// Shared mobile transaction detail modal for deposit/withdraw history cards.
// Parents pass display-ready strings so formatting/status helpers stay in one place.
export default function TransactionDetailModal({
  title,
  amountValue,
  amountClassName = "text-emerald-300",
  rows = [],
  statusLabel = "Status",
  statusText = "-",
  statusClassName = "text-gray-400 bg-gray-500/10 border-gray-500/30",
  copiedText = "Copied!",
  onClose,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onClose]);

  const copyValue = async (value) => {
    if (!value || value === "-") return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch {
      // Clipboard API unavailable; still show feedback below.
    }

    setCopiedKey(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiedKey(null), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B132B] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`mt-3 break-words text-center text-2xl font-extrabold ${amountClassName}`}>
          {amountValue}
        </div>

        <div className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {row.label}
              </span>
              {row.copyValue ? (
                <button
                  type="button"
                  onClick={() => copyValue(row.copyValue)}
                  className="flex min-w-0 items-center gap-1.5 text-[12px] text-blue-400"
                >
                  <span className={`truncate ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                  {copiedKey === row.copyValue ? (
                    <Check size={14} className="shrink-0 text-emerald-400" />
                  ) : (
                    <Copy size={14} className="shrink-0" />
                  )}
                </button>
              ) : (
                <span className={`min-w-0 truncate text-right text-[12px] text-gray-200 ${row.mono ? "font-mono" : ""}`}>
                  {row.value}
                </span>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {statusLabel}
            </span>
            <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClassName}`}>
              {statusText}
            </span>
          </div>
        </div>

        {copiedKey && (
          <div className="mt-3 text-center text-xs font-semibold text-emerald-400">
            {copiedText}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
