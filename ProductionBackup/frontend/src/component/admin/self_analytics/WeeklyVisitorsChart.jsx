import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function WeeklyVisitorsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Weekly Visitors</h3>
        <div className="flex items-center justify-center h-64 text-gray-500 text-sm">No data yet</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Weekly Visitors</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="week" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(13,17,55,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
            <Bar dataKey="visitors" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
