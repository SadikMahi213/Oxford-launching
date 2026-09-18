import React from "react";

export default function Button({
  children,
  onClick,
  type = "button",
  icon = null,
  fullWidth = true, // Full width button
  variant = "frosted", // frosted / gradient
  className = "",
  disabled = false,
}) {
  // Base styling
  const baseClasses =
    "flex items-center justify-center gap-2 font-semibold transition-all duration-300 rounded-xl px-5 py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed";

  // Variant styling
  const variantClasses =
    variant === "gradient"
      ? "relative overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 disabled:hover:scale-100 disabled:hover:shadow-blue-500/30"
      : "bg-white/5 backdrop-blur-sm border border-blue-500/30 text-gray-300 hover:bg-white/10 hover:border-blue-400/50";

  // Width
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${widthClass} ${className}`}
    >
      {icon && React.cloneElement(icon, { className: "w-5 h-5" })}
      <span className="text-center">{children}</span>
    </button>
  );
}
