// Individual stat card component
import { motion } from 'motion/react';

const colorStyles = {
  blue: {
    bg: 'from-blue-600/10 to-blue-600/5',
    border: 'border-blue-500/50',
    glow: 'shadow-blue-500/20',
    dot: 'bg-blue-500',
    text: 'text-blue-400'
  },
  red: {
    bg: 'from-red-600/10 to-red-600/5',
    border: 'border-red-500/50',
    glow: 'shadow-red-500/20',
    dot: 'bg-red-500',
    text: 'text-red-400'
  },
  green: {
    bg: 'from-green-600/10 to-green-600/5',
    border: 'border-green-500/50',
    glow: 'shadow-green-500/20',
    dot: 'bg-green-500',
    text: 'text-green-400'
  },
  orange: {
    bg: 'from-orange-600/10 to-orange-600/5',
    border: 'border-orange-500/50',
    glow: 'shadow-orange-500/20',
    dot: 'bg-orange-500',
    text: 'text-orange-400'
  }
};

export function StatCard({ label, value, color, index }) {
  const style = colorStyles[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative rounded-2xl bg-gradient-to-br ${style.bg} backdrop-blur-xl border ${style.border} p-6 overflow-hidden group hover:shadow-lg hover:${style.glow} transition-all duration-300`}
    >
      {/* Glow effect on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
      
      <div className="relative flex items-start gap-4">
        <div className={`w-3 h-3 ${style.dot} rounded-full mt-2 flex-shrink-0 shadow-lg`}></div>
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-2">{label}</p>
          <p className={`text-3xl md:text-4xl font-bold ${style.text}`}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
}