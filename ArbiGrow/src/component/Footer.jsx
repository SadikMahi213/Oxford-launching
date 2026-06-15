import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";
import {
  Facebook,
  Send,
  Mail,
  FileText,
  Shield,
  AlertTriangle,
  Youtube,
  Twitter,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function Footer() {
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
                Decentralized AI trading infrastructure built on Arbitrum.
                Next-generation automated trading powered by blockchain security
                and advanced algorithms.
              </p>

              {/* Social Links */}
              <div className="flex gap-4">
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/share/189Y6dLmQq/"
                  target="_blank"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all duration-300"
                >
                  <Facebook className="w-5 h-5" />
                </a>

                {/* Telegram */}
                <a
                  href="https://t.me/Arbigrow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-600 hover:border-cyan-600 transition-all duration-300"
                >
                  <Send className="w-5 h-5" />
                </a>

                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@arbigrowofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all duration-300"
                >
                  <Youtube className="w-5 h-5" />
                </a>

                {/* Twitter */}
                <a
                  href="https://x.com/arbigrow"
                  target="_blank"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-sky-500 hover:border-sky-500 transition-all duration-300"
                >
                  <Twitter className="w-5 h-5" />
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
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-3">
                <li onClick={() => navigate("/terms-conditions")}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Terms & Conditions
                  </a>
                </li>
                <li onClick={() => navigate("/privacy-policy")}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Privacy Policy
                  </a>
                </li>
                <li onClick={() => navigate("/legal-information")}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Legal Information
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Column */}
            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-3">
                <li className="text-gray-400">
                  <span className="block text-sm mb-1">Official Email</span>
                  <a
                    href="mailto:support.oxfordfinancialads@gmail.com"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    support.oxfordfinancialads@gmail.com
                  </a>
                </li>
                <li className="text-gray-400">
                  <span className="block text-sm mb-1">Support</span>
                  <a
                    href="mailto:support.oxfordfinancialads@gmail.com"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    support.oxfordfinancialads@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Risk Disclaimer */}
          <div className="mb-8 p-6 rounded-xl bg-orange-900/10 border border-orange-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-400 mb-2">
                  Risk Disclaimer
                </h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Trading cryptocurrencies and digital assets carries
                  significant risk. Past performance is not indicative of future
                  results. Oxford Financial Ads does not provide financial advice. All users
                  trade at their own risk and should only invest capital they
                  can afford to lose. This platform is not available in
                  restricted jurisdictions. Please consult with a qualified
                  financial advisor before making investment decisions.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col items-center gap-4 text-center">
            <div className="text-gray-400 text-sm">
              © 2026 Oxford Financial Ads. All rights reserved. C-Corporation registered in
              Delaware, USA.
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>Powered by Arbitrum</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
              <span>Built on Ethereum</span>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
