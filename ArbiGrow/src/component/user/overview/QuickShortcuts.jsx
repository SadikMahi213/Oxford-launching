import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export function QuickShortcuts({ shortcuts }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></span>
        {t("quickShortcuts.title")}
      </h3>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {shortcuts.map((shortcut, idx) => (
          <motion.button
            key={shortcut.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={shortcut.onClick}
            disabled={shortcut.comingSoon}
            className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 ${
              shortcut.comingSoon
                ? 'bg-white/[0.02] border border-white/5 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                shortcut.comingSoon
                  ? 'bg-white/[0.03]'
                  : 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20 group-hover:from-blue-600/30 group-hover:to-cyan-600/30'
              }`}
            >
              <shortcut.icon
                className={`w-5 h-5 ${
                  shortcut.comingSoon ? 'text-gray-600' : 'text-cyan-400 group-hover:scale-110 transition-transform'
                }`}
              />
            </div>
            <span className={`text-[10px] text-center leading-tight ${shortcut.comingSoon ? 'text-gray-600' : 'text-gray-400 group-hover:text-cyan-400'}`}>
              {shortcut.label}
            </span>
            {shortcut.comingSoon && (
              <span className="absolute -top-1 -right-1 text-[8px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {t("quickShortcuts.soon")}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
