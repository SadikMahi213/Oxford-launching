// Admin - Individual stat input field component

const colorClasses = {
  blue: "from-blue-600/10 to-blue-600/5 border-blue-500/30",
  red: "from-red-600/10 to-red-600/5 border-red-500/30",
  green: "from-green-600/10 to-green-600/5 border-green-500/30",
  orange: "from-orange-600/10 to-orange-600/5 border-orange-500/30",
};

const iconColors = {
  blue: "text-blue-400",
  red: "text-red-400",
  green: "text-green-400",
  orange: "text-orange-400",
};

export function StatInputField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  color,
  isCurrency = false,
}) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl border p-5`}
    >
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-5 h-5 ${iconColors[color]}`} />
        <label className="text-sm font-medium text-gray-300">{label}</label>
      </div>
      <div className="relative">
        {isCurrency && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            $
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            // Only allow numbers
            const numValue = e.target.value.replace(/[^0-9.]/g, "");
            onChange(numValue);
          }}
          placeholder={placeholder}
          className={`w-full ${isCurrency ? "pl-8" : "pl-4"} pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all`}
        />
      </div>
      {/* {value && (
        <p className="mt-2 text-xs text-gray-400">
          Display: {isCurrency ? '$' : ''}{parseInt(value || '0').toLocaleString()}
        </p>
      )} */}
    </div>
  );
}
