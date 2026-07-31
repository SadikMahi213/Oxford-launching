// Admin - Statistics Header Component
import { Activity } from 'lucide-react';

export function StatisticsHeader() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center">
          <Activity className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Platform Statistics</h2>
          <p className="text-gray-400 text-sm">Manage live platform statistics displayed on homepage</p>
        </div>
      </div>
    </div>
  );
}
