import { motion } from "framer-motion";

export function ShowcaseSection({ badge, title, description, image, imageAlt, reversed }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.08] p-5 sm:p-8 lg:p-10 my-8 md:my-12 group hover:border-white/20 transition-all duration-500"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className={`relative z-10 flex flex-col ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-6 sm:gap-8 lg:gap-12`}>
        <div className="flex-1 w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-4 sm:mb-5"
          >
            {badge}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-5"
          >
            {title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="text-sm sm:text-base text-gray-300 leading-relaxed"
          >
            {description}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: reversed ? -20 : 20 }}
          whileInView={{ opacity: 1, scale: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex-1 w-full"
        >
          <div className="relative group/card">
            <div className="absolute -inset-3 bg-gradient-to-r from-blue-500/15 via-cyan-500/15 to-blue-500/15 rounded-2xl blur-2xl opacity-60 group-hover/card:opacity-80 transition-opacity duration-700" />
            <img
              src={image}
              alt={imageAlt}
              className="relative w-full h-auto rounded-xl shadow-2xl shadow-blue-500/10 group-hover/card:shadow-blue-500/25 group-hover/card:-translate-y-1 transition-all duration-500 ease-out"
              loading="lazy"
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
