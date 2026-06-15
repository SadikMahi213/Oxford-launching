import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { PAIRS, COIN_ICONS } from "../../../constants/coinData";

const REST_URL = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(
  JSON.stringify(PAIRS.map((p) => p.pair)),
)}`;

const getCoinIcon = (symbol) => COIN_ICONS[symbol] ?? "";

const mapTicker = (t) => {
  const s = t.s ?? "";
  const meta = PAIRS.find((p) => p.pair === s) ?? {
    pair: s,
    symbol: s.replace("USDT", ""),
    name: s,
  };
  return {
    symbol: meta.symbol,
    name: meta.name,
    image: getCoinIcon(meta.symbol),
    price: parseFloat(t.c ?? 0),
    change: parseFloat(t.P ?? 0),
  };
};

export function MarketsCrawl() {
  const [tickers, setTickers] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(REST_URL);
        const data = await res.json();
        if (Array.isArray(data)) setTickers(data.map(mapTicker));
      } catch (e) {
        console.error("MarketsCrawl fetch error", e);
      }
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 30000);
    return () => clearInterval(id);
  }, []);

  const items = tickers.length > 0 ? tickers : PAIRS.map((p) => ({
    symbol: p.symbol,
    name: p.name,
    image: getCoinIcon(p.symbol),
    price: 0,
    change: 0,
  }));

  const duplicated = Array(4).fill(items).flat();

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
              <img
                src={item.image}
                alt={item.symbol}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div>
                <div className="text-xs text-gray-400">{item.symbol}/USDT</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {item.change !== 0 && (
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
                      {Math.abs(item.change).toFixed(2)}%
                    </span>
                  )}
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
