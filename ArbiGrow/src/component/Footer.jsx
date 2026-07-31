import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import {
  Send,
  Mail,
  FileText,
  Shield,
  Facebook,
  Instagram,
  Linkedin,
  Youtube
} from "lucide-react";
import { useNavigate } from "react-router";

const TikTok = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
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
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#0088cc] hover:border-[#0088cc] transition-all duration-300"
                >
                  <Send className="w-5 h-5" />
                </a>

                {/* Facebook */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#1877F2] hover:border-[#1877F2] transition-all duration-300"
                >
                  <Facebook className="w-5 h-5" />
                </a>

                {/* Instagram */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E4405F] hover:border-[#E4405F] transition-all duration-300"
                >
                  <Instagram className="w-5 h-5" />
                </a>

                {/* TikTok */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#ff0050] hover:border-[#ff0050] transition-all duration-300"
                >
                  <TikTok className="w-5 h-5" />
                </a>

                {/* LinkedIn */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#0A66C2] hover:border-[#0A66C2] transition-all duration-300"
                >
                  <Linkedin className="w-5 h-5" />
                </a>

                {/* YouTube */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF0000] hover:border-[#FF0000] transition-all duration-300"
                >
                  <Youtube className="w-5 h-5" />
                </a>

                {/* Mail */}
                <a
                  href="mailto:support.oxfordfinancialads@gmail.com"
                  target="_blank"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-600 transition-all duration-300"
                >
                  <Mail className="w-5 h-5" />
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
