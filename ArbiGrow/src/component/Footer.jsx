import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import {
  Send,
  Mail,
  FileText,
  Shield,
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
                {t("footer.brandName")}
              </div>
              <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
                {t("footer.description")}
              </p>

              {/* Social Links */}
              <div className="flex gap-4">
                {/* Telegram */}
                <a
                  href="https://t.me/+aIajLcllDPBlOTE0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-600 hover:border-cyan-600 transition-all duration-300"
                >
                  <Send className="w-5 h-5" />
                </a>

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
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
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
