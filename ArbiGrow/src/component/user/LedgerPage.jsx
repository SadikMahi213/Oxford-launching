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
  "company_profit",
  "development",
  "international",
  "travel",
  "ofa_conversion",
  "manual_adjustment",
  "kyc_fee",
  "refund",
  "withdrawal",
  "service_fee",
  "deposit",
  "ecommerce",
  "transfer",
];

const TYPES = ["earning", "deduction", "adjustment"];
const CURRENCIES = ["USD", "USDT", "OFA"];
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
  company_profit: GitMerge,
  development: GitMerge,
  international: GitMerge,
  travel: GitMerge,
  ofa_conversion: Repeat,
  manual_adjustment: SlidersHorizontal,
  kyc_fee: BadgeCheck,
  refund: RotateCcw,
  withdrawal: Banknote,
  service_fee: Receipt,
  deposit: Landmark,
  ecommerce: ShoppingCart,
  transfer: ArrowLeftRight,
};

const MobileLedgerRow = ({ item, t }) => {
  const isDebit = item.direction === "debit";
  const Icon = CATEGORY_ICON[item.category] || CircleDollarSign;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 p-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isDebit ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">
          {t(item.category_label_key || `ledger.category.${item.category}`, item.category)}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
          <span className="truncate">{formatDate(item.date)}</span>
          <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[10px] ${statusColor(item.status)}`}>
            {t(`ledger.status.${item.status}`, item.status)}
          </span>
        </div>
      </div>
      <div className={`shrink-0 text-right text-sm font-semibold ${isDebit ? "text-red-300" : "text-emerald-300"}`}>
        {isDebit ? "-" : "+"}
        {item.amount} {item.currency}
      </div>
    </div>
  );
};

const LedgerPage = () => {
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totals: {}, balances: {} });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        scope: "task",
        category: filters.category,
        type: filters.type,
        currency: filters.currency,
        status: filters.status,
        search: filters.search,
      });
      const data = res?.data || {};
      setItems(data.items || []);
      setSummary(data.summary || { totals: {}, balances: {} });
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Ledger load failed", err);
      setError(t("ledger.loadError", "Unable to load ledger records."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, t]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="animate-[fadeIn_0.4s_ease] rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{t("ledger.title", "OFA Earning & Transaction Ledger")}</h2>
              <p className="text-sm text-gray-400">{t("ledger.subtitle", "Every earning, bonus, deposit, withdrawal and adjustment in one place.")}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-300 bg-red-500/10 border-b border-red-500/20">{error}</div>
        )}

        {/* Summary totals */}
        <div className="p-4 sm:p-6 border-b border-white/10">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">{t("ledger.taskEarnings", "Task Earnings")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CURRENCIES.map((cur) => {
              const bucket = summary.totals?.[cur] || { credit: 0, debit: 0, net: 0 };
              return (
                <div key={cur} className="rounded-lg bg-[#0A122C] border border-white/10 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">{t(`ledger.currency.${cur}`, cur)}</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-300">+{bucket.credit?.toFixed(4) || "0.0000"}</span>
                    <span className="text-red-300">-{bucket.debit?.toFixed(4) || "0.0000"}</span>
                  </div>
                  <div className="mt-1 text-right text-base font-bold text-white">
                    {bucket.net?.toFixed(4) || "0.0000"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                        {isDebit ? "-" : "+"}{item.amount} {item.currency}
                      </td>
                      <td className="p-4 text-sm text-gray-300">{item.currency}</td>
                      <td className="p-4 text-sm">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${statusColor(item.status)}`}>
                          {t(`ledger.status.${item.status}`, item.status)}
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

        {/* Mobile card list */}
        <div className="md:hidden p-4 space-y-2">
          {loading ? (
            <div className="py-10 text-center text-gray-400">
              <Loader2 className="inline animate-spin mr-2" size={18} />
              {t("ledger.loading", "Loading…")}
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-gray-400">{t("ledger.noRecords", "No records found.")}</div>
          ) : (
            items.map((item) => <MobileLedgerRow key={item.id} item={item} t={t} />)
          )}
        </div>

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
