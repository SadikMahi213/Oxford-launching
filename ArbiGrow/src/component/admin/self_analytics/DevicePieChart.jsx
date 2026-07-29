import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function DevicePieChart({ devices, operatingSystems }) {
  const hasDevices = devices && devices.length > 0;
  const hasOS = operatingSystems && operatingSystems.length > 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Device Types</h3>
      {!hasDevices ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">No data yet</div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={devices}
                dataKey="visitors"
                nameKey="device"
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={40}
              >
                {devices.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(13,17,55,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
              <Legend
                formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasOS && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Operating Systems</h4>
          <div className="space-y-2">
            {operatingSystems.slice(0, 5).map((item) => (
              <div key={item.os} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{item.os}</span>
                <span className="text-sm text-white font-medium">{item.visitors.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
