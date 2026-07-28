import { Globe } from "lucide-react";

export default function CountriesReport({ countries }) {
  if (!countries || countries.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Countries</h3>
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">No data yet</div>
      </div>
    );
  }

  const maxVisitors = Math.max(...countries.map((c) => c.visitors), 1);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Top Countries</h3>
      <div className="space-y-3">
        {countries.map((country) => (
          <div key={country.country} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{country.country}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-medium">{country.visitors.toLocaleString()}</span>
                <span className="text-gray-500 w-12 text-right">{country.percentage}%</span>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${(country.visitors / maxVisitors) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
