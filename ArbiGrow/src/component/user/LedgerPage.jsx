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
} from "lucide-react";
import { getLedgerTransactions } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";

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
  "refund",
  "withdrawal",
  "service_fee",
  "ecommerce",
  "transfer",
];

const EARNING_CATEGORIES = new Set([
  "daily_earning", "ad_view", "captcha", "referral_bonus", "team_bonus",
  "matching_bonus", "mining", "signup_bonus", "package_bonus",
  "ecommerce_bonus", "ecommerce",
]);

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

const displayStatus = (item) => {
  if ((item.status === "pending" || item.status === "held") && Number(item.amount) === 0) {
    return "rejected";
  }
  return item.status;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds} ${ampm}`;
};

const formatDateParts = (iso) => {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return { date: `${day}.${month}.${year}`, time: `${hours}:${minutes}:${seconds} ${ampm}` };
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

const LedgerPage = ({ setActivePage, earningOnly = false }) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const isKycApproved = String(user?.kyc_status || user?.admin_kyc_status || "").toLowerCase() === "approved" || String(user?.admin_kyc_status || "").toLowerCase() === "approved";

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
  }, [page, pageSize, stream, filters, t, isKycApproved]);

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

  const renderTable = () => (
    <>
      {/* Table (desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.date", "Date")}</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.category", "Category")}</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.type", "Type")}</th>
              <th className="text-right p-4 text-sm font-semibold text-gray-400">{t("ledger.col.amount", "Amount")}</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.currency", "Currency")}</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.status", "Status")}</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-400">{t("ledger.col.reference", "Reference")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-gray-400">
                  <Loader2 className="inline animate-spin mr-2" size={18} />
                  {t("ledger.loading", "Loading…")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-gray-400">{t("ledger.noRecords", "No records found.")}</td>
              </tr>
            ) : (
              items.map((item) => {
                const isDebit = item.direction === "debit";
                const isTaskEarning = item.category === "captcha" || item.category === "ad_view";
                const isConversion = item.category === "ofa_conversion" && item.usdt_received != null;
                const dispStatus = displayStatus(item);
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
                    <td className="p-4 text-sm font-semibold text-right">
                      {isConversion ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-red-300">-{formatAmount(item.amount)} OFA</span>
                          <span className="text-gray-500">→</span>
                          <span className="text-emerald-300">+${formatAmount(item.usdt_received)} USDT</span>
                        </span>
                      ) : (
                        <span className={isDebit ? "text-red-300" : "text-emerald-300"}>
                          {isDebit ? "-" : "+"}{isTaskEarning ? formatAmount3(item.amount) : formatAmount(item.amount)} {item.currency}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-300">{item.currency}</td>
                    <td className="p-4 text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${statusColor(dispStatus)}`}>
                        {t(`ledger.status.${dispStatus}`, dispStatus)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400 whitespace-nowrap">{item.reference || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: fintech-style compact rows */}
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
              const isConversion = item.category === "ofa_conversion" && item.usdt_received != null;
              const dispStatus = displayStatus(item);
              return (
                <div key={item.id} className="rounded-xl border border-white/10 bg-[#0B132B] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                        <Icon size={15} className="text-gray-400" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-white leading-tight truncate">
                          {t(item.category_label_key || `ledger.category.${item.category}`, item.category)}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                          {isDebit ? <ArrowUpRight size={10} className="text-red-300" /> : <ArrowDownLeft size={10} className="text-emerald-300" />}
                          {t(`ledger.type.${item.type}`, item.type)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      {isConversion ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold whitespace-nowrap text-red-300">
                            -{formatAmount(item.amount)} OFA
                          </span>
                          <span className="text-sm font-bold whitespace-nowrap text-emerald-300">
                            +${formatAmount(item.usdt_received)} USDT
                          </span>
                        </div>
                      ) : (
                        <span className={`text-sm font-bold whitespace-nowrap ${isDebit ? "text-red-300" : "text-emerald-300"}`}>
                          {isDebit ? "-" : "+"}{isTaskEarning ? formatAmount3(item.amount) : formatAmount(item.amount)} {item.currency}
                        </span>
                      )}
                      <span className={`inline-block px-1.5 py-0.5 mt-0.5 rounded border text-[9px] font-semibold ${statusColor(dispStatus)}`}>
                        {t(`ledger.status.${dispStatus}`, dispStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <div className="text-[11px] text-gray-500">
                      {dateStr}
                      {timeStr && <span className="ml-2">{timeStr}</span>}
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
    <div className="animate-[fadeIn_0.4s_ease] rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-x-hidden pb-20 md:pb-0">
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
                    { id: "", label: t("ledger.filter.all", "All") },
                    { id: "deposit", label: t("ledger.category.deposit", "Deposit") },
                    { id: "withdrawal", label: t("ledger.category.withdrawal", "Withdrawal") },
                    { id: "matching_bonus", label: t("ledger.category.matching_bonus", "Bonus") },
                    { id: "ecommerce", label: t("ledger.category.ecommerce", "Spending") },
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


      </div>
  );
};

export default LedgerPage;
