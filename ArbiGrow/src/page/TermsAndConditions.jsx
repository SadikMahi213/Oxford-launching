import { motion } from 'motion/react';
import { FileText, Shield, AlertCircle,Scale, Lock, Wallet ,ShieldOff} from 'lucide-react';
import Navbar from '../component/Navbar';

export function TermsAndConditions() {
const sections = [
  {
    title: '1. Investment Risk Warning',
    icon: AlertCircle,
    content: [
      'Market Volatility: Cryptocurrency and trading markets are highly volatile. Although we use AI technology to minimize risk, the value of investments may increase or decrease at any time.',
      'Capital Risk: Investors should understand that trading carries the risk of losing capital as well as making profits. Only surplus or discretionary funds should be invested.',
      'Past Performance: Past results do not guarantee future profits.',
    ],
  },

  {
    title: '2. User Eligibility',
    icon: Shield,
    content: [
      'Users must be legally adults according to their country laws (generally 18 years or older).',
      'Using the platform for illegal purposes or money laundering is strictly prohibited.',
    ],
  },

  {
    title: '3. Decentralized Security and Responsibility',
    icon: Lock,
    content: [
      'Wallet Security: Oxford Financial Ads is a decentralized platform, and you are fully responsible for your wallet’s private key and password. If lost, the company cannot recover your funds.',
      'Technical Limitations: Although we use Arbitrum and Offchain Labs’ robust network, Oxford Financial Ads is not liable for blockchain network failures or network congestion.',
    ],
  },

  {
    title: '4. Deposit & Withdrawal Rules',
    icon:Wallet,
    content: [
      'Processing Time: Deposits and withdrawals are generally instant, but may be delayed due to network traffic.',
      'Fees: Network gas fees and platform service charges may change over time and will be displayed during the transaction.',
    ],
  },

  {
    title: '5. Account Termination',
    icon: ShieldOff,
    content: [
      'If a user engages in scams, hacking attempts, or misuses platform logic, Oxford Financial Ads reserves the right to block the account without prior notice.',
    ],
  },

  {
    title: '6. Service Amendments',
    icon: FileText,
    content: [
      'Oxford Financial Ads reserves the right to update its rules, trading fees, or platform logic at any time. Major changes will be communicated to the global community in advance.',
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
            Terms and{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Conditions
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-4">
            Please read these terms and conditions carefully before using the Oxford Financial Ads platform
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
              <h3 className="text-lg font-semibold text-amber-400 mb-2">Important Notice</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                By accessing or using Oxford Financial Ads, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. Cryptocurrency trading involves substantial risk and may not be suitable for all investors. You should carefully consider your investment objectives and risk tolerance before using our platform.
              </p> <br />
              <p className="text-gray-300 text-sm leading-relaxed">

                 Oxford Financial Ads is a technology provider, not a financial advisory firm.Our AI logic is for data analysis only. Please conduct your own market research before investing.
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
              <h3 className="text-xl font-semibold mb-3">Questions About These Terms?</h3>
              <p className="text-gray-400 mb-4">
                If you have any questions about these Terms and Conditions, please contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  <span className="text-cyan-400 font-medium">Email:</span> support.oxfordfinancialads@gmail.com  
                </p>
                <p className="text-gray-300">
                  <span className="text-cyan-400 font-medium">Address:</span> 1234 Crypto Boulevard, Suite 500, Delaware, USA
                </p>
              </div>
            </div>
          </div>
        </motion.div>

          {/* Footer Section
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-12 text-center px-6 py-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl border border-blue-500/20"
          >
            <p className="text-gray-300 text-sm md:text-base">{footerNote}</p>
          </motion.div> */}

        {/* Acceptance Button */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 text-center"
        >
          <a
            href="#home"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
            <CheckCircle className="w-5 h-5 relative z-10" />
            <span className="relative z-10">I Accept These Terms</span>
          </a>
        </motion.div> */}
      </div>
    </section>
      </>
  );
}
