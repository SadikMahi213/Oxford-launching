import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useInView } from "react-intersection-observer";
import { Plus, Minus } from "lucide-react";
import Button from "./Button";

export default function FAQ() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "What is Oxford Financial Ads?",
      answer:
        "Oxford Financial Ads is an AI-powered arbitrage trading platform that uses the Arbitrum network to generate profits by taking advantage of price differences across multiple exchanges with minimal risk.",
    },
    {
      question: "What is the OFA token and how can I get it?",
      answer:
        "OFA is the native token of our ecosystem. By completing pre-registration, you will receive 100 free tokens, and you can earn additional bonus tokens for each successful referral.",
    },
    {
      question: "Why are my OFA tokens locked?",
      answer:
        "Tokens are currently locked to maintain price stability and market value. According to our roadmap, they will be gradually unlocked and available for withdrawal after exchange listings.",
    },
    {
      question: "Can I withdraw my daily trading profits (USDT)?",
      answer:
        "Yes. You can withdraw the daily ROI generated from your investment package at any time directly to your personal wallet.",
    },
    {
      question: "How secure is my investment?",
      answer:
        "We use the Arbitrum Layer-2 network, which is highly secure. Our AI bot does not trade based on speculation but uses mathematical data and analytics to execute trades, ensuring fund safety.",
    },
    {
      question: "How does the referral commission system work?",
      answer:
        "We offer a powerful 5-level referral system. When someone joins through your referral, you will earn daily commissions along with bonus OFA tokens.",
    },
  ];

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6">
            <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              FAQ
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
        </motion.div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors duration-300"
              >
                <span className="text-lg font-semibold pr-4">
                  {faq.question}
                </span>
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
                  {openIndex === idx ? (
                    <Minus className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Plus className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <p className="text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-xl border border-blue-500/30"
        >
          <h3 className="text-2xl font-bold mb-3">Still have questions?</h3>
          <p className="text-gray-150 mb-6">
            Our support team is available 24/7 to help you with anything related
            to Oxford Financial Ads.
          </p>
          <Button
            onClick={() =>
              window.open("https://t.me/Arbigrow", "_blank")
            }
            variant="gradient"
            fullWidth={false}
            className="mt-4  block mx-auto"
          >
            Contact Support
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
