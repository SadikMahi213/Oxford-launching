// Individual currency row component
import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

function CoinImage({ symbol, src }) {
  const [err, setErr] = useState(false);

  if (err) {
    return (
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-700/50 text-gray-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {symbol.slice(0, 3)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      onError={() => setErr(true)}
      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 object-contain"
    />
  );
}

export function CurrencyListItem({ currency, rank }) {
  const prevPrice = useRef(currency.price);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (prevPrice.current !== currency.price) {
      const dir = currency.price > prevPrice.current ? "up" : "down";
      prevPrice.current = currency.price;
      setFlash(dir);
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
  }, [currency.price]);

  const isPositive = currency.change24h >= 0;

  const fmtPrice = (p) => {
    if (!p && p !== 0) return "—";
    if (p >= 1000)
      return p.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.0001) return p.toFixed(6);
    return p.toFixed(8);
  };

  const fmtVol = (n) => {
    if (!n) return "—";
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
  };

  const rowFlash =
    flash === "up"
      ? "bg-green-500/10"
      : flash === "down"
      ? "bg-red-500/10"
      : "";

  const priceColor =
    flash === "up"
      ? "text-green-400"
      : flash === "down"
      ? "text-red-400"
      : "text-white";

  return (
    <div
      className={`grid grid-cols-[24px_1fr_auto_auto] lg:grid-cols-[24px_1fr_auto_auto_auto] items-center gap-3 sm:gap-4 py-3 px-4 hover:bg-white/5 transition-colors duration-200 ${rowFlash}`}
    >
      {/* Rank */}
      <span className="text-gray-600 text-xs text-right select-none">
        {rank}
      </span>

      {/* Image + Name */}
      <div className="flex items-center gap-3 min-w-0">
        <CoinImage symbol={currency.symbol} src={currency.image} />

        <div className="min-w-0">
          <div className="text-white font-semibold text-sm sm:text-base">
            {currency.symbol}
          </div>

          <div className="text-gray-500 text-xs truncate">
            {currency.name}
          </div>
        </div>
      </div>

      {/* Volume (desktop only) */}
      <div className="hidden lg:block text-gray-500 text-xs text-right">
        {fmtVol(currency.volume)}
      </div>

      {/* Price */}
      <div className="text-right">
        <span
          className={`font-medium text-sm sm:text-base transition-colors duration-300 ${priceColor}`}
        >
          ${fmtPrice(currency.price)}
        </span>
      </div>

      {/* 24h Change */}
      <div className="flex items-center gap-1 justify-end w-16 sm:w-20">
        {isPositive ? (
          <TrendingUp className="w-3 h-3 text-green-400 flex-shrink-0" />
        ) : (
          <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />
        )}

        <span
          className={`text-xs sm:text-sm font-medium ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {currency.change24h.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}