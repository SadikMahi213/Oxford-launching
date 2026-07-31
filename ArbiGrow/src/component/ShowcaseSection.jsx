import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ShowcaseSection({ badge, badgeIcon: BadgeIcon, title, description, image, images, imageAlt, reversed }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images && images.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [images]);
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.08] p-5 sm:p-8 lg:p-10 my-4 md:my-6 group hover:border-white/20 transition-all duration-500"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-rose-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className={`relative z-10 flex flex-col ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-6 sm:gap-8 lg:gap-12`}>
        <div className="flex-1 w-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs uppercase tracking-[0.2em] text-rose-400 font-semibold mb-6 w-fit"
          >
            {BadgeIcon && <BadgeIcon className="w-4 h-4" />}
            {badge}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight"
          >
            {(() => {
              if (!title) return null;
              // Dynamically split title for 2-color effect
              if (title.includes(" & ")) {
                const parts = title.split(" & ");
                return (
                  <>
                    {parts[0]} & <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400">{parts.slice(1).join(" & ")}</span>
                  </>
                );
              }
              const words = title.split(" ");
              if (words.length > 2) {
                const splitIdx = Math.ceil(words.length / 2);
                return (
                  <>
                    {words.slice(0, splitIdx).join(" ")}{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400">
                      {words.slice(splitIdx).join(" ")}
                    </span>
                  </>
                );
              }
              return title;
            })()}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="text-base sm:text-lg text-gray-300 leading-relaxed font-light"
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
            <div className="absolute -inset-3 bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-orange-500/15 rounded-2xl blur-2xl opacity-60 group-hover/card:opacity-80 transition-opacity duration-700" />
            {images ? (
              <div className="relative w-full aspect-square sm:aspect-[4/3] lg:aspect-[16/10] rounded-xl overflow-hidden shadow-2xl shadow-rose-500/10 group-hover/card:shadow-rose-500/25 group-hover/card:-translate-y-1 transition-all duration-500 ease-out">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentIndex}
                    src={images[currentIndex]}
                    alt={`${imageAlt} ${currentIndex + 1}`}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                </AnimatePresence>
                
                {/* Gradient overlay for better dot visibility and text */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900/90 to-transparent z-10 pointer-events-none" />

                {/* Index and Title Overlay */}
                <div className="absolute bottom-5 left-5 z-20 flex flex-col pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400 drop-shadow-sm">
                      {String(currentIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="text-lg">✨</span>
                  </div>
                  <span className="text-white/90 font-medium text-sm md:text-base mt-0.5 drop-shadow-md capitalize">
                    {badge.toLowerCase()}
                  </span>
                </div>

                {/* Dots indicator */}
                <div className="absolute bottom-5 right-5 flex flex-wrap items-center justify-end gap-1.5 z-20 max-w-[50%]">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => setCurrentIndex(i)}
                      onKeyDown={(e) => e.key === 'Enter' && setCurrentIndex(i)}
                      className={`cursor-pointer shrink-0 rounded-full transition-all duration-300 ${
                        i === currentIndex 
                          ? 'bg-rose-400 h-1.5 w-5 shadow-[0_0_8px_rgba(251,113,133,0.8)]' 
                          : 'bg-white/50 h-1.5 w-1.5 hover:bg-white hover:scale-125'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative w-full rounded-xl overflow-hidden shadow-2xl shadow-rose-500/10 group-hover/card:shadow-rose-500/25 group-hover/card:-translate-y-1 transition-all duration-500 ease-out">
                <img
                  src={image}
                  alt={imageAlt}
                  className="w-full h-auto block"
                  loading="lazy"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900/90 to-transparent z-10 pointer-events-none" />

                {/* Index and Title Overlay for single image */}
                <div className="absolute bottom-5 left-5 z-20 flex flex-col pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400 drop-shadow-sm">
                      01
                    </span>
                    <span className="text-lg">✨</span>
                  </div>
                  <span className="text-white/90 font-medium text-sm md:text-base mt-0.5 drop-shadow-md capitalize">
                    {badge.toLowerCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
