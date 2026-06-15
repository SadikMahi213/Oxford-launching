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

const FALLBACK = PAIRS.map((p) => ({
  symbol: p.symbol,
  name: p.name,
  image: getCoinIcon(p.symbol),
  price: null,
  change: null,
}));

function CoinIcon({ symbol, src }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-700/50 text-gray-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {symbol.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={symbol}
      onError={() => setErr(true)}
      className="w-8 h-8 rounded-full flex-shrink-0 object-contain"
    />
  );
}

function formatPrice(price) {
  if (price == null) return "—";
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}

export function MarketsCrawl() {
  const [tickers, setTickers] = useState(FALLBACK);
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
    let mounted = true;
    const fetchPrices = async () => {
      try {
        const res = await fetch(REST_URL);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !Array.isArray(data)) return;
        const mapped = data.map((t) => {
          const s = t.s ?? t.symbol ?? "";
          const meta = PAIRS.find((p) => p.pair === s) ?? {};
          return {
            symbol: meta.symbol || s.replace("USDT", ""),
            name: meta.name || s,
            image: getCoinIcon(meta.symbol),
            price: parseFloat(t.c ?? t.lastPrice ?? null),
            change: parseFloat(t.P ?? t.priceChangePercent ?? null),
          };
        });
        if (mapped.length > 0) setTickers(mapped);
      } catch (e) {
        console.error("MarketsCrawl fetch error", e);
      }
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const duplicated = Array(4).fill(tickers).flat();

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
              <CoinIcon symbol={item.symbol} src={item.image} />
              <div>
                <div className="text-xs text-gray-400">{item.symbol}/USDT</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {item.price != null ? `$${formatPrice(item.price)}` : "—"}
                  </span>
                  {item.change != null && (
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
