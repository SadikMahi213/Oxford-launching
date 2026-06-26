import { motion, AnimatePresence } from "motion/react";
import { Megaphone, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AnnouncementModal({ open, announcement, onClose }) {
  const { t } = useTranslation();
  if (!announcement) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-[2px] p-2 sm:p-4 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-cyan-300/20 bg-gradient-to-b from-[#005ecb] via-[#0a57b7] to-[#0c4d9c] p-3 sm:p-5 shadow-[0_24px_80px_rgba(2,23,70,0.55)] max-h-[calc(100dvh-0.75rem)] sm:max-h-[90dvh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 top-2 sm:right-3 sm:top-3 rounded-full bg-white text-slate-900 p-1.5 sm:p-2 hover:bg-slate-100 transition-colors"
              aria-label={t("common.closeAnnouncement")}
            >
              <X className="h-4 w-4 sm:h-4 sm:w-4" />
            </button>

            <div className="pr-8 sm:pr-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-white">
                <Megaphone className="h-3.5 w-3.5" />
                {t("common.announcement")}
              </div>
              <h3 className="mt-3 text-lg sm:text-xl font-bold leading-tight text-white">
                {announcement.title}
              </h3>
              {announcement.message && (
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-blue-100 break-words">
                  {announcement.message}
                </p>
              )}
            </div>

            {announcement.image_url ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-white/20 bg-[#0a2e6b]">
                <img
                  src={announcement.image_url}
                  alt={announcement.title}
                  className="w-full max-h-[46dvh] object-contain bg-[#0a2e6b]"
                />
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-yellow-500/30 hover:opacity-95 transition"
              >
                {t("common.continue")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
