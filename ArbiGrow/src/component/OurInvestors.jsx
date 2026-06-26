import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export function OurInvestors() {
  const { t } = useTranslation();

  const investors = [
    {
      name: "Investor 1",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/6537e4e300ae0a9101d86e32_source-file-logos-02.svg",
    },
    {
      name: "Investor 2",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/6537e515041c78bc46c9ecbd_source-file-logos-03.svg",
    },
    {
      name: "Investor 3",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/6537e47fd5c838583722d554_source-file-logos-01.svg",
    },
    {
      name: "Investor 4",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051f4_source-file-logos-06.svg",
    },
    {
      name: "Investor 5",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051da_source-file-logos-23.svg",
    },
    {
      name: "Investor 7",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051c4_source-file-logos-05.svg",
    },
    {
      name: "Investor 8",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051c3_source-file-logos-07.svg",
    },
    {
      name: "Investor 9",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051d2_source-file-logos-08.svg",
    },
    {
      name: "Investor 10",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051d5_source-file-logos-09.svg",
    },
    {
      name: "Investor 11",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051c5_source-file-logos-10.svg",
    },
    {
      name: "Investor 12",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051c2_source-file-logos-11.svg",
    },
    {
      name: "Investor 14",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051d8_source-file-logos-13.svg",
    },
    {
      name: "Investor 15",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051d6_source-file-logos-14.svg",
    },
    {
      name: "Investor 16",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051cc_source-file-logos-15.svg",
    },
    {
      name: "Investor 17",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051d3_source-file-logos-16.svg",
    },
    {
      name: "Investor 18",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051c1_source-file-logos-17.svg",
    },
    {
      name: "Investor 19",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051cf_source-file-logos-18.svg",
    },
    {
      name: "Investor 20",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051ca_source-file-logos-19.svg",
    },
    {
      name: "Investor 22",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051d9_source-file-logos-22.svg",
    },
    {
      name: "Investor 23",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051cd_source-file-logos-25.svg",
    },
    {
      name: "Investor 24",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051d7_source-file-logos-26.svg",
    },
    {
      name: "Investor 26",
      logo: "https://cdn.prod.website-files.com/65298a37a6d41cc75a204f73/65298a37a6d41cc75a2051d1_source-file-logos-28.svg",
    },
  ];

  const duplicatedInvestors = [...investors, ...investors, ...investors];

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-blue-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("ourInvestors.title")}{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t("ourInvestors.titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            {t("ourInvestors.subtitle")}
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0e27] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0e27] to-transparent z-10 pointer-events-none"></div>

          <div className="overflow-hidden py-8">
            <motion.div
              className="flex gap-12 items-center"
              animate={{
                x: [0, -100 * investors.length + '%'],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 160,
                  ease: 'linear',
                },
              }}
            >
              {duplicatedInvestors.map((investor, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-48 h-24 flex items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-300 group"
                >
                  <img
                    src={investor.logo}
                    alt={investor.name}
                    className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300 filter brightness-0 invert"
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
