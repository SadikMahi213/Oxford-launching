import { Search } from 'lucide-react';

export function InvestmentFilters({
  searchQuery,
  statusFilter,

  onSearchChange,
  onStatusChange,
  
}) {
  return (
    <div className="mb-6 flex flex-col lg:flex-row gap-4">
      
      {/* Search */}
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user name, email, or package..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors text-white placeholder-gray-500"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'completed'].map((filter) => (
          <button
            key={filter}
            onClick={() => onStatusChange(filter)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              statusFilter === filter
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Package Filter */}
      {/* <select
        value={packageFilter}
        onChange={(e) => onPackageChange(e.target.value)}
        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
      >
        <option value="all">All Packages</option>
        {uniquePackages.map((pkg) => (
          <option key={pkg} value={pkg}>
            {pkg}
          </option>
        ))}
      </select> */}

    </div>
  );
}