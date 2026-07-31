import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Scale, FileText, Database, Network, ShieldCheck, AlertCircle } from 'lucide-react';
import Navbar from '../component/Navbar';

export default function LegalPage() {
  const { t } = useTranslation();

  const sections = useMemo(() => [
    {
      title: t('legalInfo.sections.s1_title'),
      icon: Database,
      content: [t('legalInfo.sections.s1_c1'), t('legalInfo.sections.s1_c2'), t('legalInfo.sections.s1_c3'), t('legalInfo.sections.s1_c4')],
    },
    {
      title: t('legalInfo.sections.s2_title'),
      icon: Network,
      content: [t('legalInfo.sections.s2_c1'), t('legalInfo.sections.s2_c2'), t('legalInfo.sections.s2_c3'), t('legalInfo.sections.s2_c4')],
    },
    {
      title: t('legalInfo.sections.s3_title'),
      icon: FileText,
      content: [t('legalInfo.sections.s3_c1'), t('legalInfo.sections.s3_c2'), t('legalInfo.sections.s3_c3'), t('legalInfo.sections.s3_c4'), t('legalInfo.sections.s3_c5'), t('legalInfo.sections.s3_c6')],
    },
    {
      title: t('legalInfo.sections.s4_title'),
      icon: ShieldCheck,
      content: [t('legalInfo.sections.s4_c1'), t('legalInfo.sections.s4_c2'), t('legalInfo.sections.s4_c3')],
    },
  ], [t]);

  return (
    <>
      <Navbar />
      <section className="relative py-28 px-4 overflow-hidden">
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
              {t('legalInfo.title')}{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {t('legalInfo.titleHighlight')}
              </span>
            </h1>

            <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-4">
              {t('legalInfo.subtitle')}
            </p>

            <p className="text-sm text-gray-500">{t('legalInfo.lastUpdated')}</p>
          </motion.div>

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
                  {t('legalInfo.legalDisclaimer')}
                </h3>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {t('legalInfo.disclaimerText1')}
                </p>

                <p className="text-gray-300 text-sm leading-relaxed mt-4">
                  {t('legalInfo.disclaimerText2')}
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
                    <p key={pIndex} className="text-gray-400 leading-relaxed text-sm md:text-base">
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
