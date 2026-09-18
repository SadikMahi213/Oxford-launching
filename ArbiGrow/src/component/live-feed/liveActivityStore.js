import { useEffect, useState } from "react";
import api from "../../api/axiosInstance.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared global live-activity store.
//
// THREE independently scheduled polling loops (one request per loop) fetch
// the server-authoritative global stream, matching the backend cadences:
//   Live Online ................ every 3000ms  (backend ticks every 3s)
//   Tasks Completed Today ...... every 5000ms  (backend ticks every 5s)
//   Platform Earnings Activity . every 12000ms (backend ticks every 10s;
//                                12s refresh sits inside the required 10–15s)
//
// The loops NEVER start together: each one fires its first fetch after its
// own intentional offset (0ms / ~1100ms / ~2300ms), so the three update
// moments do not coincide. Every component that calls
// `useSharedLiveActivity()` subscribes to the same cached snapshot, so the
// Global Live Activity feed and the OFA Cryptocurrency stats stay in sync
// across the page — and across all users, since the data originates from
// the backend. The per-second rotation of the feed is handled entirely
// client-side (see LiveActivityFeed) and never triggers a network request.
// ─────────────────────────────────────────────────────────────────────────────

// [counterKey, intervalMs, startOffsetMs]
const POLL_SCHEDULE = [
  ["live_online", 3000, 0],
  ["tasks_completed_today", 5000, 1100],
  ["platform_earnings_activity", 12000, 2300],
];

let cache = null;
let listeners = new Set();
let timers = [];
let inflight = null;

function notify() {
  listeners.forEach((cb) => cb(cache));
}

async function fetchOnce() {
  if (inflight) return inflight;
  inflight = api
    .get("v1/live-stats/")
    .then((res) => {
      cache = res.data;
      notify();
    })
    .catch(() => {
      // Keep showing the last known snapshot on a transient failure.
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function ensurePolling() {
  if (timers.length > 0) return;
  // Staggered start: each loop fires its first fetch after its own offset,
  // then repeats on its own period. No two loops share a start timestamp.
  for (const [, intervalMs, offsetMs] of POLL_SCHEDULE) {
    const timeoutId = setTimeout(() => {
      fetchOnce();
      const intervalId = setInterval(fetchOnce, intervalMs);
      timers.push(intervalId);
    }, offsetMs);
    timers.push(timeoutId);
  }
}

function stopPolling() {
  for (const id of timers) {
    clearTimeout(id);
    clearInterval(id);
  }
  timers = [];
}

export function useSharedLiveActivity() {
  const [data, setData] = useState(cache);

  useEffect(() => {
    listeners.add(setData);
    ensurePolling();
    return () => {
      listeners.delete(setData);
      if (listeners.size === 0) stopPolling();
    };
  }, []);

  return data;
}

export default useSharedLiveActivity;
