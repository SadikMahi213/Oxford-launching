import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import {
  Facebook,
  Send,
  Mail,
  FileText,
  Shield,

  Youtube,
  Twitter,
} from "lucide-react";
import { useNavigate } from "react-router";

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
                Oxford Financial Ads
              </div>
              <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
                {t("footer.description")}
              </p>

              {/* Social Links */}
              <div className="flex gap-4">
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/share/1EMeQasFKm/"
                  target="_blank"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all duration-300"
                >
                  <Facebook className="w-5 h-5" />
                </a>

                {/* Telegram */}
                <a
                  href="https://t.me/+aIajLcllDPBlOTE0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-600 hover:border-cyan-600 transition-all duration-300"
                >
                  <Send className="w-5 h-5" />
                </a>

                {/* YouTube */}
                <a
                  href="https://youtube.com/@oxfordfinancialads?si=d2gVVW5NJBZyGbZF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all duration-300"
                >
                  <Youtube className="w-5 h-5" />
                </a>

                {/* Twitter — Coming Soon */}
                <div
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center opacity-50 cursor-not-allowed group relative"
                  title={t("common.comingSoon")}
                >
                  <Twitter className="w-5 h-5" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{t("common.comingSoon")}</span>
                </div>

                {/* Mail */}
                <a
                  href="mailto:support.oxfordfinancialads@gmail.com"
                  target="_blank"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all duration-300"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="font-bold mb-4">{t("footer.legal")}</h3>
              <ul className="space-y-3">
                <li onClick={() => navigate("/terms-conditions")}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t("footer.terms")}
                  </a>
                </li>
                <li onClick={() => navigate("/privacy-policy")}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {t("footer.privacy")}
                  </a>
                </li>
                <li onClick={() => navigate("/legal-information")}>
                  <a
                    href="#"
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
              <h3 className="font-bold mb-4">{t("footer.globalContact")}</h3>
              <ul className="space-y-3">
                <li className="text-gray-400">
                  <span className="block text-sm text-cyan-400 font-medium">{t("footer.contactName")}</span>
                  <span className="block text-xs text-gray-500">{t("footer.contactDesc")}</span>
                </li>
                <li className="text-gray-400">
                  <span className="block text-sm mb-1">{t("footer.officialEmail")}</span>
                  <a
                    href="mailto:support.oxfordfinancialads@gmail.com"
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    support.oxfordfinancialads@gmail.com
                  </a>
                </li>
                <li className="text-gray-400 text-xs">
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
