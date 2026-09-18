import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, Download, Loader2, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";
import useUserStore from "../../store/userStore";
import api from "../../api/axiosInstance";

const authHeaders = () => {
  const token = useUserStore.getState().token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export default function AdminReports() {
  const [invoices, setInvoices] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const date = new Date();
      const [revRes, invRes] = await Promise.all([
        api.get(`v1/invoice/admin/revenue-report?year=${date.getFullYear()}&month=${date.getMonth() + 1}`, authHeaders()),
        api.get("v1/invoice/admin?limit=50", authHeaders()),
      ]);
      setRevenue(revRes?.data || null);
      setInvoices(invRes?.data?.invoices || []);
    } catch (err) {
      console.error("Failed to fetch admin reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (inv) => {
    if (!inv.id || !inv.pdf_url) return;
    try {
      const token = useUserStore.getState().token;
      const baseUrl = api.defaults.baseURL || "";
      const apiBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const res = await fetch(`${apiBase}/v1/invoice/download/${inv.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoice_number || "invoice"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download invoice:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
        <p className="text-gray-400 text-sm mt-2">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className="text-2xl md:text-3xl font-bold">
        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Financial Reports
        </span>
      </h1>
      <p className="text-gray-400 text-sm">System-wide financial summary and invoice management</p>

      {revenue && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-green-600/20 to-emerald-600/10 border border-green-500/30">
            <div className="flex items-center gap-2 text-green-400 text-xs font-semibold mb-1">
              <TrendingUp className="w-3 h-3" /> Total Deposits
            </div>
            <div className="text-xl font-bold text-white">${Number(revenue.total_deposits).toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-600/10 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold mb-1">
              <TrendingDown className="w-3 h-3" /> Total Withdrawals
            </div>
            <div className="text-xl font-bold text-white">${Number(revenue.total_withdrawals).toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/10 border border-blue-500/30">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-1">
              <Calendar className="w-3 h-3" /> Net Flow
            </div>
            <div className="text-xl font-bold text-white">${Number(revenue.net_flow).toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-600/20 to-violet-600/10 border border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1">
              <Users className="w-3 h-3" /> New Users
            </div>
            <div className="text-xl font-bold text-white">{revenue.new_users}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-white/10">
          <h2 className="font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            All Invoices
            <span className="text-xs text-gray-500 font-normal ml-2">({invoices.length})</span>
          </h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No invoices generated yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs">
                  <th className="px-5 py-3 text-left">Invoice</th>
                  <th className="px-5 py-3 text-left">User</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id || i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-white font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-gray-300 text-xs">
                      {inv.user?.name || inv.user?.email || inv.user?.user_no || `User #${inv.user_id}`}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        inv.invoice_type === "deposit" ? "bg-green-500/10 text-green-400" :
                        inv.invoice_type === "withdrawal" ? "bg-red-500/10 text-red-400" :
                        "bg-blue-500/10 text-blue-400"
                      }`}>{inv.invoice_type}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-white font-mono text-xs">
                      ${inv.amount ? Number(inv.amount).toFixed(2) : "0.00"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        inv.status === "generated" ? "bg-green-500/10 text-green-400" :
                        "bg-yellow-500/10 text-yellow-400"
                      }`}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => downloadInvoice(inv)}
                        disabled={!inv.pdf_url}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
