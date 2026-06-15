import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Bitcoin,
  DollarSign,
  BarChart3,
} from "lucide-react";

const defaultPrices = [
  { pair: "BTC/USDT", price: 67482.31, change: 2.34, color: "text-orange-400" },
  { pair: "ETH/USDT", price: 3451.67, change: -1.23, color: "text-blue-400" },
  { pair: "SOL/USDT", price: 142.89, change: 5.67, color: "text-purple-400" },
  { pair: "BNB/USDT", price: 598.12, change: 0.89, color: "text-yellow-400" },
  { pair: "XRP/USDT", price: 0.6234, change: -0.45, color: "text-cyan-400" },
  { pair: "ADA/USDT", price: 0.4567, change: 3.21, color: "text-blue-300" },
  { pair: "DOT/USDT", price: 7.89, change: -2.15, color: "text-pink-400" },
  { pair: "AVAX/USDT", price: 28.45, change: 4.56, color: "text-red-400" },
];

export function MarketsCrawl() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const duplicated = Array(4).fill(defaultPrices).flat();

  return (
    <div className="relative rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-20 bg-gradient-to-r from-[#0a0e27] to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-20 bg-gradient-to-l from-[#0a0e27] to-transparent z-10"></div>

      <div className="overflow-hidden py-4">
        <motion.div
          className="flex gap-4 md:gap-8 w-max"
          animate={{ x: [0, "-50%"] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: isMobile ? 40 : 40,
              ease: "linear",
            },
          }}
        >
          {duplicated.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 whitespace-nowrap"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className={`w-4 h-4 ${item.color}`} />
              </div>
              <div>
                <div className="text-xs text-gray-400">{item.pair}</div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${item.color}`}>
                    ${item.price.toLocaleString()}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-xs ${
                      item.change >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {item.change >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(item.change)}%
                  </span>
                </div>
              </div>
              {idx < duplicated.length - 1 && (
                <div className="w-px h-8 bg-white/10 ml-4"></div>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
