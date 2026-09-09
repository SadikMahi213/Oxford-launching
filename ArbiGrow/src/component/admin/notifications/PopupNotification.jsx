import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import useUserStore from "../../../store/userStore.js";

const RETRY_MS = 5000;

export default function PopupNotification() {
  const token = useUserStore((s) => s.token);
  const [toasts, setToasts] = useState([]);
  const esRef = useRef(null);
  const retryRef = useRef(null);
  const connectingRef = useRef(false);
  const connectRef = useRef(null);

  const cleanup = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
    if (esRef.current) {
      esRef.current.onmessage = null;
      esRef.current.onerror = null;
      esRef.current.close();
      esRef.current = null;
    }
    connectingRef.current = false;
  }, []);

  const scheduleRetry = useCallback(() => {
    if (retryRef.current || !token) return;
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      connectRef.current?.();
    }, RETRY_MS);
  }, [token]);

  const connect = useCallback(() => {
    if (!token || connectingRef.current) return;
    // Close any stale connection before opening a new one: exactly one
    // live EventSource at a time, so error retries can never accumulate.
    cleanup();
    connectingRef.current = true;
    const url = `/api/v1/admin/notifications/stream?token=${token}`;
    let es = null;
    try {
      es = new EventSource(url);
      esRef.current = es;
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const id = Date.now() + Math.random();
          setToasts((prev) => [...prev.slice(-4), { ...data, _id: id }]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t._id !== id));
          }, 5000);
        } catch {
          // ignore
        }
      };
      es.onerror = () => {
        // Tear down the broken stream and schedule ONE tracked retry.
        cleanup();
        scheduleRetry();
      };
    } catch {
      cleanup();
      scheduleRetry();
    }
  }, [token, cleanup, scheduleRetry]);

  useEffect(() => {
    connectRef.current = connect;
    connect();
    return () => {
      cleanup();
    };
  }, [connect, cleanup]);

  const priorityBorder = (p) => {
    if (p === "critical") return "border-l-red-500";
    if (p === "high") return "border-l-orange-500";
    if (p === "normal") return "border-l-blue-500";
    return "border-l-gray-500";
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] space-y-2">
      {toasts.map((t) => (
        <div
          key={t._id}
          className={`w-80 bg-[#0d1137] border border-white/10 border-l-4 ${priorityBorder(t.priority)} rounded-xl shadow-2xl shadow-black/50 p-3 animate-slide-up`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{t.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x._id !== t._id))}
              className="text-gray-500 hover:text-white flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
