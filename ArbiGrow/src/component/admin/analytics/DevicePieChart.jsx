import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

export default function DevicePieChart({ devices, operatingSystems }) {
  if (!devices || devices.length === 0) return null;

  const pieData = devices.map((d) => ({
    name: d.deviceCategory || "Unknown",
    value: parseInt(d.totalUsers || 0),
  }));

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Device Distribution</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {operatingSystems && operatingSystems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Operating Systems</h4>
          <div className="space-y-2">
            {operatingSystems.slice(0, 6).map((os) => (
              <div key={os.operatingSystem} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{os.operatingSystem}</span>
                <span className="text-sm font-medium text-white">
                  {parseInt(os.totalUsers || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
