import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSharedLiveActivity } from "./liveActivityStore.js";
import "./LiveActivityFeed.css";

// ─────────────────────────────────────────────────────────────────────────────
// Global Live Activity feed.
//
// Consumes the server-authoritative, shared global stream (liveActivityStore)
// so every visitor — logged-in or not — sees the SAME event sequence. The feed
// never generates data client-side and never writes to a database; it only
// renders the shared snapshot. Rotation is driven by a local 1s timer that
// derives the current event from the server time anchor, so it costs zero
// network requests while remaining perfectly synchronised across users.
// ─────────────────────────────────────────────────────────────────────────────

const AMOUNT_SENTINEL = "\u0001";

function getVisibleRows() {
  if (typeof window === "undefined") return 3;
  return window.innerWidth < 640 ? 2 : 3;
}

const isWeekendUK = () => {
  try {
    const now = new Date();
    const ukTime = new Date(now.toLocaleString("en-GB", { timeZone: "Europe/London" }));
    const day = ukTime.getDay();
    return day === 0 || day === 6;
  } catch {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }
};

const LiveActivityFeed = ({ maxItems = 200, paused = false }) => {
  const { t } = useTranslation();
  const data = useSharedLiveActivity();
  const [visibleRows, setVisibleRows] = useState(getVisibleRows);
  const [displaySeq, setDisplaySeq] = useState(null);
  const [isPaused, setIsPaused] = useState(paused);

  // Keep the visible-row count in sync with the viewport.
  useEffect(() => {
    const onResize = () => setVisibleRows(getVisibleRows());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 1s presentation timer: derive the current event index from the server
  // anchor. No API calls — purely local, so it is cheap and identical for all
  // clients viewing at the same moment.
  useEffect(() => {
    if (!data) return undefined;
    const tick = () => {
      const ageSec = Math.floor((Date.now() - data.server_time) / 1000);
      setDisplaySeq(data.seq + ageSec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data]);

  // Preserve the existing weekend (UK time) pause business rule.
  useEffect(() => {
    const check = () => setIsPaused(isWeekendUK() || paused);
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [paused]);

  const isPausedFinal = paused || isPaused;

  // Loading / pre-first-poll state.
  if (!data) {
    return (
      <div className="live-feed-container">
        <div className="live-feed-header">
          <div className="live-feed-dot" />
          <span className="live-feed-title">{t("liveActivityFeed.title")}</span>
          <span className="live-feed-simulated">{t("liveActivityFeed.platformActivity")}</span>
        </div>
        <div className="live-feed-scroll">
          <div className="live-feed-scroll-inner">
            <div className="live-feed-item">
              <div className="feed-icon signup">🎉</div>
              <div className="feed-info">
                <div className="feed-name">{t("liveActivityFeed.title")}</div>
                <div className="feed-action">…</div>
              </div>
              <span className="feed-time">{t("liveActivityFeed.justNow")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const events = data.activity || [];
  const seq = data.seq;
  const windowStart = seq - events.length + 1;
  const ds = displaySeq == null ? seq : displaySeq;

  // Visible window: the `visibleRows` most-recent events ending at displaySeq,
  // clamped to the returned window and de-duplicated. Keyed by position (not
  // id) so rows update in place — smooth, no flicker, no full re-creation.
  const ids = [];
  for (let k = 0; k < visibleRows; k += 1) {
    let id = ds - k;
    id = Math.max(windowStart, Math.min(seq, id));
    if (!ids.includes(id)) ids.push(id);
  }
  const visible = ids.map((id) => events[id - windowStart]).filter(Boolean);

  return (
    <div className="live-feed-container">
      <div className="live-feed-header">
        <div className="live-feed-dot" />
        <span className="live-feed-title">{t("liveActivityFeed.title")}</span>
        <span className="live-feed-simulated">{t("liveActivityFeed.platformActivity")}</span>
      </div>

      <div className="live-feed-scroll">
        <div className={`live-feed-scroll-inner ${isPausedFinal ? "paused" : ""}`}>
          {visible.map((item, idx) => (
            <FeedRow key={idx} item={item} t={t} />
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

// Single activity row. Keyed by stable position in the parent, so the row
// content updates in place as the window slides — no remount/flicker.
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
      <div className={`feed-icon ${item.activity.type}`}>{item.activity.icon}</div>
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
      <span className="feed-time">{t("liveActivityFeed.justNow")}</span>
    </div>
  );
};

export default LiveActivityFeed;
