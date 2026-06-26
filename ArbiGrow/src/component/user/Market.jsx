import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import CurrencyList from "./CurrencyList";
import { MarketHeader } from "./MarketHeader";
import { useTranslation } from "react-i18next";

import { PAIRS, COIN_ICONS } from "../../constants/coinData";

const getCoinIcon = (symbol) => COIN_ICONS[symbol] ?? "";

const pairMeta = Object.fromEntries(PAIRS.map((p) => [p.pair, p]));

const REST_URL = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(
  JSON.stringify(PAIRS.map((p) => p.pair)),
)}`;

const WS_URL = `wss://stream.binance.com:9443/stream?streams=${PAIRS.map(
  (p) => `${p.pair.toLowerCase()}@ticker`,
).join("/")}`;

const mapTicker = (t) => {
  const s = t.s ?? t.symbol ?? "";
  const meta = pairMeta[s] ?? {
    pair: s,
    symbol: s.replace("USDT", ""),
    name: s,
  };
  return {
    id: meta.pair,
    symbol: meta.symbol,
    name: meta.name,
    image: getCoinIcon(meta.symbol),
    price: parseFloat(t.c ?? t.lastPrice ?? 0),
    change24h: parseFloat(t.P ?? t.priceChangePercent ?? 0),
    volume: parseFloat(t.q ?? t.quoteVolume ?? 0),
  };
};

export function Market() {
  const { t } = useTranslation();
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [lastUpdated, setLastUpdated] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }
    clearTimeout(reconnectRef.current);
    setWsStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("open");

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const data = msg.data ?? msg;
        if (!data?.s) return;
        const updated = mapTicker(data);
        setCurrencies((prev) => {
          const idx = prev.findIndex((c) => c.id === updated.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            price: updated.price,
            change24h: updated.change24h,
            volume: updated.volume,
          };
          return next;
        });
        setLastUpdated(new Date());
      } catch (_) {}
    };

    ws.onerror = () => setWsStatus("error");
    ws.onclose = () => {
      setWsStatus("error");
      reconnectRef.current = setTimeout(connectWs, 5000);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const res = await fetch(REST_URL);
        const data = await res.json();
        if (cancelled) return;
        setCurrencies(data.map(mapTicker).sort((a, b) => b.volume - a.volume));
        setLastUpdated(new Date());
      } catch (_) {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init().then(() => {
      if (!cancelled) connectWs();
    });
    return () => {
      cancelled = true;
      clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [connectWs]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(REST_URL);
      const data = await res.json();
      setCurrencies(data.map(mapTicker).sort((a, b) => b.volume - a.volume));
      setLastUpdated(new Date());
    } catch (_) {
    } finally {
      setLoading(false);
    }
    connectWs();
  }, [connectWs]);

  return (
    <div className="p-4 md:p-6">
      <MarketHeader
        lastUpdated={lastUpdated}
        wsStatus={wsStatus}
        onRefresh={handleRefresh}
        loading={loading}
      />
      {loading && currencies.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-gray-400 text-sm">{t("market.connecting")}</p>
        </div>
      ) : (
        <CurrencyList currencies={currencies} />
      )}
    </div>
  );
}
