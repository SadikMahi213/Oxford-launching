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
            className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-3 sm:p-5 shadow-2xl max-h-[calc(100dvh-0.75rem)] sm:max-h-[90dvh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 top-2 sm:right-3 sm:top-3 rounded-full bg-gray-100 text-gray-900 p-1.5 sm:p-2 hover:bg-gray-200 transition-colors"
              aria-label={t("common.closeAnnouncement")}
            >
              <X className="h-4 w-4 sm:h-4 sm:w-4" />
            </button>

            {announcement.image_url ? (
              <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <img
                  src={announcement.image_url}
                  alt={announcement.title}
                  className="w-full max-h-[46dvh] object-contain bg-gray-50"
                />
              </div>
            ) : null}

            <div className="pr-8 sm:pr-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-700">
                <Megaphone className="h-3.5 w-3.5" />
                {t("common.announcement")}
              </div>
              <h3 className="mt-3 text-lg sm:text-xl font-bold leading-tight text-gray-900">
                {announcement.title}
              </h3>
              {announcement.message && (
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-700 break-words">
                  {announcement.message}
                </p>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
