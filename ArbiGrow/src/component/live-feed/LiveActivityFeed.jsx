import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { countries } from "./countries";
import { countryNames } from "./countryNames";
import "./LiveActivityFeed.css";

// ─────────────────────────────────────────────────────────────────────────────
// Simulated Global Live Activity feed.
//
// This widget renders simulated, client-side platform activity for display
// only. It never calls financial APIs and never mutates database records,
// wallets, balances, transactions, mining logs or e-commerce orders.
// Everything is generated in memory and kept inside React state (optionally
// mirrored to sessionStorage so a refresh does not reset the activity window).
// ─────────────────────────────────────────────────────────────────────────────

const ONE_MINUTE_MS = 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * ONE_MINUTE_MS;
const SEED_COUNT = 64;
const DEFAULT_MAX_ITEMS = 200;
const STORAGE_KEY = "oxford_global_live_activity_v2";
const AMOUNT_SENTINEL = "\u0001";

// Weighted distribution (sums to 100):
//   Withdrawal 10% · Deposit 10% · Captcha 20% · Ads 20%
//   E-Commerce 15% · OFA Mining 10% · Digital Tasks 10% · Other 5%
const ACTIVITY_TYPES = [
  { type: "withdraw", icon: "💸", actionKey: "liveActivityFeed.types.withdraw", weight: 10 },
  { type: "deposit", icon: "🏦", actionKey: "liveActivityFeed.types.deposit", weight: 10 },
  { type: "captcha", icon: "🔐", actionKey: "liveActivityFeed.types.captcha", weight: 20 },
  { type: "ads", icon: "📺", actionKey: "liveActivityFeed.types.ads", weight: 20 },
  { type: "ecommerce", icon: "🛒", actionKey: "liveActivityFeed.types.ecommerce", weight: 15 },
  { type: "mining", icon: "⛏️", actionKey: "liveActivityFeed.types.mining", weight: 10 },
  { type: "task", icon: "💻", actionKey: "liveActivityFeed.types.task", weight: 10 },
  { type: "signup", icon: "🎉", actionKey: "liveActivityFeed.types.signup", weight: 5 },
];

