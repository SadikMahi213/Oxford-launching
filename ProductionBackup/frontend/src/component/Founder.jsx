import { motion } from 'motion/react';
import { Twitter, Linkedin } from 'lucide-react';
import { useTranslation } from "react-i18next";

const FOUNDER_DATA = [
  { nameKey: "home.founders.member1.name", titleKey: "home.founders.member1.title", image: '/8ae45317-c786-4aca-b281-be4f860c6871.jpeg', twitter: '#' },
  { nameKey: "home.founders.member2.name", titleKey: "home.founders.member2.title", image: '/17c0e002-95c2-4ebc-bd21-80193d797d41.jpeg', twitter: '#' },
  { nameKey: "home.founders.member3.name", titleKey: "home.founders.member3.title", image: '/f230f445-1eb8-412a-b620-377c79bccefd.jpeg', twitter: '#' },
];

export default function Founders() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 px-2 sm:px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-sm uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-6">
            👑 {t("home.founders.badge")}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("home.founders.title")}
            </span>
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-4xl mx-auto leading-relaxed">
            👨‍💼 {t("home.founders.description")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto mt-14">
          {FOUNDER_DATA.map((founder, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              <div className="relative rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all duration-500">
                <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e27] via-transparent to-transparent z-10"></div>

                    <img
                      src={founder.image}
                      alt={t(founder.nameKey)}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />

                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-[90%]">
                      <div className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold shadow-lg text-center leading-tight">
                        {t(founder.titleKey)}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors duration-300">
                      {t(founder.nameKey)}
                    </h3>

                    <a
                      href={founder.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all duration-300 mt-4 group/icon"
                      aria-label={t("founder.ariaTwitter")}
                    >
                      <Twitter className="w-5 h-5 text-cyan-400 group-hover/icon:scale-110 transition-transform duration-300" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-400 max-w-full md:max-w-3xl mx-auto px-2">
            {t("home.founders.bottomText")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
