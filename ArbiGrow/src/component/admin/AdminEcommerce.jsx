import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Store, Check, X, Settings, Package, Coins, BarChart3, Eye, XCircle } from "lucide-react";
import {
  adminListSellers, adminUpdateSellerStatus,
  adminGetEcommerceConfig, adminUpdateEcommerceConfig,
  adminGetSellerProducts, adminGetSellerStats,
} from "../../api/ecommerce.api.js";

const AdminEcommerce = () => {
  const [tab, setTab] = useState("sellers");
  const [sellers, setSellers] = useState([]);
  const [config, setConfig] = useState({ signup_bonus_arbx: 50 });
  const [bonusInput, setBonusInput] = useState("50");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [msg, setMsg] = useState("");
  const [stats, setStats] = useState({ total: 0, draft: 0, pending_review: 0, approved: 0, rejected: 0 });
  const [detailSeller, setDetailSeller] = useState(null);

  useEffect(() => {
    loadSellers();
    loadConfig();
    loadStats();
  }, []);

  const loadSellers = async () => {
    try {
      const res = await adminListSellers();
      setSellers(res.data?.sellers || []);
    } catch { /* ignore */ }
  };

  const loadConfig = async () => {
    try {
      const res = await adminGetEcommerceConfig();
      setConfig(res.data);
      setBonusInput(String(res.data.signup_bonus_arbx || 50));
    } catch { /* ignore */ }
  };

  const loadStats = async () => {
    try {
      const res = await adminGetSellerStats();
      setStats(res.data);
    } catch { /* ignore */ }
  };

  const handleStatus = async (sellerId, status) => {
    try {
      if (status === "rejected") {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        await adminUpdateSellerStatus(sellerId, status, reason);
      } else {
        await adminUpdateSellerStatus(sellerId, status);
      }
      loadSellers();
      loadStats();
      setMsg(`Seller ${status}`);
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await adminUpdateEcommerceConfig(parseFloat(bonusInput) || 50);
      loadConfig();
      setMsg("Config updated");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const viewSellerProducts = async (seller) => {
    try {
      const res = await adminGetSellerProducts(seller.id);
      setSellerProducts(res.data?.products || []);
      setSelectedSeller(seller);
    } catch { /* ignore */ }
  };

  const statusBadge = (status) => {
    const map = {
      draft: "bg-gray-500/20 text-gray-400",
      pending_review: "bg-yellow-500/20 text-yellow-400",
      approved: "bg-green-500/20 text-green-400",
      rejected: "bg-red-500/20 text-red-400",
    };
    return map[status] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Ecommerce Management
          </span>
        </h1>
        <p className="text-sm text-gray-400">Manage sellers, products, and ARBX token config</p>
      </motion.div>

      {msg && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">{msg}</p>}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("sellers")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${tab === "sellers" ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
          <Store className="w-4 h-4" /> Sellers ({sellers.length})
        </button>
        <button onClick={() => setTab("config")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${tab === "config" ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
          <Settings className="w-4 h-4" /> ARBX Config
        </button>
      </div>

      {tab === "sellers" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-blue-400" },
              { label: "Pending Review", value: stats.pending_review, color: "text-yellow-400" },
              { label: "Approved", value: stats.approved, color: "text-green-400" },
              { label: "Rejected", value: stats.rejected, color: "text-red-400" },
            ].map((card) => (
              <div key={card.label} className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4">
                <p className="text-xs text-gray-400">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-left">
                  <th className="px-5 py-3 font-medium">Store</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Completion</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No sellers registered</td></tr>
                ) : (
                  sellers.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-white font-medium">{s.store_name}</td>
                      <td className="px-5 py-3 text-gray-300">{s.user_name}</td>
                      <td className="px-5 py-3 text-gray-300">{s.user_email}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className={`h-full rounded-full ${s.profile_completion >= 100 ? "bg-green-500" : "bg-yellow-500"}`}
                              style={{ width: (s.profile_completion || 0) + "%" }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{s.profile_completion || 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(s.status)}`}>{s.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {s.status === "pending_review" && (
                            <>
                              <button onClick={() => handleStatus(s.id, "approved")} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30" title="Approve"><Check className="w-4 h-4" /></button>
                              <button onClick={() => handleStatus(s.id, "rejected")} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Reject"><X className="w-4 h-4" /></button>
                            </>
                          )}
                          {s.status === "rejected" && (
                            <button onClick={() => handleStatus(s.id, "pending_review")} className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-xs">Review Again</button>
                          )}
                          <button onClick={() => setDetailSeller(s)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" title="View Details"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => viewSellerProducts(s)} className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs font-medium flex items-center gap-1">
                            <Package className="w-3 h-3" /> Products
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {detailSeller && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-semibold">{detailSeller.store_name} - Details</h3>
                <button onClick={() => setDetailSeller(null)} className="text-gray-400 hover:text-white"><XCircle className="w-4 h-4" /></button>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-gray-400 font-medium">Basic Info</p>
                  <p><span className="text-gray-500">Name:</span> <span className="text-white">{detailSeller.user_name}</span></p>
                  <p><span className="text-gray-500">Email:</span> <span className="text-white">{detailSeller.user_email}</span></p>
                  <p><span className="text-gray-500">Phone:</span> <span className="text-white">{detailSeller.phone || "-"}</span></p>
                  <p><span className="text-gray-500">Store:</span> <span className="text-white">{detailSeller.store_name}</span></p>
                  {detailSeller.description && <p><span className="text-gray-500">Desc:</span> <span className="text-white">{detailSeller.description}</span></p>}
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 font-medium">Identity & Address</p>
                  <p><span className="text-gray-500">NID:</span> <span className="text-white">{detailSeller.nid_number || "-"}</span></p>
                  <p><span className="text-gray-500">Country:</span> <span className="text-white">{detailSeller.country || "-"}</span></p>
                  <p><span className="text-gray-500">Division:</span> <span className="text-white">{detailSeller.division_state || "-"}</span></p>
                  <p><span className="text-gray-500">District:</span> <span className="text-white">{detailSeller.district_city || "-"}</span></p>
                  {detailSeller.full_address && <p><span className="text-gray-500">Address:</span> <span className="text-white">{detailSeller.full_address}</span></p>}
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 font-medium">Status & Links</p>
                  <p><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(detailSeller.status)}`}>{detailSeller.status}</span></p>
                  <p><span className="text-gray-500">Completion:</span> <span className="text-white">{detailSeller.profile_completion || 0}%</span></p>
                  {detailSeller.rejection_reason && <p><span className="text-gray-500">Reason:</span> <span className="text-red-400">{detailSeller.rejection_reason}</span></p>}
                  {detailSeller.facebook_url && <p><span className="text-gray-500">FB:</span> <span className="text-blue-400 text-xs">{detailSeller.facebook_url}</span></p>}
                  {detailSeller.youtube_url && <p><span className="text-gray-500">YT:</span> <span className="text-red-400 text-xs">{detailSeller.youtube_url}</span></p>}
                  {detailSeller.website_url && <p><span className="text-gray-500">Web:</span> <span className="text-cyan-400 text-xs">{detailSeller.website_url}</span></p>}
                </div>
              </div>
            </motion.div>
          )}

          {selectedSeller && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-semibold">{selectedSeller.store_name} - Products</h3>
                <button onClick={() => setSelectedSeller(null)} className="text-gray-400 hover:text-white text-sm">Close</button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-left">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Price</th>
                    <th className="px-5 py-3 font-medium">ARBX Allocated</th>
                    <th className="px-5 py-3 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerProducts.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-4 text-center text-gray-400">No products</td></tr>
                  ) : (
                    sellerProducts.map((p) => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="px-5 py-3 text-white">{p.name}</td>
                        <td className="px-5 py-3 text-cyan-400">${parseFloat(p.price).toFixed(2)}</td>
                        <td className="px-5 py-3 text-gray-300">{parseFloat(p.arbx_allocated).toFixed(2)}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>{p.is_active ? "Yes" : "No"}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </motion.div>
          )}
        </>
      )}

      {tab === "config" && (
        <div className="max-w-md rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2"><Coins className="w-5 h-5" /> ARBX Configuration</h3>

          <div>
            <label className="text-sm text-gray-400">Signup Bonus ARBX</label>
            <input value={bonusInput} onChange={(e) => setBonusInput(e.target.value)} type="number" step="1"
              className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
            />
            <p className="text-xs text-gray-500 mt-1">ARBX tokens credited to new sellers when admin approves their account</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-sm text-gray-400">Current value: <strong className="text-white">{config.signup_bonus_arbx}</strong> ARBX</span>
            <button onClick={handleUpdateConfig} className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
              Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEcommerce;
