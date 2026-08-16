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

// How long the visible window stays before rotating to the next set of rows.
// Kept snappy (~2s) so a freshly generated event surfaces quickly while the
// feed still reads smoothly. Generation itself runs ~1s (see appendNewEvent).
const ROTATION_MS = 2000;

// Responsive number of simultaneously visible rows:
//   desktop / tablet (>= 640px): 3 rows
//   mobile (< 640px): 2 rows (3 makes the section too tall on phones)
function getVisibleRows() {
  if (typeof window === "undefined") return 3;
  return window.innerWidth < 640 ? 2 : 3;
}

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
const usdt = (n) => `${n.toFixed(2)} USDT`;

// ── Amount generation ────────────────────────────────────────────────────────
// Amounts are generated ONCE per event (at event creation time) and stored on
// the item, so they never change on re-renders. Currency units reflect the
// platform: deposits/withdrawals are settled in USDT, captcha/ads/tasks in USD,
// mining caps around 20 OFA.

function withdrawalAmount() {
  const r = Math.random();
  let raw;
  if (r < 0.5) raw = 10 + Math.random() * 80; // 10 – 90 USD
  else if (r < 0.8) raw = 90 + Math.random() * 160; // 90 – 250 USD
  else if (r < 0.95) raw = 250 + Math.random() * 250; // 250 – 500 USD
  else raw = 500 + Math.random() * 200; // 500 – 700 USD
  return usd(clamp(raw, 10, 700));
}

function depositAmount() {
  const r = Math.random();
  let raw;
  if (r < 0.45) raw = 10 + Math.random() * 90; // 10 – 100 USD
  else if (r < 0.75) raw = 100 + Math.random() * 200; // 100 – 300 USD
  else if (r < 0.93) raw = 300 + Math.random() * 400; // 300 – 700 USD
  else raw = 700 + Math.random() * 300; // 700 – 1,000 USD
  // Deposits are displayed as an INTEGER (no cents) per business/display rules.
  // The underlying simulated value is unchanged — this is display formatting only.
  return `$${Math.round(raw)}`;
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
// Builds an initial dataset spread across the latest 24h using a weighted,
// recent-heavy time distribution. Each item samples a target "age bucket"
// (Just now, 2m, 6m, 10m, 15m, 20m, 30m, 45m, 1h, 2h, 3h, 5h, 8h, 12h, 20h)
// with ±35% jitter, so the feed looks like a continuously active stream rather
// than clustering around a single offset. Sampling + jitter make every seed
// different, while the recent buckets carry the most weight so fresh activity
// dominates (like a real live feed) and older timestamps stay rarer.

const SEED_AGE_BUCKETS = [
  { offset: 0, weight: 10 }, // Just now - highest weight ensures "Just now" appears
  { offset: 2, weight: 8 },
  { offset: 6, weight: 8 },
  { offset: 10, weight: 7 },
  { offset: 15, weight: 7 },
  { offset: 20, weight: 6 },
  { offset: 30, weight: 6 },
  { offset: 45, weight: 5 },
  { offset: 60, weight: 4 }, // 1 hour
  { offset: 120, weight: 4 }, // 2 hours
  { offset: 180, weight: 3 }, // 3 hours
  { offset: 300, weight: 3 }, // 5 hours
  { offset: 480, weight: 2 }, // 8 hours
  { offset: 720, weight: 2 }, // 12 hours
  { offset: 1200, weight: 1 }, // 20 hours
];

function pickAgeBucket() {
  const total = SEED_AGE_BUCKETS.reduce((sum, b) => sum + b.weight, 0);
  let rand = Math.random() * total;
  for (const b of SEED_AGE_BUCKETS) {
    rand -= b.weight;
    if (rand <= 0) return b;
  }
  return SEED_AGE_BUCKETS[SEED_AGE_BUCKETS.length - 1];
}

function buildSeed(count) {
  const now = Date.now();
  let ages = [];
  for (let i = 0; i < count; i += 1) {
    const bucket = pickAgeBucket();
    let ageMin;
    if (bucket.offset === 0) {
      // Keep the freshest bucket genuinely within the "Just now" threshold
      // (< 60s) so the label resolves correctly instead of being forced.
      ageMin = Math.random() * 0.8; // 0–48s
    } else {
      const jitter = (Math.random() - 0.5) * 0.7; // ±35%
      ageMin = bucket.offset * (1 + jitter);
    }
    ages.push(Math.max(0, Math.min(ageMin, 23 * 60 + 50)));
  }
   ages.sort((a, b) => a - b); // newest first, so the type/person cooldown stays coherent

   // De-cluster: guarantee every seeded event has a strictly distinct timestamp
   // so no two rows can ever share the same minute label (PHASE 3). Each event
   // keeps its own real generation time; we only nudge the seed spread.
   ages = ages.map((ageMin, i) => ageMin + i * 0.02);

   const ctx = { nextId: 1, recentKeys: [], recentTypes: [] };
   return ages.map((ageMin) => generateItem(ctx, now - ageMin * ONE_MINUTE_MS));
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
  // "Just Now" removed (PHASE 4): always show a minute-based relative time.
  // 0 minutes ago is acceptable for a very recent event.
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleRows, setVisibleRows] = useState(getVisibleRows);

  // Keep the visible-row count in sync with the viewport so the feed stays
  // responsive on desktop/tablet (3 rows) and mobile (2 rows) without overflow.
  useEffect(() => {
    const onResize = () => setVisibleRows(getVisibleRows());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
          : 800 + Math.random() * 700; // irregular ~0.8–1.5s (≈1s cadence)
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
    if (isPausedFinal || items.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, ROTATION_MS);
    return () => clearInterval(interval);
  }, [items.length, isPausedFinal]);

  useEffect(() => {
    const checkWeekend = setInterval(() => {
      setIsPaused(isWeekendUK());
    }, 60000);
    return () => clearInterval(checkWeekend);
  }, []);

  // Build a sliding window of distinct, existing activity records so 2–3 rows
  // are visible at once. Items are referenced by stable id (no duplicates) and
  // the head advances by one each rotation, giving a smooth slow scroll.
  const visible = (() => {
    if (items.length === 0) return [];
    const len = items.length;
    const head = ((currentIndex % len) + len) % len;
    const count = Math.min(visibleRows, len);
    const rows = [];
    for (let k = 0; k < count; k += 1) rows.push(items[(head + k) % len]);
    return rows;
  })();

  return (
    <div className="live-feed-container">
      <div className="live-feed-header">
        <div className="live-feed-dot" />
        <span className="live-feed-title">{t("liveActivityFeed.title")}</span>
        <span className="live-feed-simulated">{t("liveActivityFeed.platformActivity")}</span>
      </div>

      <div className="live-feed-scroll">
        <div
          className={`live-feed-scroll-inner ${isPausedFinal ? "paused" : ""}`}
        >
          {visible.map((item) => (
            <FeedRow key={item.id} item={item} t={t} />
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

// Single activity row. Keyed by stable item id in the parent so existing rows
// are preserved across rotations and only the entering row remounts (with a
// subtle fade) — no duplicate items, no abrupt full-swap jump.
const FeedRow = ({ item, t }) => {
  const actionText = item?.activity?.actionKey
    ? t(item.activity.actionKey, {
        amount: AMOUNT_SENTINEL,
        activity: item.activity.taskKey ? t(item.activity.taskKey) : "",
      })
    : "";
  const [before, ...after] = actionText ? actionText.split(AMOUNT_SENTINEL) : [];

  return (
    <div className="live-feed-item">
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
};

export default LiveActivityFeed;