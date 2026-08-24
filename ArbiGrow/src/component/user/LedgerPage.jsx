import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Search,
  Coins,
  MonitorPlay,
  ShieldCheck,
  Users,
  GitMerge,
  Pickaxe,
  PartyPopper,
  Package,
  ShoppingBag,
  Repeat,
  SlidersHorizontal,
  BadgeCheck,
  RotateCcw,
  Banknote,
  Receipt,
  Landmark,
  ShoppingCart,
  ArrowLeftRight,
  CircleDollarSign,
  Trophy,
  Gift,
  Medal,
  Globe,
  Building2,
  Network,
  Wallet,
  TrendingUp,
  Clock,
  Home,
  DollarSign,
  User,
} from "lucide-react";
import { getLedgerTransactions } from "../../api/user.api.js";

const CATEGORIES = [
  "daily_earning",
  "ad_view",
  "captcha",
  "referral_bonus",
  "team_bonus",
  "matching_bonus",
  "mining",
  "signup_bonus",
  "package_bonus",
  "ecommerce_bonus",
  "ofa_conversion",
  "manual_adjustment",
  "ofa_transaction",
  "kyc_fee",
  "refund",
  "withdrawal",
  "service_fee",
  "deposit",
  "ecommerce",
  "transfer",
];

const VALID_CATEGORIES = new Set(CATEGORIES);

const TYPES = ["earning", "deduction", "adjustment"];
const CURRENCIES = ["USDT", "OFA"];
const STATUSES = ["pending", "completed", "failed", "reversed", "held", "refunded"];

const statusColor = (status) => {
  switch (status) {
    case "completed":
      return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
    case "pending":
    case "held":
      return "text-amber-300 bg-amber-500/10 border-amber-500/20";
    case "failed":
    case "reversed":
      return "text-red-300 bg-red-500/10 border-red-500/20";
    case "refunded":
      return "text-sky-300 bg-sky-500/10 border-sky-500/20";
    default:
      return "text-gray-300 bg-white/5 border-white/10";
  }
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const formatDateParts = (iso) => {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return { date: `${day}-${month}-${year}`, time: `${hours}:${minutes} ${ampm}` };
};

// Format a numeric amount without JS float drift: keep up to 6 decimals but
// strip trailing zeros, preserving the currency symbol + code.
const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const s = n.toFixed(6).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
};

// Format amount with exactly 3 decimal places for task-based earnings
const formatAmount3 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.000";
  return n.toFixed(3);
};

// Map backend ledger categories to clear, consistent icons for the mobile
// transaction list. Keys match the CATEGORIES list above.
const CATEGORY_ICON = {
  daily_earning: Coins,
  ad_view: MonitorPlay,
  captcha: ShieldCheck,
  referral_bonus: Users,
  team_bonus: Users,
  matching_bonus: GitMerge,
  mining: Pickaxe,
  signup_bonus: PartyPopper,
  package_bonus: Package,
  ecommerce_bonus: ShoppingBag,
  ofa_conversion: Repeat,
  manual_adjustment: SlidersHorizontal,
  ofa_transaction: Repeat,
  kyc_fee: BadgeCheck,
  refund: RotateCcw,
  withdrawal: Banknote,
  service_fee: Receipt,
  deposit: Landmark,
  ecommerce: ShoppingCart,
  transfer: ArrowLeftRight,
};

// Overview category cards rendered from summary.categories (backend provides
// lifetime DB-aggregated totals; status "soon" categories have no backing rows
// yet and are shown as Coming Soon instead of fabricated amounts).
//
// Each entry carries a full literal Tailwind class set so the JIT compiler can
// pick up every gradient/shadow variant. Only presentation classes live here —
// amounts, currencies and labels all come from the backend + i18n.
const DEFAULT_META = {
  icon: CircleDollarSign,
  gradient: "from-gray-600/70 to-slate-600/60",
  orb: "from-slate-400/40 to-transparent",
  iconWrap: "from-gray-500 to-slate-600",
  iconBg: "from-gray-600/30 to-slate-600/15",
  iconText: "text-gray-200",
  glowShadow: "hover:shadow-slate-500/20",
  currencyChip: "bg-white/10 text-gray-300",
};

