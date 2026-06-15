import { motion } from 'motion/react';
import { Twitter } from 'lucide-react';
//  import { ImageWithFallback } from './figma/ImageWithFallback';

export default function Founders() {
  const founders = [
    {
      name: 'Ed Felten',
      title: 'Co-Founder & Chief Scientist',
      image: 'https://cdn.prod.website-files.com/65298a37a6d41cc75a204fb5/65298a37a6d41cc75a20521c_headshots-Ed-500.jpg',
      twitter: 'https://x.com/EdFelten',
    },
    {
      name: 'Steven Goldfeder',
      title: 'Co-Founder & CEO',
      image: 'https://cdn.prod.website-files.com/65298a37a6d41cc75a204fb5/65298a37a6d41cc75a20521d_headshots-steven-500.jpg',
      twitter: 'https://x.com/sgoldfed',
    },
    {
      name: 'Harry Kalodner',
      title: 'Co-Founder & CTO',
      image: 'https://cdn.prod.website-files.com/65298a37a6d41cc75a204fb5/65298a37a6d41cc75a20521e_headshots-Harry-500.jpg',
      twitter: 'https://x.com/hkalodner',
    },
  ];

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Our{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Founders
            </span>
          </h2>
        </motion.div>

        {/* Founders Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {founders.map((founder, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              {/* Card */}
              <div className="relative rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all duration-500">
                {/* Glow effect */}
                <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative">
                  {/* Image Container */}
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e27] via-transparent to-transparent z-10"></div>
                    
                    {/* Image */}
                    <img 
                      src={founder.image}
                      alt={founder.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />

                    {/* Badge */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                      <div className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold shadow-lg whitespace-nowrap">
                        {founder.title}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors duration-300">
                      {founder.name}
                    </h3>

                    {/* Twitter Link */}
                    <a
                      href={founder.twitter}
                      target='blank'
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all duration-300 mt-4 group/icon"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-5 h-5 text-cyan-400 group-hover/icon:scale-110 transition-transform duration-300" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-400 max-w-3xl mx-auto">
            Our founding team brings decades of combined experience in blockchain technology, artificial intelligence, 
            and financial markets. Together, they've built Oxford Financial Ads to revolutionize decentralized trading.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
