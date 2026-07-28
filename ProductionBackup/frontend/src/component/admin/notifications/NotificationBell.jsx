import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import useUserStore from "../../../store/userStore.js";
import { getUnreadCount, getRecentNotifications, markNotificationRead, markAllNotificationsRead } from "../../../api/notification.api.js";

export default function NotificationBell() {
  const token = useUserStore((s) => s.token);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetch = useCallback(async () => {
    if (!token) return;
    try {
      const [c, r] = await Promise.all([
        getUnreadCount(token),
        getRecentNotifications(token, 5),
      ]);
      if (c.success) setCount(c.data.count);
      if (r.success) setItems(r.data.items);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 15000);
    return () => clearInterval(iv);
  }, [fetch]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMark = async (id) => {
    await markNotificationRead(token, id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    fetch();
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(token);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setCount(0);
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diff = now - d;
    if (diff < 0) return "just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const priorityColor = (p) => {
    if (p === "critical") return "bg-red-500";
    if (p === "high") return "bg-orange-500";
    if (p === "normal") return "bg-blue-500";
    return "bg-gray-500";
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
      >
        <Bell className="w-5 h-5 text-gray-300" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-lg shadow-red-500/50">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#0d1137] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-[100]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {count > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMark(n.id)}
                  className={`px-4 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${
                    !n.is_read ? "bg-blue-500/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${priorityColor(n.priority)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