const SUMMARY_CATEGORY_META = {
  total_deposit: {
    icon: Landmark,
    gradient: "from-sky-500/70 to-blue-600/60",
    orb: "from-sky-400/40 to-transparent",
    iconWrap: "from-sky-400 to-blue-600",
    iconBg: "from-sky-500/30 to-blue-600/15",
    iconText: "text-sky-200",
    glowShadow: "hover:shadow-sky-500/25",
    currencyChip: "bg-sky-500/15 text-sky-300",
  },
  total_withdrawal: {
    icon: Banknote,
    gradient: "from-rose-500/70 to-orange-500/60",
    orb: "from-rose-400/40 to-transparent",
    iconWrap: "from-rose-400 to-orange-500",
    iconBg: "from-rose-500/30 to-orange-500/15",
    iconText: "text-rose-200",
    glowShadow: "hover:shadow-rose-500/25",
    currencyChip: "bg-rose-500/15 text-rose-300",
  },
  total_earning: {
    icon: CircleDollarSign,
    gradient: "from-emerald-500/70 to-teal-600/60",
    orb: "from-emerald-400/40 to-transparent",
    iconWrap: "from-emerald-400 to-teal-600",
    iconBg: "from-emerald-500/30 to-teal-600/15",
    iconText: "text-emerald-200",
    glowShadow: "hover:shadow-emerald-500/25",
    currencyChip: "bg-emerald-500/15 text-emerald-300",
  },
  captcha: {
    icon: ShieldCheck,
    gradient: "from-cyan-500/70 to-sky-600/60",
    orb: "from-cyan-400/40 to-transparent",
    iconWrap: "from-cyan-400 to-sky-600",
    iconBg: "from-cyan-500/30 to-sky-600/15",
    iconText: "text-cyan-200",
    glowShadow: "hover:shadow-cyan-500/25",
    currencyChip: "bg-cyan-500/15 text-cyan-300",
  },
  ad_view: {
    icon: MonitorPlay,
    gradient: "from-pink-500/70 to-purple-600/60",
    orb: "from-pink-400/40 to-transparent",
    iconWrap: "from-pink-400 to-purple-600",
    iconBg: "from-pink-500/30 to-purple-600/15",
    iconText: "text-pink-200",
    glowShadow: "hover:shadow-pink-500/25",
    currencyChip: "bg-pink-500/15 text-pink-300",
  },
  generation_bonus: {
    icon: Network,
    gradient: "from-violet-500/70 to-blue-600/60",
    orb: "from-violet-400/40 to-transparent",
    iconWrap: "from-violet-400 to-blue-600",
    iconBg: "from-violet-500/30 to-blue-600/15",
    iconText: "text-violet-200",
    glowShadow: "hover:shadow-violet-500/25",
    currencyChip: "bg-violet-500/15 text-violet-300",
  },
  matching_bonus: {
    icon: GitMerge,
    gradient: "from-amber-500/70 to-orange-600/60",
    orb: "from-amber-400/40 to-transparent",
    iconWrap: "from-amber-400 to-orange-600",
    iconBg: "from-amber-500/30 to-orange-600/15",
    iconText: "text-amber-200",
    glowShadow: "hover:shadow-amber-500/25",
    currencyChip: "bg-amber-500/15 text-amber-300",
  },
  ecommerce_bonus: {
    icon: ShoppingBag,
    gradient: "from-blue-500/70 to-purple-500/60",
    orb: "from-blue-400/40 to-transparent",
    iconWrap: "from-blue-400 to-purple-600",
    iconBg: "from-blue-500/30 to-purple-600/15",
    iconText: "text-blue-200",
    glowShadow: "hover:shadow-blue-500/25",
    currencyChip: "bg-blue-500/15 text-blue-300",
  },
  ofa_free_mining: {
    icon: Pickaxe,
    gradient: "from-purple-500/70 to-indigo-600/60",
    orb: "from-purple-400/40 to-transparent",
    iconWrap: "from-purple-400 to-indigo-600",
    iconBg: "from-purple-500/30 to-indigo-600/15",
    iconText: "text-purple-200",
    glowShadow: "hover:shadow-purple-500/25",
    currencyChip: "bg-purple-500/15 text-purple-300",
  },
  ofa_settlement_balance: {
    icon: ArrowLeftRight,
    gradient: "from-teal-500/70 to-emerald-600/60",
    orb: "from-teal-400/40 to-transparent",
    iconWrap: "from-teal-400 to-emerald-600",
    iconBg: "from-teal-500/30 to-emerald-600/15",
    iconText: "text-teal-200",
    glowShadow: "hover:shadow-teal-500/25",
    currencyChip: "bg-teal-500/15 text-teal-300",
  },
  leadership_bonus: {
    icon: Trophy,
    gradient: "from-amber-500/70 to-purple-600/60",
    orb: "from-amber-400/40 to-transparent",
    iconWrap: "from-amber-400 to-purple-600",
    iconBg: "from-amber-500/30 to-purple-600/15",
    iconText: "text-amber-200",
    glowShadow: "hover:shadow-amber-500/25",
    currencyChip: "bg-amber-500/15 text-amber-300",
  },
  extra_offer_achievement: {
    icon: Gift,
    gradient: "from-fuchsia-500/70 to-rose-500/60",
    orb: "from-fuchsia-400/40 to-transparent",
    iconWrap: "from-fuchsia-400 to-rose-500",
    iconBg: "from-fuchsia-500/30 to-rose-500/15",
    iconText: "text-fuchsia-200",
    glowShadow: "hover:shadow-fuchsia-500/25",
    currencyChip: "bg-fuchsia-500/15 text-fuchsia-300",
  },
  position_achievement: {
    icon: Medal,
    gradient: "from-lime-500/70 to-emerald-600/60",
    orb: "from-lime-400/40 to-transparent",
    iconWrap: "from-lime-400 to-emerald-600",
    iconBg: "from-lime-500/30 to-emerald-600/15",
    iconText: "text-lime-200",
    glowShadow: "hover:shadow-lime-500/25",
    currencyChip: "bg-lime-500/15 text-lime-300",
  },
  international_achievement: {
    icon: Globe,
    gradient: "from-teal-500/70 to-cyan-600/60",
    orb: "from-teal-400/40 to-transparent",
    iconWrap: "from-teal-400 to-cyan-600",
    iconBg: "from-teal-500/30 to-cyan-600/15",
    iconText: "text-teal-200",
    glowShadow: "hover:shadow-teal-500/25",
    currencyChip: "bg-teal-500/15 text-teal-300",
  },
  company_profit: {
    icon: Building2,
    gradient: "from-blue-500/70 to-indigo-600/60",
    orb: "from-blue-400/40 to-transparent",
    iconWrap: "from-blue-400 to-indigo-600",
    iconBg: "from-blue-500/30 to-indigo-600/15",
    iconText: "text-blue-200",
    glowShadow: "hover:shadow-blue-500/25",
    currencyChip: "bg-blue-500/15 text-blue-300",
  },
};

