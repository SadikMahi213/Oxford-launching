import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ShieldCheck, ToggleLeft, ToggleRight, DollarSign, Users, CheckCircle, Clock, XCircle, AlertCircle, Package, Plus, Edit3, Trash2 } from "lucide-react";
import useUserStore from "../../store/userStore";
import { getFeeConfig, updateFeeConfig, getKycPackages, createKycPackage, updateKycPackage, deleteKycPackage } from "../../api/admin.api.js";
import { getUserStatistics } from "../../api/admin.api.js";

export default function KycPackageManagement({ setActivePage }) {
  const token = useUserStore((s) => s.token);
  const [feeConfig, setFeeConfig] = useState({});
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState({ kyc: { pending: 0, approved: 0, rejected: 0, without_kyc: 0 } });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [feeInput, setFeeInput] = useState("");

  // Package CRUD state
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", description: "" });

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [feeRes, pkgRes, statsRes] = await Promise.all([
        getFeeConfig(token).catch(() => ({ data: {} })),
        getKycPackages(token).catch(() => ({ data: [] })),
        getUserStatistics(token).catch(() => ({ kyc: {} })),
      ]);
      setFeeConfig(feeRes.data || {});
      setPackages(pkgRes.data || []);
      setStats(statsRes || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  const togglePackage = async () => {
    const current = feeConfig.kyc_package_enabled;
    const newValue = current === "true" ? "false" : "true";
    try {
      await updateFeeConfig(token, "kyc_package_enabled", newValue);
      setFeeConfig({ ...feeConfig, kyc_package_enabled: newValue });
      setMsg(`KYC package ${newValue === "true" ? "enabled" : "disabled"}`);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveFee = async () => {
    if (!feeInput.trim()) return;
    try {
      await updateFeeConfig(token, "kyc_fee", feeInput.trim());
      setFeeConfig({ ...feeConfig, kyc_fee: feeInput.trim() });
      setMsg(`KYC fee set to ${feeInput.trim()} USDT`);
      setFeeInput("");
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const openCreate = () => {
    setEditPkg(null);
    setForm({ name: "", price: "", description: "" });
    setShowForm(true);
  };

  const openEdit = (pkg) => {
    setEditPkg(pkg);
    setForm({ name: pkg.name, price: pkg.price, description: pkg.description || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      setMsg("Name and price are required");
      return;
    }
    try {
      if (editPkg) {
        await updateKycPackage(token, editPkg.id, form);
        setMsg("Package updated");
      } else {
        await createKycPackage(token, form);
        setMsg("Package created");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeactivate = async (pkgId) => {
    try {
      await deleteKycPackage(token, pkgId);
      setMsg("Package deactivated");
      fetchData();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleActive = async (pkg) => {
    try {
      await updateKycPackage(token, pkg.id, { is_active: !pkg.is_active });
      setMsg(`Package ${!pkg.is_active ? "activated" : "deactivated"}`);
      fetchData();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const enabled = feeConfig.kyc_package_enabled === "true";
  const kyc = stats.kyc || {};
  const activePkg = packages.find((p) => p.is_active);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            KYC Package Management
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure KYC packages — multiple packages, only one active at a time.
        </p>
      </motion.div>

      {msg && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">{msg}</p>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] backdrop-blur-xl border border-emerald-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-400">{kyc.approved || 0}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Verified</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] backdrop-blur-xl border border-amber-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{kyc.pending || 0}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Pending</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/[0.02] backdrop-blur-xl border border-red-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <XCircle className="w-8 h-8 text-red-400" />
                <span className="text-2xl font-bold text-red-400">{kyc.rejected || 0}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Rejected</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/[0.02] backdrop-blur-xl border border-blue-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <Package className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold text-blue-400">{packages.length}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Total Packages</p>
            </motion.div>
          </div>

          {/* Fee + Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" /> Default Fee
              </h3>
              <div className="flex items-center gap-3">
                <input
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  placeholder={feeConfig.kyc_fee || "0"}
                  className="w-28 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  type="number" min="0" step="0.01"
                />
                <span className="text-sm text-gray-400">USDT</span>
                <button onClick={saveFee}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"
                >Save</button>
              </div>
              <p className="text-xs text-gray-500">Current: <strong className="text-white">{feeConfig.kyc_fee || "0"} USDT</strong></p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Package Feature</h3>
                <button onClick={togglePackage}
                  className={`p-2 rounded-lg transition-colors ${enabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                >
                  {enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <div className={`text-sm ${enabled ? "text-green-400" : "text-red-400"}`}>
                {enabled ? "KYC is enabled — users can submit" : "KYC is disabled — submissions blocked"}
              </div>
              {activePkg && (
                <p className="text-xs text-gray-500">Active: <strong className="text-cyan-300">{activePkg.name}</strong> ({activePkg.price} USDT)</p>
              )}
            </motion.div>
          </div>

          {/* Package CRUD */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" /> KYC Packages
              </h3>
              <button onClick={openCreate}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Package
              </button>
            </div>

            {packages.length === 0 ? (
              <p className="text-sm text-gray-500">No packages created yet.</p>
            ) : (
              <div className="space-y-2">
                {packages.map((pkg) => (
                  <div key={pkg.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${pkg.is_active ? "bg-green-400" : "bg-gray-500"}`} />
                      <div>
                        <p className="text-sm font-medium text-white">{pkg.name}</p>
                        <p className="text-xs text-gray-400">{pkg.price} USDT{pkg.description ? ` — ${pkg.description.substring(0, 60)}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleActive(pkg)}
                        className={`p-1.5 rounded-lg transition-colors ${pkg.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}
                        title={pkg.is_active ? "Deactivate" : "Activate"}
                      >
                        {pkg.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(pkg)}
                        className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeactivate(pkg.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        title="Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Create/Edit Form Modal */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-[#0a0e27] border border-white/10 p-6 space-y-4"
              >
                <h3 className="text-lg font-bold text-white">{editPkg ? "Edit Package" : "New Package"}</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white focus:outline-none focus:border-cyan-500/50"
                    placeholder="e.g. Standard KYC"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Price (USDT)</label>
                  <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white focus:outline-none focus:border-cyan-500/50"
                    type="number" min="0" step="0.01"
                    placeholder="e.g. 10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                  >Cancel</button>
                  <button onClick={handleSave}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                  >{editPkg ? "Update" : "Create"}</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-3"
          >
            <h3 className="text-white font-semibold">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setActivePage?.("kyc-requests")}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> View KYC Requests
              </button>
              <button onClick={() => setActivePage?.("users")}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> User Management
              </button>
            </div>
          </motion.div>

          {/* KYC Policy */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl bg-gradient-to-br from-blue-500/5 to-blue-500/[0.02] backdrop-blur-xl border border-blue-500/20 p-5 space-y-2"
          >
            <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> KYC Policy
            </h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• KYC is only required for: user-to-user fund transfers and withdrawal requests.</li>
              <li>• Package purchases, deposits, earnings, referrals, and daily activities do NOT require KYC.</li>
              <li>• Only one package can be active at a time — the active package is shown to users.</li>
              <li>• The fee is deducted once per user at the time of KYC submission.</li>
              <li>• Users with existing KYC records are grandfathered — no additional fee.</li>
            </ul>
          </motion.div>
        </>
      )}
    </div>
  );
}
