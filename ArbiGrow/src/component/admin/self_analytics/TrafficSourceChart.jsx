import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SOURCE_LABELS = {
  direct: "Direct Visit",
  google: "Google Search",
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  referral: "Referral Links",
};

const COLORS = {
  direct: "#06b6d4",
  google: "#3b82f6",
  facebook: "#1877f2",
  youtube: "#ff4444",
  instagram: "#e1306c",
  tiktok: "#00f2ea",
  referral: "#8b5cf6",
};

export default function TrafficSourceChart({ sources }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Traffic Sources</h3>
        <div className="flex items-center justify-center h-64 text-gray-500 text-sm">No data yet</div>
      </div>
    );
  }

  const chartData = sources
    .filter((s) => s.source && s.visitors > 0)
    .map((s) => ({
      ...s,
      label: SOURCE_LABELS[s.source] || s.source,
      fill: COLORS[s.source] || "#6b7280",
    }));

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Traffic Sources</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(13,17,55,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
            <Bar dataKey="visitors" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
