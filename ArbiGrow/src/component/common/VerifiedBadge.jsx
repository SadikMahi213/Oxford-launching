import verifiedBadge from "../../assets/verified-badge.jpeg";

const sizeMap = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export default function VerifiedBadge({ size = "sm", className = "" }) {
  return (
    <img
      src={verifiedBadge}
      alt="Verified"
      className={`${sizeMap[size] || sizeMap.sm} object-contain shrink-0 rounded-full bg-white ${className}`}
    />
  );
}
