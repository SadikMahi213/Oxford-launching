import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { countries } from "./countries";
import { countryNames } from "./countryNames";
import "./LiveActivityFeed.css";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickBiased = () => {
  const weights = countries.map((c) => (c.code === "PH" ? 50 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < countries.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return countries[i];
  }
  return countries[0];
};

const ACTIVITY_TYPES = [
  { type: "earn", icon: "💰", action: "earned OFA from captcha task", weight: 40 },
  { type: "withdraw", icon: "💸", action: "withdrawn OFA to wallet", weight: 15 },
  { type: "signup", icon: "🎉", action: "joined Oxford Financial Ads", weight: 15 },
  { type: "invest", icon: "📈", action: "started earning daily returns", weight: 15 },
  { type: "captcha", icon: "🔐", action: "completed captcha verification", weight: 15 },
];

const weightedPick = (items) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return items[0];
};

const generateRandomAmount = (type) => {
  switch (type) {
    case "earn": return `${(Math.random() * 5 + 0.5).toFixed(2)} OFA`;
    case "withdraw": return `${(Math.random() * 20 + 1).toFixed(2)} OFA`;
    case "invest": return `$${(Math.random() * 500 + 50).toFixed(0)}`;
    default: return null;
  }
};

const timeAgo = (minutes, t) => {
  if (minutes < 1) return t("liveActivityFeed.justNow");
  if (minutes < 60) return t("liveActivityFeed.minutesAgo", { count: Math.floor(minutes) });
  return t("liveActivityFeed.hoursAgo", { count: Math.floor(minutes / 60) });
};

function isWeekendUK() {
  try {
    const now = new Date();
    const ukTime = new Date(now.toLocaleString("en-GB", { timeZone: "Europe/London" }));
    const day = ukTime.getDay();
    return day === 0 || day === 6;
  } catch {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }
}

function generateItem(id, minutesAgo = 0, t) {
  const country = pickBiased();
  const names = countryNames[country.code] || countryNames["US"];
  const firstName = pick(names.first);
  const lastName = pick(names.last);
  const activity = weightedPick(ACTIVITY_TYPES);
  const amount = generateRandomAmount(activity.type);
  const timestamp = new Date(Date.now() - minutesAgo * 60000);

  return {
    id,
    name: `${firstName} ${lastName}`,
    country,
    activity,
    amount,
    timestamp,
    displayTime: minutesAgo === 0 ? t("liveActivityFeed.justNow") : timeAgo(minutesAgo, t),
  };
}

const LiveActivityFeed = ({
  maxItems = 200,
  newInterval = 3000,
  paused = false,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState(() =>
    Array.from({ length: 15 }, (_, i) => generateItem(i, (15 - i) * 2, t))
  );
  const [isPaused, setIsPaused] = useState(paused);
  const idRef = useRef(15);
  const scrollRef = useRef(null);

  const isPausedFinal = paused || isPaused || isWeekendUK();

  const addNewItem = useCallback(() => {
    if (isPausedFinal) return;
    const newItem = generateItem(idRef.current++, 0, t);
    setItems((prev) => [newItem, ...prev].slice(0, maxItems));
  }, [isPausedFinal, maxItems, t]);

  useEffect(() => {
    if (isPausedFinal) return;
    const interval = setInterval(addNewItem, newInterval);
    return () => clearInterval(interval);
  }, [addNewItem, newInterval, isPausedFinal]);

  useEffect(() => {
    const checkWeekend = setInterval(() => {
      setIsPaused(isWeekendUK());
    }, 60000);
    return () => clearInterval(checkWeekend);
  }, []);

  return (
    <div className="live-feed-container">
      <div className="live-feed-header">
        <div className="live-feed-dot" />
        <span className="live-feed-title">{t("liveActivityFeed.title")}</span>
      </div>

      <div className="live-feed-scroll" ref={scrollRef}>
        <div
          className={`live-feed-scroll-inner ${isPausedFinal ? "paused" : ""}`}
        >
          {items.map((item) => (
            <div className="live-feed-item" key={item.id}>
              <div className={`feed-icon ${item.activity.type}`}>
                {item.activity.icon}
              </div>
              <span className="feed-flag">
                <img
                  src={`https://flagcdn.com/24x18/${item.country.code.toLowerCase()}.png`}
                  alt={item.country.name}
                  className="flag-img"
                />
              </span>
              <div className="feed-info">
                <div className="feed-name">{item.name} <span className="feed-country">{t("liveActivityFeed.from")} {item.country.name}</span></div>
                <div className="feed-action">
                  {(() => {
                    const parts = item.activity.action.split("OFA");
                    if (parts.length === 1) return item.activity.action;
                    return (
                      <>
                        {parts[0]}
                        <span className="highlight">{item.amount || "OFA"}</span>
                        {parts[1]}
                      </>
                    );
                  })()}
                </div>
              </div>
              <span className="feed-time">{item.displayTime}</span>
            </div>
          ))}
        </div>
      </div>

      {isPausedFinal && (
        <div className="live-feed-paused-overlay">
          <div className="live-feed-paused-text">
            <span>⏸</span>
            {isWeekendUK()
              ? t("liveActivityFeed.pausedWeekend")
              : t("liveActivityFeed.pausedAdmin")}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveActivityFeed;
