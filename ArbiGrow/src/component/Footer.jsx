import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import { FileText, Shield } from "lucide-react";
import { useNavigate } from "react-router";

const TelegramIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const FacebookIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const LinkedInIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
  </svg>
);

const YouTubeIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const MailIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67zM22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908z" />
  </svg>
);

export default function Footer() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <footer ref={ref} className="py-16 px-4 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          {/* Main Footer Content */}
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div className="md:col-span-2">
              <div className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {t("footer.brandName")}
              </div>
              <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
                {t("footer.description")}
              </p>

              {/* Social Links */}
              <div className="flex flex-wrap gap-4">
                {/* Telegram */}
                <a
                  href="https://t.me/+aIajLcllDPBlOTE0"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.social.telegram")}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#229ED9] hover:bg-[#229ED9] hover:text-white hover:border-[#229ED9] hover:scale-110 transition-all duration-300"
                >
                  <TelegramIcon className="w-5 h-5" />
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/share/1EMeQasFKm/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.social.facebook")}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] hover:scale-110 transition-all duration-300"
                >
                  <FacebookIcon className="w-5 h-5" />
                </a>

                {/* Instagram */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.social.instagram")}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#E4405F] hover:bg-[#E4405F] hover:text-white hover:border-[#E4405F] hover:scale-110 transition-all duration-300"
                >
                  <InstagramIcon className="w-5 h-5" />
                </a>

                {/* TikTok */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.social.tiktok")}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#010101] hover:bg-[#010101] hover:text-white hover:border-[#010101] hover:scale-110 transition-all duration-300"
                >
                  <TikTokIcon className="w-5 h-5" />
                </a>

                {/* LinkedIn */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.social.linkedin")}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] hover:scale-110 transition-all duration-300"
                >
                  <LinkedInIcon className="w-5 h-5" />
                </a>

                {/* YouTube */}
                <a
                  href="https://youtube.com/@oxfordfinancialads?si=d2gVVW5NJBZyGbZF"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.social.youtube")}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#FF0000] hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] hover:scale-110 transition-all duration-300"
                >
                  <YouTubeIcon className="w-5 h-5" />
                </a>

                {/* Mail */}
                <a
                  href="mailto:support.oxfordfinancialads@gmail.com"
                  target="_blank"
                  aria-label={t("footer.social.mail")}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:scale-110 transition-all duration-300"
                >
                  <MailIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="font-bold mb-4">{t("footer.legal")}</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="/terms-conditions"
                    onClick={(e) => { e.preventDefault(); navigate("/terms-conditions"); }}
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t("footer.terms")}
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy-policy"
                    onClick={(e) => { e.preventDefault(); navigate("/privacy-policy"); }}
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {t("footer.privacy")}
                  </a>
                </li>
                <li>
                  <a
                    href="/legal-information"
                    onClick={(e) => { e.preventDefault(); navigate("/legal-information"); }}
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t("footer.legalInfo")}
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Column */}
            <div>
              <h3 className="font-bold mb-4">{t("footer.locationTitle")}</h3>
              <ul className="space-y-2">
                <li className="text-gray-400 text-xs">
                  <span className="block">{t("footer.address1")}</span>
                  <span className="block">{t("footer.address2")}</span>
                  <span className="block">{t("footer.address3")}</span>
                  <span className="block">{t("footer.address4")}</span>
                </li>
                <li className="text-gray-400 pt-2">
                  <span className="block text-xs text-gray-500">{t("footer.contactDesc")}</span>
                </li>
                <li className="text-gray-400 pt-2">
                  <span className="block text-sm mb-1">{t("footer.officialEmail")}</span>
                  <a
                    href="mailto:support.oxfordfinancialads@gmail.com"
                    className="text-cyan-400 hover:text-cyan-300 text-sm break-all"
                  >
                    {t("footer.supportEmail")}
                  </a>
                </li>
                <li className="text-gray-400 text-xs pt-2">
                  <span className="block">{t("footer.serving")}</span>
                  <span className="block">{t("footer.support247")}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col items-center gap-4 text-center">
            <div className="text-gray-400 text-sm">
              {t("footer.copyright")}
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
