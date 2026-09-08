import { useEffect, useState } from "react";
import api from "../../api/axiosInstance.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared global live-activity store.
//
// A SINGLE lightweight polling loop (one request per 3s per browser tab)
// fetches the server-authoritative global stream. Every component that calls
// `useSharedLiveActivity()` subscribes to the same cached snapshot, so the
// Global Live Activity feed and the OFA Cryptocurrency stats stay perfectly
// in sync across the page — and across all users, since the data originates
// from the backend. The per-second rotation of the feed is handled entirely
// client-side (see LiveActivityFeed) and never triggers a network request.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 3000;

let cache = null;
let listeners = new Set();
let timer = null;
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
  if (timer) return;
  fetchOnce();
  timer = setInterval(fetchOnce, POLL_MS);
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
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
