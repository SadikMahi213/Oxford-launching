import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  FileText, FileDown, Eye, Loader2, RefreshCw,
  ArrowDownRight, ArrowUpRight, CheckCircle2, Clock,
} from "lucide-react";
import useUserStore from "../../store/userStore";
import api from "../../api/axiosInstance";
import { useTranslation } from "react-i18next";

const authHeaders = () => {
  const token = useUserStore.getState().token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const TYPE_FILTERS = [
  { value: "", labelKey: "allInvoices", icon: FileText },
  { value: "deposit", labelKey: "deposit", icon: ArrowDownRight },
  { value: "withdrawal", labelKey: "withdrawal", icon: ArrowUpRight },
];

export default function InvoicePage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, [filterType]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = filterType ? `?invoice_type=${filterType}` : "";
      const res = await api.get(`v1/invoice/my${params}`, authHeaders());
      setInvoices(res?.data?.invoices || []);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoice) => {
    if (!invoice.id || !invoice.pdf_url) return;
    setDownloading(invoice.id);
    try {
      const token = useUserStore.getState().token;
      const baseUrl = api.defaults.baseURL || "";
      const apiBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${apiBase}/v1/invoice/download/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download invoice:", err);
    } finally {
      setDownloading(null);
    }
  };

  const viewInvoice = async (invoice) => {
    if (!invoice.id || !invoice.pdf_url) return;
    setDownloading(invoice.id);
    try {
      const token = useUserStore.getState().token;
      const baseUrl = api.defaults.baseURL || "";
      const apiBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${apiBase}/v1/invoice/download/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      console.error("Failed to view invoice:", err);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const isDeposit = (inv) => inv.invoice_type === "deposit";

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t("invoice.title")}
            </span>
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
              {invoices.length}
            </span>
          </h1>
          <p className="text-gray-400 text-sm">{t("invoice.subtitle")}</p>
        </div>
        <button
          onClick={fetchInvoices}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          {t("invoice.refresh")}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterType(f.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              filterType === f.value
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            <f.icon className="w-3 h-3" />
            {t("invoice." + f.labelKey)}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
      >
        <div className="p-4 md:p-5 border-b border-white/10">
          <h2 className="font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            {t("invoice.yourInvoices")}
            <span className="text-xs text-gray-500 font-normal ml-2">({invoices.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            <p className="text-gray-400 text-sm">{t("invoice.loadingInvoices")}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-gray-300 font-semibold">{t("invoice.noInvoices")}</p>
            <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">
              {filterType ? t("invoice.noInvoicesFound") : t("invoice.noInvoicesDesc")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {invoices.map((inv, idx) => {
              const dep = isDeposit(inv);
              const isDownloading = downloading === inv.id;
              return (
                <motion.div
                  key={inv.id || idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-4 md:p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    dep ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {dep ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm truncate">
                      {inv.invoice_number}
                    </div>
                    {inv.transaction_id && (
                      <div className="text-[10px] font-mono text-gray-500 truncate mt-0.5">
                        {dep ? "Deposit TX:" : "Withdrawal Ref:"} {inv.transaction_id}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(inv.created_at)}
                      </span>
                      {inv.amount !== null && inv.amount !== undefined && (
                        <span className={`font-semibold ${dep ? "text-green-400" : "text-red-400"}`}>
                          {dep ? "+" : "-"}${Number(inv.amount).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`hidden sm:inline px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                    dep ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {dep ? t("invoice.deposit") : t("invoice.withdrawal")}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    inv.status === "generated" || inv.status === "completed"
                      ? "bg-green-500/10 text-green-400"
                      : inv.status === "failed"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {inv.status === "generated" || inv.status === "completed"
                      ? t("invoice.ready")
                      : inv.status}
                  </span>
                  <button
                    onClick={() => viewInvoice(inv)}
                    disabled={!inv.pdf_url || isDownloading}
                    className={`p-2 rounded-lg transition-all ${
                      inv.pdf_url
                        ? "bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 border border-white/10 hover:border-blue-500/30"
                        : "bg-white/[0.02] text-gray-600 cursor-not-allowed"
                    }`}
                    title={t("invoice.viewPdf")}
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => downloadInvoice(inv)}
                    disabled={!inv.pdf_url || isDownloading}
                    className={`p-2 rounded-lg transition-all ${
                      inv.pdf_url
                        ? "bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/30"
                        : "bg-white/[0.02] text-gray-600 cursor-not-allowed"
                    }`}
                    title={t("invoice.downloadPdf")}
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {invoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 md:p-5"
        >
          <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            {t("invoice.needHelp")}
          </h3>
          <p className="text-gray-400 text-xs">
            {t("invoice.helpDesc")}
          </p>
        </motion.div>
      )}
    </div>
  );
}
