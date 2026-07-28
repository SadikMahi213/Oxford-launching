import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n/config";
import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";

const LanguageSwitcher = ({ position = "bottom" }) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const switchLang = (code) => {
    i18n.changeLanguage(code);
    if (typeof window !== "undefined") localStorage.setItem("i18nextLng", code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs"
        title={t("language.switch")}
      >
        <Globe className="w-3.5 h-3.5" />
        
      </button>
      {open && (
        <div
          className={`absolute ${position === "top" ? "bottom-full mb-1" : "top-full mt-1"} right-0 min-w-[180px] rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 py-1 max-h-[300px] overflow-y-auto`}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLang(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all ${
                i18n.language === lang.code
                  ? "text-cyan-400 bg-cyan-500/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto text-[9px] text-cyan-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
