import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import useUserStore from "../../../store/userStore.js";

export default function PopupNotification() {
  const token = useUserStore((s) => s.token);
  const [toasts, setToasts] = useState([]);

  const connect = useCallback(() => {
    if (!token) return null;
    const url = `/api/v1/admin/notifications/stream?token=${token}`;
    let es;
    try {
      es = new EventSource(url);
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
        es.close();
        setTimeout(connect, 5000);
      };
    } catch {
      setTimeout(connect, 5000);
    }
    return es;
  }, [token]);

  useEffect(() => {
    const es = connect();
    return () => {
      if (es) es.close();
    };
  }, [connect]);

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
