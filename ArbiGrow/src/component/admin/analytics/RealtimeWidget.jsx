import { useEffect, useState, useRef } from "react";
import { Users } from "lucide-react";
import { getAnalyticsRealtime } from "../../../api/admin.api.js";
import useUserStore from "../../../store/userStore.js";

export default function RealtimeWidget() {
  const token = useUserStore((s) => s.token);
  const [active, setActive] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getAnalyticsRealtime(token);
        if (res.success) setActive(res.data.activeUsers);
      } catch {
        // silent
      }
    };
    fetch();
    intervalRef.current = setInterval(fetch, 60000);
    return () => clearInterval(intervalRef.current);
  }, [token]);

  if (active === null) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 backdrop-blur-xl border border-emerald-500/20 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
            Active Now
          </p>
          <p className="text-3xl font-bold text-white mt-1">{active}</p>
          <p className="text-xs text-gray-500 mt-1">Updates every 60s</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/20">
          <Users className="w-6 h-6 text-emerald-400" />
        </div>
      </div>
    </div>
  );
}