const TASK_TYPES = [
  { key: "liveActivityFeed.tasks.dataEntry", weight: 25 },
  { key: "liveActivityFeed.tasks.graphics", weight: 25 },
  { key: "liveActivityFeed.tasks.videoEditing", weight: 25 },
  { key: "liveActivityFeed.tasks.digitalMarketing", weight: 25 },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickBiased = () => {
  const weights = countries.map((c) => (c.code === "PH" ? 8 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < countries.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return countries[i];
  }
  return countries[0];
};

const weightedPick = (items) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round2 = (n) => Math.round(n * 100) / 100;
const usd = (n) => `$${n.toFixed(2)}`;

// ── Amount generation ────────────────────────────────────────────────────────
// Amounts are generated ONCE per event (at event creation time) and stored on
// the item, so they never change on re-renders. Ranges reflect the platform:
// deposits start at the configured minimum (~$10), mining caps around 20 OFA.

function withdrawalAmount() {
  const r = Math.random();
  let raw;
  if (r < 0.5) raw = 10 + Math.random() * 80; // $10 – $90
  else if (r < 0.8) raw = 90 + Math.random() * 160; // $90 – $250
  else if (r < 0.95) raw = 250 + Math.random() * 250; // $250 – $500
  else raw = 500 + Math.random() * 200; // $500 – $700
  return usd(clamp(raw, 10, 700));
}

function depositAmount() {
  const r = Math.random();
  let raw;
  if (r < 0.45) raw = 10 + Math.random() * 90; // $10 – $100
  else if (r < 0.75) raw = 100 + Math.random() * 200; // $100 – $300
  else if (r < 0.93) raw = 300 + Math.random() * 400; // $300 – $700
  else raw = 700 + Math.random() * 300; // $700 – $1,000
  return usd(round2(raw));
}

function captchaAmount() {
  return usd(round2(0.01 + Math.random() * 2));
}

function adsAmount() {
  return usd(round2(0.02 + Math.random() * 1.5));
}

function ecommerceAmount() {
  return usd(round2(5 + Math.random() * 195));
}

function miningAmount() {
  return `${round2(0.5 + Math.random() * 19.5)} OFA`;
}

function taskAmount(taskKey) {
  switch (taskKey) {
    case "liveActivityFeed.tasks.dataEntry":
      return usd(round2(2 + Math.random() * 30));
    case "liveActivityFeed.tasks.graphics":
      return usd(round2(8 + Math.random() * 120));
    case "liveActivityFeed.tasks.videoEditing":
      return usd(round2(10 + Math.random() * 190));
    default:
      return usd(round2(5 + Math.random() * 145));
  }
}

const amountFor = (type, taskKey) => {
  switch (type) {
    case "withdraw": return withdrawalAmount();
    case "deposit": return depositAmount();
    case "captcha": return captchaAmount();
    case "ads": return adsAmount();
    case "ecommerce": return ecommerceAmount();
    case "mining": return miningAmount();
    case "task": return taskAmount(taskKey);
    default: return null;
  }
};

// ── Dummy user rotation ──────────────────────────────────────────────────────
// Keeps a cooldown of the last 2–3 generated users so the same member does not
// appear back-to-back.

function pickPerson(avoidKeys) {
  for (let i = 0; i < 15; i++) {
    const country = pickBiased();
    const names = countryNames[country.code] || countryNames["US"];
    const fullName = `${pick(names.first)} ${pick(names.last)}`;
    if (!avoidKeys.includes(`${fullName}|${country.code}`)) {
      return { fullName, country };
    }
  }
  const country = pickBiased();
  const names = countryNames[country.code] || countryNames["US"];
  return { fullName: `${pick(names.first)} ${pick(names.last)}`, country };
}

function generateItem(ctx, timestampMs) {
  const { recentKeys, recentTypes } = ctx;

  const previousType = recentTypes[recentTypes.length - 1] || null;
  let activity = weightedPick(ACTIVITY_TYPES);
  let attempts = 0;
  while (activity.type === previousType && attempts < 8) {
    activity = weightedPick(ACTIVITY_TYPES);
    attempts += 1;
  }

  let taskKey = null;
  if (activity.type === "task") taskKey = weightedPick(TASK_TYPES).key;

  const { fullName, country } = pickPerson(recentKeys);

  recentKeys.push(`${fullName}|${country.code}`);
  if (recentKeys.length > 3) recentKeys.shift();
  recentTypes.push(activity.type);
  if (recentTypes.length > 3) recentTypes.shift();

  return {
    id: ctx.nextId++,
    name: fullName,
    country,
    activity: {
      type: activity.type,
      icon: activity.icon,
      actionKey: activity.actionKey,
      taskKey,
    },
    amount: amountFor(activity.type, taskKey),
    timestamp: timestampMs,
  };
}

// ── 24-hour rolling seed ─────────────────────────────────────────────────────
// Builds an initial dataset spread across the latest 24h using irregular gaps
// (recent events minutes apart, older events an hour or more apart) so the feed
// looks like a natural activity stream rather than a mechanical counter.

function buildSeed(count) {
  const ctx = { nextId: 1, recentKeys: [], recentTypes: [] };
  const now = Date.now();
  const items = [];
  let t = now;
  for (let i = 0; i < count; i += 1) {
    items.push(generateItem(ctx, t));
    const ageMin = (now - t) / ONE_MINUTE_MS;
    let gapMin;
    if (ageMin < 60) gapMin = 1 + Math.random() * 9; // 1–10 min
    else if (ageMin < 360) gapMin = 6 + Math.random() * 22; // 6–28 min
    else if (ageMin < 720) gapMin = 14 + Math.random() * 34; // 14–48 min
    else gapMin = 24 + Math.random() * 66; // 24–90 min
    const nextT = t - gapMin * ONE_MINUTE_MS;
    if (nextT <= now - TWENTY_FOUR_HOURS_MS) break;
    t = nextT;
  }
  return items; // newest first
}

// ── Persistence (sessionStorage only — never a database) ────────────────────

function loadSeedState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items) || typeof data.seedAt !== "number") return null;
    const now = Date.now();
    if (now - data.seedAt > TWENTY_FOUR_HOURS_MS) return null;
    const pruned = data.items.filter(
      (it) =>
        it &&
        typeof it.timestamp === "number" &&
        now - it.timestamp <= TWENTY_FOUR_HOURS_MS &&
        it.name &&
        it.country &&
        it.activity
    );
    return pruned.length ? pruned.slice(0, DEFAULT_MAX_ITEMS) : null;
  } catch {
    return null;
  }
}

