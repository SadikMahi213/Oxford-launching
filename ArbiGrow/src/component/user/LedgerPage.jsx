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

// Format a numeric amount without JS float drift: keep up to 6 decimals but
// strip trailing zeros, preserving the currency symbol + code.
const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const s = n.toFixed(6).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
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
const SUMMARY_CATEGORY_META = {
  total_deposit: { icon: Landmark, tone: "text-sky-300" },
  total_withdrawal: { icon: Banknote, tone: "text-amber-300" },
  total_earning: { icon: CircleDollarSign, tone: "text-emerald-300" },
  captcha: { icon: ShieldCheck, tone: "text-cyan-300" },
  ad_view: { icon: MonitorPlay, tone: "text-violet-300" },
  generation_bonus: { icon: Users, tone: "text-indigo-300" },
  matching_bonus: { icon: GitMerge, tone: "text-pink-300" },
  ecommerce_bonus: { icon: ShoppingBag, tone: "text-orange-300" },
  ofa_free_mining: { icon: Pickaxe, tone: "text-yellow-300" },
  ofa_settlement_balance: { icon: Coins, tone: "text-cyan-300" },
  leadership_bonus: { icon: Trophy, tone: "text-amber-300" },
  extra_offer_achievement: { icon: Gift, tone: "text-fuchsia-300" },
  position_achievement: { icon: Medal, tone: "text-lime-300" },
  international_achievement: { icon: Globe, tone: "text-teal-300" },
  company_profit: { icon: Building2, tone: "text-blue-300" },
};

const LedgerPage = () => {
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
      setItems(data.items || []);
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
    if (next === stream) return;
    setStream(next);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const categories = summary.categories || [];
  const activeCards = categories.filter((c) => c.status !== "soon");
  const soonCards = categories.filter((c) => c.status === "soon");

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
                      {isDebit ? "-" : "+"}{formatAmount(item.amount)} {item.currency}
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

      {/* Mobile horizontal scrollable table (all columns preserved) */}
      <div className="md:hidden overflow-x-auto -mx-3 pb-3">
        <table className="min-w-[640px] w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 text-sm text-gray-400 whitespace-nowrap">{t("ledger.col.date", "Date")}</th>
              <th className="p-4 text-sm text-gray-400">{t("ledger.col.category", "Category")}</th>
              <th className="p-4 text-sm text-gray-400">{t("ledger.col.type", "Type")}</th>
              <th className="p-4 text-sm text-gray-400">{t("ledger.col.amount", "Amount")}</th>
              <th className="p-4 text-sm text-gray-400">{t("ledger.col.currency", "Currency")}</th>
              <th className="p-4 text-sm text-gray-400">{t("ledger.col.status", "Status")}</th>
              <th className="p-4 text-sm text-gray-400 whitespace-nowrap">{t("ledger.col.reference", "Reference")}</th>
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
                const Icon = CATEGORY_ICON[item.category] || CircleDollarSign;
                return (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="p-4 text-sm text-gray-300 whitespace-nowrap">{formatDate(item.date)}</td>
                    <td className="p-4 text-sm text-white">
                      <span className="inline-flex items-center gap-2">
                        <Icon size={14} className="text-gray-500 shrink-0" />
                        {t(item.category_label_key || `ledger.category.${item.category}`, item.category)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        {isDebit ? <ArrowUpRight size={14} className="text-red-300" /> : <ArrowDownLeft size={14} className="text-emerald-300" />}
                        {t(`ledger.type.${item.type}`, item.type)}
                      </span>
                    </td>
                    <td className={`p-4 text-sm font-semibold text-right ${isDebit ? "text-red-300" : "text-emerald-300"}`}>
                      {isDebit ? "-" : "+"}{formatAmount(item.amount)} {item.currency}
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
    </>
  );

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

        {/* Category overview cards */}
        <div className="p-4 sm:p-6 border-b border-white/10">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">{t("ledger.overview", "Overview")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {activeCards.map((c) => {
              const meta = SUMMARY_CATEGORY_META[c.key] || { icon: CircleDollarSign, tone: "text-gray-300" };
              const Icon = meta.icon;
              return (
                <div key={c.key} className="rounded-lg bg-[#0A122C] border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={`${meta.tone} shrink-0`} />
                    <span className="text-xs text-gray-400">{t(`ledger.category.${c.key}`, c.key)}</span>
                  </div>
                  <div className="text-base font-bold text-white truncate">
                    {formatAmount(c.amount)} <span className="text-xs font-semibold text-gray-400">{c.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {soonCards.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("ledger.comingSoon", "Coming Soon")}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {soonCards.map((c) => {
                  const meta = SUMMARY_CATEGORY_META[c.key] || { icon: CircleDollarSign, tone: "text-gray-300" };
                  const Icon = meta.icon;
                  return (
                    <div key={c.key} className="rounded-lg bg-white/[0.03] border border-dashed border-white/10 p-4 opacity-70">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={16} className={`${meta.tone} shrink-0`} />
                        <span className="text-xs text-gray-400">{t(`ledger.category.${c.key}`, c.key)}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-500">{t("ledger.soon", "Soon")}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Stream tabs */}
        <div className="px-4 sm:px-6 pt-4 border-b border-white/10">
          <div className="inline-flex rounded-lg bg-[#0A122C] border border-white/10 p-1">
            <button
              onClick={() => switchStream("earning")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${stream === "earning" ? "bg-cyan-500/20 text-cyan-300" : "text-gray-400 hover:text-white"}`}
            >
              {t("ledger.tab.earning", "Earning History")}
            </button>
            <button
              onClick={() => switchStream("transaction")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${stream === "transaction" ? "bg-cyan-500/20 text-cyan-300" : "text-gray-400 hover:text-white"}`}
            >
              {t("ledger.tab.transaction", "Transaction History")}
            </button>
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
