import { Users, UserPlus, TrendingUp, Calendar, BarChart3, Activity } from "lucide-react";

const cards = [
  { key: "totalVisitors", label: "Total Visitors", icon: Users, color: "from-blue-600 to-blue-400" },
  { key: "todayVisitors", label: "Today's Visitors", icon: UserPlus, color: "from-green-600 to-green-400" },
  { key: "yesterdayVisitors", label: "Yesterday's Visitors", icon: BarChart3, color: "from-purple-600 to-purple-400" },
  { key: "weeklyVisitors", label: "Weekly Visitors", icon: TrendingUp, color: "from-orange-600 to-orange-400" },
  { key: "monthlyVisitors", label: "Monthly Visitors", icon: Calendar, color: "from-pink-600 to-pink-400" },
  { key: "yearlyVisitors", label: "Yearly Visitors", icon: Calendar, color: "from-teal-600 to-teal-400" },
  { key: "currentlyOnline", label: "Currently Online", icon: Activity, color: "from-red-600 to-red-400" },
];

export default function VisitorSummaryCards({ data }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {cards.map((card) => {
        const value = data?.[card.key] ?? 0;
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 hover:border-cyan-500/30 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl md:text-3xl font-bold text-white">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              <p className="text-xs text-gray-400 truncate">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
