import { Users, UserPlus, Eye, Clock, Activity, TrendingUp } from "lucide-react";

export default function SummaryCards({ data }) {
  if (!data) return null;

  const cards = [
    {
      label: "Total Users",
      value: data.totalUsers?.toLocaleString() || "0",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      prev: data.previous?.totalUsers,
    },
    {
      label: "New Users",
      value: data.newUsers?.toLocaleString() || "0",
      icon: UserPlus,
      color: "from-green-500 to-emerald-600",
      prev: data.previous?.newUsers,
    },
    {
      label: "Sessions",
      value: data.sessions?.toLocaleString() || "0",
      icon: Activity,
      color: "from-purple-500 to-purple-600",
      prev: data.previous?.sessions,
    },
    {
      label: "Page Views",
      value: data.pageViews?.toLocaleString() || "0",
      icon: Eye,
      color: "from-cyan-500 to-cyan-600",
      prev: data.previous?.pageViews,
    },
    {
      label: "Avg Engagement",
      value: data.avgEngagementTime ? `${Math.round(data.avgEngagementTime)}s` : "0s",
      icon: Clock,
      color: "from-orange-500 to-orange-600",
    },
    {
      label: "Bounce Rate",
      value: data.bounceRate ? `${parseFloat(data.bounceRate).toFixed(1)}%` : "0%",
      icon: TrendingUp,
      color: "from-rose-500 to-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {card.label}
            </span>
            <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} bg-opacity-20`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{card.value}</div>
          {card.prev != null && (
            <div className="mt-1 text-xs text-gray-500">
              Prev: {card.prev.toLocaleString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