function saveSeedState(items, nextId) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ seedAt: Date.now(), items, nextId })
    );
  } catch {
    // Storage can be unavailable (private mode / quota). The widget still works.
  }
}

const formatTimeAgo = (timestamp, t) => {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / ONE_MINUTE_MS));
  if (minutes < 1) return t("liveActivityFeed.justNow");
  if (minutes < 60) return t("liveActivityFeed.minutesAgo", { count: minutes });
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

const LiveActivityFeed = ({
  maxItems = DEFAULT_MAX_ITEMS,
  newInterval = null,
  paused = false,
}) => {
  const { t } = useTranslation();
  const idRef = useRef(0);
  const recentKeysRef = useRef([]);
  const recentTypesRef = useRef([]);

  const [items, setItems] = useState(() => {
    const stored = loadSeedState();
    return stored || buildSeed(SEED_COUNT);
  });

  const [isPaused, setIsPaused] = useState(paused);
  const isPausedFinal = paused || isPaused || isWeekendUK();

  // Initialize cursor + user-rotation cooldown from the mounted seed. Runs once
  // after mount (never during render).
  useEffect(() => {
    idRef.current = Math.max(0, ...items.map((it) => (typeof it.id === "number" ? it.id : 0))) + 1;
    recentKeysRef.current = items.slice(0, 3).map((it) => `${it.name}|${it.country.code}`);
    recentTypesRef.current = items.slice(0, 3).map((it) => it.activity.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the rolling window into sessionStorage (seed + timestamps only) so a
  // page refresh continues the activity history instead of starting fresh.
  useEffect(() => {
    if (!items.length) return;
    saveSeedState(items, idRef.current);
  }, [items]);

  const appendNewEvent = useCallback(() => {
    const ctx = {
      nextId: idRef.current,
      recentKeys: recentKeysRef.current,
      recentTypes: recentTypesRef.current,
    };
    const item = generateItem(ctx, Date.now());
    idRef.current = ctx.nextId;
    setItems((prev) => {
      const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
      const retained = prev.filter((it) => it.timestamp >= cutoff);
      return [item, ...retained].slice(0, maxItems);
    });
  }, [maxItems]);

  const pruneExpired = useCallback(() => {
    setItems((prev) => {
      const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
      const retained = prev.filter((it) => it.timestamp >= cutoff);
      return retained.length === prev.length ? prev : retained;
    });
  }, []);

  // Single chained, irregular scheduler: prepend a new simulated event, drop
  // anything older than 24 hours, then re-schedule. The timer is cleaned up on
  // unmount / pause so no duplicate or leaked timers are created.
  useEffect(() => {
    let timer = null;
    let cancelled = false;

    const schedule = () => {
      const delay =
        newInterval && newInterval > 0
          ? newInterval
          : 12000 + Math.random() * 26000; // irregular 12–38s
      timer = setTimeout(() => {
        timer = null;
        if (cancelled) return;
        if (isPausedFinal) pruneExpired();
        else appendNewEvent();
        schedule();
      }, delay);
    };

    if (!isPausedFinal) schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isPausedFinal, appendNewEvent, pruneExpired, newInterval]);

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
        <span className="live-feed-simulated">{t("liveActivityFeed.simulatedNotice")}</span>
      </div>

      <div className="live-feed-scroll">
        <div
          className={`live-feed-scroll-inner ${isPausedFinal ? "paused" : ""}`}
        >
          {items.map((item) => {
            const actionText = item.activity.actionKey
              ? t(item.activity.actionKey, {
                  amount: AMOUNT_SENTINEL,
                  activity: item.activity.taskKey ? t(item.activity.taskKey) : "",
                })
              : "";
            const [before, ...after] = actionText.split(AMOUNT_SENTINEL);
            return (
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
                  <div className="feed-name">
                    {item.name}{" "}
                    <span className="feed-country">
                      {t("liveActivityFeed.from")} {item.country.name}
                    </span>
                  </div>
                  <div className="feed-action">
                    {before}
                    {item.amount ? <span className="highlight">{item.amount}</span> : null}
                    {after.join(AMOUNT_SENTINEL)}
                  </div>
                </div>
                <span className="feed-time">{formatTimeAgo(item.timestamp, t)}</span>
              </div>
            );
          })}
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