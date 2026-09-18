import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function DailyVisitorsChart({ data }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    date: `${d.date?.slice(0, 4)}-${d.date?.slice(4, 6)}-${d.date?.slice(6, 8)}`,
    users: parseInt(d.totalUsers || 0),
    newUsers: parseInt(d.newUsers || 0),
    sessions: parseInt(d.sessions || 0),
  }));

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Daily Visitors</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#3b82f6"
              fill="url(#usersGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
