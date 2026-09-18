import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { FileText, Network, Cookie, UserCheck, Database, Scale, Lock, AlertCircle } from 'lucide-react';
import Navbar from '../component/Navbar';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  const sections = useMemo(() => [
    {
      title: t('privacyPolicy.sections.s1_title'),
      icon: Database,
      content: [t('privacyPolicy.sections.s1_c1'), t('privacyPolicy.sections.s1_c2'), t('privacyPolicy.sections.s1_c3'), t('privacyPolicy.sections.s1_c4')],
    },
    {
      title: t('privacyPolicy.sections.s2_title'),
      icon: Lock,
      content: [t('privacyPolicy.sections.s2_c1'), t('privacyPolicy.sections.s2_c2'), t('privacyPolicy.sections.s2_c3')],
    },
    {
      title: t('privacyPolicy.sections.s3_title'),
      icon: FileText,
      content: [t('privacyPolicy.sections.s3_c1'), t('privacyPolicy.sections.s3_c2'), t('privacyPolicy.sections.s3_c3')],
    },
    {
      title: t('privacyPolicy.sections.s4_title'),
      icon: Network,
      content: [t('privacyPolicy.sections.s4_c1'), t('privacyPolicy.sections.s4_c2')],
    },
    {
      title: t('privacyPolicy.sections.s5_title'),
      icon: Cookie,
      content: [t('privacyPolicy.sections.s5_c1'), t('privacyPolicy.sections.s5_c2')],
    },
    {
      title: t('privacyPolicy.sections.s6_title'),
      icon: UserCheck,
      content: [t('privacyPolicy.sections.s6_c1'), t('privacyPolicy.sections.s6_c2'), t('privacyPolicy.sections.s6_c3')],
    },
  ], [t]);

  return (
    <>
      <Navbar />
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-40 left-0 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-0 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
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
              {t('privacyPolicy.title')}{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {t('privacyPolicy.titleHighlight')}
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-4">
              {t('privacyPolicy.subtitle')}
            </p>
            <p className="text-sm text-gray-500">
              {t('privacyPolicy.lastUpdated')}
            </p>
          </motion.div>

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
                <h3 className="text-lg font-semibold text-amber-400 mb-2">{t('terms.importantNotice')}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t('terms.noticeText1')}
                </p>
                <p className="text-gray-300 text-sm leading-relaxed mt-4">
                  {t('terms.noticeText2')}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500"
              >
                <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative">
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

                  <div className="space-y-4 pl-16">
                    {section.content.map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-gray-400 leading-relaxed text-sm md:text-base">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

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
                <h3 className="text-xl font-semibold mb-3">{t('privacyPolicy.questionsTitle')}</h3>
                <p className="text-gray-400 mb-4">
                  {t('privacyPolicy.questionsText')}
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <span className="text-cyan-400 font-medium">{t('terms.email')}</span> support.oxfordfinancialads@gmail.com
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-400 font-medium">{t('terms.address')}</span> 1234 Crypto Boulevard, Suite 500, Delaware, USA
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
