import { create } from "zustand";
import { getLiveStats } from "../api/user.api.js";

const POLL_INTERVAL_MIN = 6000;
const POLL_INTERVAL_MAX = 10000;

let refCount = 0;
let timer = null;

function scheduleNext() {
  timer = setTimeout(async () => {
    await useLiveStatsStore.getState().refresh();
    if (refCount > 0) scheduleNext();
  }, POLL_INTERVAL_MIN + Math.random() * (POLL_INTERVAL_MAX - POLL_INTERVAL_MIN));
}

export const useLiveStatsStore = create((set) => ({
  data: null,
  error: false,
  loading: true,
  refresh: async () => {
    try {
      const res = await getLiveStats();
      set({
        data: {
          live_online: res.data.live_online,
          tasks_completed_today: res.data.tasks_completed_today,
          earnings_paid_today: res.data.earnings_paid_today,
        },
        error: false,
        loading: false,
      });
    } catch {
      set({ error: true, loading: false });
    }
  },
}));

export const liveStatsActions = {
  subscribe() {
    refCount += 1;
    if (refCount === 1) {
      useLiveStatsStore.getState().refresh();
      scheduleNext();
    }
  },
  unsubscribe() {
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0 && timer) {
      clearTimeout(timer);
      timer = null;
    }
  },
};
