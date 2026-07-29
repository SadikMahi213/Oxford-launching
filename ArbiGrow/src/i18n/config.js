import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import bn from "./locales/bn.json";
import hi from "./locales/hi.json";
import ur from "./locales/ur.json";
import id from "./locales/id.json";
import vi from "./locales/vi.json";
import ms from "./locales/ms.json";
import tl from "./locales/tl.json";
import ptBR from "./locales/pt-BR.json";
import esMX from "./locales/es-MX.json";
import enNG from "./locales/en-NG.json";

const savedLang = typeof window !== "undefined" && localStorage.getItem("i18nextLng");
const browserLang = typeof window !== "undefined" && navigator.language?.slice(0, 2);
const supported = ["en", "bn", "hi", "ur", "id", "vi", "ms", "tl", "pt", "es"];

let detected = "en";
if (savedLang && supported.includes(savedLang)) detected = savedLang;
else if (browserLang && supported.includes(browserLang)) detected = browserLang;

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", label: "اردو", flag: "🇵🇰" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "tl", label: "Filipino", flag: "🇵🇭" },
  { code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
  { code: "es-MX", label: "Español (MX)", flag: "🇲🇽" },
  { code: "en-NG", label: "English (NG)", flag: "🇳🇬" },
];

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    bn: { translation: bn },
    hi: { translation: hi },
    ur: { translation: ur },
    id: { translation: id },
    vi: { translation: vi },
    ms: { translation: ms },
    tl: { translation: tl },
    "pt-BR": { translation: ptBR },
    "es-MX": { translation: esMX },
    "en-NG": { translation: enNG },
  },
  lng: detected,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export default i18n;
