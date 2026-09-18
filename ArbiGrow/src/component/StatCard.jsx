// Individual stat card component
import { motion } from 'motion/react';

const colorStyles = {
  blue: {
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    borderHover: 'hover:border-blue-500/30',
    glow: 'hover:shadow-blue-500/10',
    gradient: 'group-hover:from-blue-500/5'
  },
  green: {
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    borderHover: 'hover:border-green-500/30',
    glow: 'hover:shadow-green-500/10',
    gradient: 'group-hover:from-green-500/5'
  },
  purple: {
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    borderHover: 'hover:border-purple-500/30',
    glow: 'hover:shadow-purple-500/10',
    gradient: 'group-hover:from-purple-500/5'
  },
  cyan: {
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    borderHover: 'hover:border-cyan-500/30',
    glow: 'hover:shadow-cyan-500/10',
    gradient: 'group-hover:from-cyan-500/5'
  },
  orange: {
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    borderHover: 'hover:border-orange-500/30',
    glow: 'hover:shadow-orange-500/10',
    gradient: 'group-hover:from-orange-500/5'
  }
};

export function StatCard({ label, value, color, icon: Icon, index }) {
  const style = colorStyles[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10 p-6 overflow-hidden group ${style.borderHover} ${style.glow} transition-all duration-300`}
    >
      {/* Subtle background gradient on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      
      <div className="relative z-10 flex items-start gap-4">
        {/* Premium Icon Container */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.iconBg} ${style.iconColor} border border-white/5 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
        
        {/* Content */}
        <div className="flex-1 mt-1">
          <p className="text-sm font-medium text-gray-400 mb-1 tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}