// Priority order for the overview: the primary balance is featured first and
// rendered full-width on mobile, then the key earning/transaction metrics.
// Unknown/future keys fall through to the end in backend order (stable sort).
const SUMMARY_PRIORITY = [
  "ofa_settlement_balance",
  "total_earning",
  "total_deposit",
  "total_withdrawal",
  "matching_bonus",
  "ofa_free_mining",
  "captcha",
  "ad_view",
  "generation_bonus",
  "ecommerce_bonus",
  "leadership_bonus",
  "extra_offer_achievement",
  "position_achievement",
  "international_achievement",
  "company_profit",
];
const priorityRank = (key) => {
  const i = SUMMARY_PRIORITY.indexOf(key);
  return i === -1 ? SUMMARY_PRIORITY.length : i;
};
const sortByPriority = (cards) =>
  [...cards].sort((a, b) => priorityRank(a.key) - priorityRank(b.key));

const LedgerPage = ({ setActivePage, earningOnly = false }) => {
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totals: {}, balances: {}, categories: [] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [stream, setStream] = useState("earning");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [filters, setFilters] = useState({
    category: "",
    type: "",
    currency: "",
    status: "",
    search: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLedgerTransactions({
        page,
        page_size: pageSize,
        stream,
        category: filters.category,
        type: filters.type,
        currency: filters.currency,
        status: filters.status,
        search: filters.search,
      });
      const data = res?.data || {};
      const rawItems = data.items || [];
      const validItems = rawItems.filter((item) => VALID_CATEGORIES.has(item.category));
      setItems(validItems);
      setSummary(data.summary || { totals: {}, balances: {}, categories: [] });
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Ledger load failed", err);
      setError(t("ledger.loadError", "Unable to load ledger records."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, stream, filters, t]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const switchStream = (next) => {
    if (earningOnly) return;
    if (next === stream) return;
    setStream(next);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const categories = summary.categories || [];
  const activeCards = categories.filter((c) => {
    if (c.status === "soon") return false;
    if (earningOnly && c.stream !== "earning") return false;
    return true;
  });
  const soonCards = categories.filter((c) => c.status === "soon");

  // Premium fintech overview card. Presentation-only: values, labels and
  // currencies are bound straight from the backend payload + i18n keys.
  // Mobile uses a compact 2-column layout (bigger balance featured on top);
  // desktop keeps the richer 5-column layout with supporting badges.
  const renderSummaryCard = (c, isSoon) => {
    const meta = { ...DEFAULT_META, ...(SUMMARY_CATEGORY_META[c.key] || {}) };
    const Icon = meta.icon;
    const label = t(`ledger.category.${c.key}`, c.key);
    const streamName = c.stream || "earning";
    const StreamIcon = streamName === "transaction" ? ArrowLeftRight : streamName === "balance" ? Wallet : TrendingUp;
    const featured = c.key === "ofa_settlement_balance";

    if (isSoon) {
      return (
        <div
          key={c.key}
          className="group relative h-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] p-px opacity-70 transition-all duration-300 hover:-translate-y-1 hover:opacity-100 hover:shadow-lg hover:shadow-white/5"
        >
          <div className="relative flex h-full items-center gap-2 overflow-hidden rounded-[11px] sm:rounded-[15px] border border-dashed border-white/10 bg-[#0A122C]/95 p-2.5 sm:p-4 sm:gap-3">
            <div className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-gradient-to-bl ${meta.orb} opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40`} />
            <div className={`relative rounded-lg sm:rounded-xl bg-gradient-to-br ${meta.iconWrap} p-px`}>
              <div className="relative flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center overflow-hidden rounded-[7px] sm:rounded-[11px] bg-gradient-to-br ${meta.iconBg}">
                <div className="pointer-events-none absolute inset-0 rounded-[7px] sm:rounded-[11px] bg-gradient-to-br from-white/20 to-transparent" />
                <Icon size={15} strokeWidth={2.2} aria-hidden="true" className={`relative ${meta.iconText}`} />
              </div>
            </div>
            <div className="relative min-w-0 flex-1">
              <div className="line-clamp-2 text-[10px] sm:text-xs font-medium text-gray-400">{label}</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-px sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                <Clock size={9} aria-hidden="true" />
                {t("ledger.soon", "Soon")}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={c.key}
        className={`group relative h-full rounded-xl sm:rounded-2xl bg-gradient-to-br ${meta.gradient} p-px shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${meta.glowShadow} ${featured ? "xs:col-span-2 lg:col-span-2" : ""}`}
      >
        <div className={`relative flex h-full flex-col overflow-hidden rounded-[11px] sm:rounded-[15px] bg-[#0A122C]/95 ${featured ? "p-3 sm:p-5" : "p-2.5 sm:p-4"}`}>
          {/* Decorative gradient orb */}
          <div className={`pointer-events-none absolute -right-7 -top-10 h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-bl ${meta.orb} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`} />
          {/* Inner top highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/25 via-white/5 to-transparent" />

          <div className="relative flex items-center justify-between gap-2">
            {/* Floating icon */}
            <div className={`relative rounded-lg sm:rounded-xl bg-gradient-to-br ${meta.iconWrap} p-px shadow-md`}>
              <div className={`relative flex items-center justify-center overflow-hidden rounded-[7px] sm:rounded-[11px] bg-gradient-to-br ${meta.iconBg} ${featured ? "h-9 w-9 sm:h-12 sm:w-12" : "h-7 w-7 sm:h-11 sm:w-11"}`}>
                <div className="pointer-events-none absolute inset-0 rounded-[7px] sm:rounded-[11px] bg-gradient-to-br from-white/20 to-transparent" />
                <Icon size={featured ? 18 : 15} strokeWidth={2.2} aria-hidden="true" className={`relative ${meta.iconText} drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]`} />
              </div>
            </div>
            <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.currencyChip}`}>
              <StreamIcon size={11} aria-hidden="true" />
              {t(`ledger.stream.${streamName}`, streamName)}
            </span>
          </div>

          <div className="relative mt-2 sm:mt-3 line-clamp-2 text-[10px] sm:text-xs font-medium leading-snug text-gray-400">{label}</div>

          <div className={`relative mt-0.5 sm:mt-1 flex items-baseline gap-1 font-bold text-white ${featured ? "text-lg sm:text-2xl" : "text-sm sm:text-lg lg:text-xl"}`}>
            <span className="truncate">{formatAmount(c.amount)}</span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-gray-400">{c.currency}</span>
          </div>

          {c.balance_ofa != null && (
            <div className="relative text-[10px] text-gray-500 leading-none">
              {formatAmount(c.balance_ofa)} OFA
            </div>
          )}

          <div className="relative mt-auto pt-1.5 sm:pt-2.5 hidden sm:block">
            <div className="mb-2.5 border-t border-white/5" />
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.currencyChip}`}>
                {c.currency}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500/80">
                {t("ledger.lifetime", "Lifetime")}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Compact wallet-shortcut card for the mobile 4-per-row grid. Same meta,
  // labels, amounts and currencies as the desktop cards — only small sizes,
  // tight padding and zero horizontal overflow.
  const renderMobileShortcutCard = (c, isSoon) => {
    const meta = { ...DEFAULT_META, ...(SUMMARY_CATEGORY_META[c.key] || {}) };
    const Icon = meta.icon;
    const label = t(`ledger.category.${c.key}`, c.key);
    return (
      <div
        key={c.key}
        className="group relative flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-1 py-1.5 text-center"
      >
        <div className={`pointer-events-none absolute -right-4 -top-6 h-12 w-12 rounded-full bg-gradient-to-bl ${meta.orb} opacity-20 blur-xl`} />
        <span className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${meta.iconBg}`}>
          <Icon size={12} strokeWidth={2.2} aria-hidden="true" className={`relative ${meta.iconText}`} />
        </span>
        <div className="relative w-full truncate text-[9px] font-medium leading-[1.15] text-gray-400">
          {label}
        </div>
        <div className="relative flex w-full min-w-0 items-baseline justify-center gap-0.5">
          <span className="min-w-0 truncate text-[10px] font-bold text-white">{isSoon ? t("ledger.soon", "Soon") : formatAmount(c.amount)}</span>
          {!isSoon && <span className="shrink-0 text-[7px] font-semibold text-gray-500">{c.currency}</span>}
        </div>
      </div>
    );
  };

  const renderTable = () => (
    <>
      {/* Table (desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.date", "Date")}</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.category", "Category")}</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.type", "Type")}</th>
              <th className="text-right p-4 text-sm font-semibold text-gray-400">{t("ledger.col.amount", "Amount")}</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.status", "Status")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-400">
                  <Loader2 className="inline animate-spin mr-2" size={18} />
                  {t("ledger.loading", "Loading…")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-400">{t("ledger.noRecords", "No records found.")}</td>
              </tr>
            ) : (
              items.map((item) => {
                const isDebit = item.direction === "debit";
                const isTaskEarning = item.category === "captcha" || item.category === "ad_view";
                return (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="p-4 text-sm text-gray-300 whitespace-nowrap">{formatDate(item.date)}</td>
                    <td className="p-4 text-sm text-white">{t(item.category_label_key || `ledger.category.${item.category}`, item.category)}</td>
                    <td className="p-4 text-sm text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        {isDebit ? <ArrowUpRight size={14} className="text-red-300" /> : <ArrowDownLeft size={14} className="text-emerald-300" />}
                        {t(`ledger.type.${item.type}`, item.type)}
                      </span>
                    </td>
                    <td className={`p-4 text-sm font-semibold text-right ${isDebit ? "text-red-300" : "text-emerald-300"}`}>
                      {isDebit ? "-" : "+"}{isTaskEarning ? formatAmount3(item.amount) : formatAmount(item.amount)} {item.currency}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${statusColor(item.status)}`}>
                        {t(`ledger.status.${item.status}`, item.status)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked card layout */}
      <div className="md:hidden px-3 pb-3">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <Loader2 className="inline animate-spin mr-2" size={16} />
            {t("ledger.loading", "Loading…")}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t("ledger.noRecords", "No records found.")}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const isDebit = item.direction === "debit";
              const Icon = CATEGORY_ICON[item.category] || CircleDollarSign;
              const { date: dateStr, time: timeStr } = formatDateParts(item.date);
              const isTaskEarning = item.category === "captcha" || item.category === "ad_view";
              return (
                <div key={item.id} className="rounded-lg border border-white/10 bg-[#0B132B] p-3 flex flex-col gap-2">
                  {/* Category + Type row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5">
                        <Icon size={14} className="text-gray-400" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{t(item.category_label_key || `ledger.category.${item.category}`, item.category)}</div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          {isDebit ? <ArrowUpRight size={11} className="text-red-300" /> : <ArrowDownLeft size={11} className="text-emerald-300" />}
                          {t(`ledger.type.${item.type}`, item.type)}
                        </div>
                      </div>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${statusColor(item.status)}`}>
                      {t(`ledger.status.${item.status}`, item.status)}
                    </span>
                  </div>
                  {/* Amount + Date row */}
                  <div className="flex items-end justify-between gap-2 pt-1 border-t border-white/5">
                    <div className="text-[11px] text-gray-500">
                      <div>{dateStr}</div>
                      {timeStr && <div>{timeStr}</div>}
                    </div>
                    <div className={`text-sm font-bold whitespace-nowrap ${isDebit ? "text-red-300" : "text-emerald-300"}`}>
                      {isDebit ? "-" : "+"}{isTaskEarning ? formatAmount3(item.amount) : formatAmount(item.amount)} {item.currency}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="animate-[fadeIn_0.4s_ease] rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden pb-20 md:pb-0">
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-white/10">
          {/* Mobile header */}
          <div className="flex md:hidden items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setActivePage?.("overview")}
                className="h-9 w-9 shrink-0 rounded-full bg-[#0B132B] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                aria-label="Back"
              >
                <ChevronLeft size={18} className="text-white" />
              </button>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold text-white leading-tight truncate">{t("ledger.title", "Earning History")}</h2>
                <p className="text-[11px] text-gray-400 truncate">{t("ledger.subtitle", "Every earning, bonus and reward in one place.")}</p>
              </div>
            </div>
            <button
              onClick={() => document.getElementById("ledger-filters")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="h-9 w-9 shrink-0 rounded-full bg-[#0B132B] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
              aria-label="Filter"
            >
              <SlidersHorizontal size={16} className="text-gray-300" />
            </button>
          </div>
          {/* Desktop header */}
          <div className="hidden md:flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">{t("ledger.title", "Earning History")}</h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{t("ledger.subtitle", "Every earning, bonus and reward in one place.")}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 sm:p-4 text-sm text-red-300 bg-red-500/10 border-b border-red-500/20">{error}</div>
        )}

        {/* Earning History overview cards - earnings only (no wallet/deposit/withdrawal) */}
        <div className="p-3 sm:p-6 border-b border-white/10">
          <h3 className="hidden md:block text-xs sm:text-sm font-semibold text-gray-300 mb-2 sm:mb-3">{t("ledger.overview", "Overview")}</h3>

          {/* Mobile: compact cards for all active categories */}
          <div className="md:hidden grid grid-cols-2 gap-3">
            {sortByPriority(activeCards).map((c) => {
              const meta = SUMMARY_CATEGORY_META[c.key] || {};
              const Icon = meta.icon || CircleDollarSign;
              const label = t(`ledger.category.${c.key}`, c.key);
              const amount = formatAmount(c.amount);
              return (
                <div key={c.key} className="relative rounded-xl border border-white/10 bg-[#0B132B] p-3 flex flex-col gap-2 overflow-hidden">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${meta.bg || "bg-white/5"} ${meta.border || "border-white/10"} shrink-0`}
                    style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))`, borderColor: "rgba(255,255,255,0.1)" }}>
                    <Icon size={16} className={meta.iconText || "text-gray-300"} aria-hidden="true" />
                  </div>
                  <div className="text-[11px] font-medium text-gray-400 leading-tight line-clamp-1">{label}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[15px] font-bold text-white truncate">{c.currency === "OFA" ? amount : `$${amount}`}</span>
                    <span className="text-[9px] font-semibold text-gray-500">{c.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tablet / desktop: full summary cards for all active categories */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {sortByPriority(activeCards).map((c) => renderSummaryCard(c, false))}
          </div>
        </div>

        {/* Mobile filter pills */}
        <div className="md:hidden px-3 pt-3 border-b border-white/10">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3 -mx-3 px-3">
            {(
              earningOnly
                ? [
                    { id: "", label: t("ledger.filter.all", "All") },
                    { id: "captcha", label: t("ledger.category.captcha", "Captcha") },
                    { id: "ad_view", label: t("ledger.category.ad_view", "Ad View") },
                    { id: "matching_bonus", label: t("ledger.category.matching_bonus", "Matching") },
                    { id: "signup_bonus", label: t("ledger.category.signup_bonus", "Signup") },
                    { id: "referral_bonus", label: t("ledger.category.referral_bonus", "Referral") },
                    { id: "ecommerce_bonus", label: t("ledger.category.ecommerce_bonus", "E-commerce") },
                    { id: "mining", label: t("ledger.category.mining", "Mining") },
                  ]
                : [
                    { id: "", label: "All" },
                    { id: "deposit", label: "Deposit" },
                    { id: "withdrawal", label: "Withdrawal" },
                    { id: "matching_bonus", label: "Bonus" },
                    { id: "ecommerce", label: "Spending" },
                  ]
            ).map((tab) => {
              const active = filters.category === tab.id;
              return (
                <button
                  key={tab.id || "all"}
                  onClick={() => updateFilter("category", tab.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-900/20" : "bg-[#0B132B] border-white/10 text-gray-400 hover:text-white hover:border-white/20"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stream tabs */}
        <div className="px-4 sm:px-6 pt-4 border-b border-white/10">
          <div className={`inline-flex w-full sm:w-auto rounded-xl bg-[#0A122C] border border-white/10 p-1 ${earningOnly ? "" : "sm:w-auto"}`}>
            <button
              onClick={() => switchStream("earning")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${stream === "earning" ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-gray-400 hover:text-white"}`}
            >
              {t("ledger.tab.earning", "Earning History")}
            </button>
            {!earningOnly && (
              <button
                onClick={() => switchStream("transaction")}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${stream === "transaction" ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-gray-400 hover:text-white"}`}
              >
                {t("ledger.tab.transaction", "Transaction History")}
              </button>
            )}
          </div>
        </div>

        {/* Filters - hidden on mobile, visible on tablet/desktop */}
        <div id="ledger-filters" className="hidden md:block p-4 sm:p-6 border-b border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filters.category}
              onChange={(e) => updateFilter("category", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0A122C] border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="">{t("ledger.filter.allCategories", "All Categories")}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{t(`ledger.category.${cat}`, cat)}</option>
              ))}
            </select>
          </div>
          <select
            value={filters.type}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0A122C] border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">{t("ledger.filter.allTypes", "All Types")}</option>
            {TYPES.map((tp) => (
              <option key={tp} value={tp}>{t(`ledger.type.${tp}`, tp)}</option>
            ))}
          </select>
          <select
            value={filters.currency}
            onChange={(e) => updateFilter("currency", e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0A122C] border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">{t("ledger.filter.allCurrencies", "All Currencies")}</option>
            {CURRENCIES.map((cur) => (
              <option key={cur} value={cur}>{t(`ledger.currency.${cur}`, cur)}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0A122C] border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">{t("ledger.filter.allStatuses", "All Statuses")}</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>{t(`ledger.status.${st}`, st)}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder={t("ledger.filter.search", "Search reference…")}
              className="w-full px-3 py-2 rounded-lg bg-[#0A122C] border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>

        {renderTable()}

        {/* Pagination */}
        <div className="p-4 sm:p-6 flex items-center justify-between border-t border-white/10">
          <div className="text-sm text-gray-400">
            {t("ledger.pageInfo", { page, totalPages, total })}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg bg-[#0A122C] border border-white/10 text-white disabled:opacity-40 hover:border-cyan-500/50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg bg-[#0A122C] border border-white/10 text-white disabled:opacity-40 hover:border-cyan-500/50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0B132B] border-t border-white/10 px-2 py-2 flex items-center justify-around">
          <button onClick={() => setActivePage?.("overview")} className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400 hover:text-white transition-colors">
            <Home size={18} aria-hidden="true" />
            <span className="text-[10px] leading-none">Dashboard</span>
          </button>
          <button className="flex flex-col items-center gap-1 px-3 py-1 text-blue-400">
            <TrendingUp size={18} aria-hidden="true" />
            <span className="text-[10px] font-semibold leading-none">Earning</span>
          </button>
          <button onClick={() => setActivePage?.("deposit")} className="flex flex-col items-center justify-center -mt-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/30 border-2 border-[#0B132B]">
              <DollarSign size={20} className="text-white" aria-hidden="true" />
            </div>
          </button>
          <button onClick={() => setActivePage?.("transfer")} className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400 hover:text-white transition-colors">
            <Wallet size={18} aria-hidden="true" />
            <span className="text-[10px] leading-none">Wallet</span>
          </button>
          <button onClick={() => setActivePage?.("profile")} className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400 hover:text-white transition-colors">
            <User size={18} aria-hidden="true" />
            <span className="text-[10px] leading-none">Profile</span>
          </button>
        </div>
      </div>
  );
};

export default LedgerPage;
