import { motion } from "motion/react";
import {
  Scale,
  FileText,
  Database,
  Network,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import Navbar from "../component/Navbar";

export default function LegalPage() {
  const sections = [
    {
      title: "1. Company Identity",
      icon: Database,
      content: [
        "Company Name: Oxford Financial Ads",
        "Platform Type: Decentralized AI Trading Infrastructure",
        "Operating Network: Arbitrum One (Layer-2)",
        "Oxford Financial Ads operates with transparency, technological integrity, and regulatory awareness in all business activities.",
      ],
    },

    {
      title: "2. Technology Partnership & Infrastructure",
      icon: Network,
      content: [
        "Oxford Financial Ads’s operational systems and smart contracts are built using Arbitrum Nitro technology developed by Offchain Labs, Inc.",
        "Technology Provider Reference: Offchain Labs, Inc. – Developers of the Arbitrum ecosystem.",
        "All transaction security and data settlement are protected by the Ethereum Mainnet (Layer-1).",
        "Arbitrum’s Layer-2 scaling protocol ensures high-speed, low-cost, and secure blockchain execution.",
      ],
    },

    {
      title: "3. Registration & License",
      icon: FileText,
      content: [
        "Legal Identity: C-Corporation",
        "State of Registration: Delaware, USA",
        "Registration Number: 7114194 (Delaware Division of Corporations)",
        "Registration Date: August 27, 2018",
        "Headquarters: Princeton, New Jersey, USA",
        "Official Websites: offchainlabs.com / arbitrum.io / oxfordfinancialads.com",
      ],
    },

    {
      title: "4. Compliance & Regulation",
      icon: ShieldCheck,
      content: [
        "We are committed to complying with international Anti-Money Laundering (AML) regulations.",
        "Know Your Customer (KYC) procedures are maintained to ensure platform integrity and prevent fraudulent activities.",
        "User data protection, blockchain transparency, and regulatory responsibility are core principles of our infrastructure.",
      ],
    },
  ];

  return (
    <>
      <Navbar />

      <section className="relative py-28 px-4 overflow-hidden">
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
              Legal Information &{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Compliance
              </span>
            </h1>

            <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-4">
              Legal identity, technological framework, and regulatory compliance
              structure of the Oxford Financial Ads platform.
            </p>

            <p className="text-sm text-gray-500">Last Updated: February 2026</p>
          </motion.div>

          {/* Legal Disclaimer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-2">
                  Legal Disclaimer
                </h3>

                <p className="text-gray-300 text-sm leading-relaxed">
                  Oxford Financial Ads is a technology driven platform.
                  Cryptocurrency trading involves significant market risks.
                  While we strive to reduce risks through advanced AI analytics
                  and Arbitrum’s high-speed blockchain infrastructure, investors
                  are strongly advised to conduct their own independent research
                  and risk assessment before making financial decisions.
                </p>

                <p className="text-gray-300 text-sm leading-relaxed mt-4">
                  Oxford Financial Ads does not provide financial, investment, or legal
                  advisory services. All investment decisions remain solely the
                  responsibility of the user.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Legal Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                    <section.icon className="w-6 h-6 text-cyan-400" />
                  </div>

                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {section.title}
                  </h2>
                </div>

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
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
