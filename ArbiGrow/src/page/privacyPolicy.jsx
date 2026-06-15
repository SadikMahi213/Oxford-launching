import { motion } from "motion/react";
import { FileText, Network, Cookie,UserCheck,Database,Scale, Lock,AlertCircle } from "lucide-react";

import Navbar from "../component/Navbar";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Types of Information Collected",
      icon:Database,
      content: [
        "Since Oxford Financial Ads is a decentralized platform, we do not collect your personal files like traditional banks.",
        "Wallet Address: Your public wallet address used to execute transactions.",
        "Technical Data: IP address, device type, and browser information to ensure security.",
        "Communication Data: Any emails or messages you provide when contacting our support team.",
      ],
    },

    {
      title: "2. How We Protect Your Data",
      icon: Lock,
      content: [
        "End-to-End Encryption: All communication between our app and servers is secured with advanced encryption.",
        "No Private Key Access: Oxford Financial Ads never asks for or stores your wallet private key or seed phrase. Full control of your funds remains with you.",
        "Blockchain Transparency: All transaction records are transparently stored on Arbitrum Explorer and cannot be altered.",
      ],
    },

    {
      title: "3. How We Use Your Data",
      icon: FileText,
      content: [
        "To manage your trading account and facilitate transactions.",
        "To enhance platform security and prevent fraud.",
        "To send system updates or important notifications.",
      ],
    },

    {
      title: "4. Third-Party Disclosure",
      icon: Network,
      content: [
        "Oxford Financial Ads does not sell or rent your personal information or trading data to any third party.",
        "However, technical data may be processed when required by law or for the operation of the blockchain network (such as Arbitrum).",
      ],
    },

    {
      title: "5. Use of Cookies",
      icon: Cookie,
      content: [
        "Our website may use small cookies to improve your browsing experience and help you log in faster.",
        "You can disable cookies from your browser settings if you prefer.",
      ],
    },

    {
      title: "6. Your Rights",
      icon: UserCheck,
      content: [
        "Verify information related to your account.",
        "Remove your account from our platform at any time.",
        "Security Tips: Oxford Financial Ads admin will never ask for your password or recovery phrase. Avoid sharing such information with anyone.",
      ],
    },
  ];

  return (
    <>
      <Navbar />
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-40 left-0 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-0 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 pt-3"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-6">
              <Scale className="w-10 h-10 text-blue-400" />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Privacy and{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Policy
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-4">
              Please read these privacy and policies carefully before using the
              Oxford Financial Ads platform
            </p>
            <p className="text-sm text-gray-500">
              Last Updated: February 13, 2026
            </p>
          </motion.div>

          {/* Important Notice Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-2">
                  Important Notice
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  By accessing or using Oxford Financial Ads, you acknowledge that you have
                  read, understood, and agree to be bound by these Terms and
                  Conditions. Cryptocurrency trading involves substantial risk
                  and may not be suitable for all investors. You should
                  carefully consider your investment objectives and risk
                  tolerance before using our platform.
                </p>
                <p className="text-gray-300 text-sm leading-relaxed mt-4">
                  Oxford Financial Ads is a technology provider, not a financial advisory
                  firm.Our AI logic is for data analysis only. Please conduct
                  your own market research before investing.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Terms Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500"
              >
                {/* Glow effect on hover */}
                <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative">
                  {/* Section Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                      <section.icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  {/* Section Content */}
                  <div className="space-y-4 pl-16">
                    {section.content.map((paragraph, pIndex) => (
                      <p
                        key={pIndex}
                        className="text-gray-400 leading-relaxed text-sm md:text-base"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">
                  Questions About These Privacy Policy?
                </h3>
                <p className="text-gray-400 mb-4">
                  If you have any questions about these Privacy Policy,
                  please contact us:
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <span className="text-cyan-400 font-medium">Email:</span>{" "}
                    support.oxfordfinancialads@gmail.com
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-400 font-medium">Address:</span>{" "}
                    1234 Crypto Boulevard, Suite 500, Delaware, USA
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
