export default function CountriesTable({ countries }) {
  if (!countries || countries.length === 0) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Users by Country</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="pb-3 text-gray-400 font-medium">Country</th>
              <th className="pb-3 text-gray-400 font-medium text-right">Users</th>
              <th className="pb-3 text-gray-400 font-medium text-right">New Users</th>
              <th className="pb-3 text-gray-400 font-medium text-right">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((row) => (
              <tr key={row.country} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-3 text-white font-medium">{row.country || "(not set)"}</td>
                <td className="py-3 text-right text-white">
                  {parseInt(row.totalUsers || 0).toLocaleString()}
                </td>
                <td className="py-3 text-right text-gray-300">
                  {parseInt(row.newUsers || 0).toLocaleString()}
                </td>
                <td className="py-3 text-right text-gray-300">
                  {parseInt(row.sessions || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
