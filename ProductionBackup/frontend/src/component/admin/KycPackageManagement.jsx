import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, ToggleLeft, ToggleRight, DollarSign, Users, CheckCircle, Clock, XCircle, AlertCircle, Package, Plus, Edit3, Trash2 } from "lucide-react";
import useUserStore from "../../store/userStore";
import { getFeeConfig, updateFeeConfig, getKycPackages, createKycPackage, updateKycPackage, deleteKycPackage } from "../../api/admin.api.js";
import { getUserStatistics } from "../../api/admin.api.js";

export default function KycPackageManagement({ setActivePage }) {
  const { t } = useTranslation();
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
      setMsg(`KYC package ${newValue === "true" ? t("admin.kycPackages.enabled").toLowerCase() : t("admin.kycPackages.disabled").toLowerCase()}`);
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
      setMsg(t("admin.kycPackages.nameRequired"));
      return;
    }
    try {
      if (editPkg) {
        await updateKycPackage(token, editPkg.id, form);
        setMsg(t("admin.kycPackages.packageUpdated"));
      } else {
        await createKycPackage(token, form);
        setMsg(t("admin.kycPackages.packageCreated"));
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
      setMsg(`Package ${t("admin.kycPackages.deactivated")}`);
      fetchData();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleActive = async (pkg) => {
    try {
      await updateKycPackage(token, pkg.id, { is_active: !pkg.is_active });
      setMsg(`Package ${pkg.is_active ? t("admin.kycPackages.deactivated") : t("admin.kycPackages.activated")}`);
      fetchData();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const enabled = feeConfig.kyc_package_enabled === "true";
  const kyc = stats.kyc || {};
  const activePkg = packages.find((p) => p.is_active);

  const policyItems = t("admin.kycPackages.policyItems", { returnObjects: true });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {t("admin.kycPackages.title")}
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {t("admin.kycPackages.subtitle")}
        </p>
      </motion.div>

      {msg && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">{msg}</p>}

      {loading ? (
        <p className="text-gray-400">{t("admin.kycPackages.loading")}</p>
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
              <p className="text-sm text-gray-400 mt-2">{t("admin.kycPackages.verified")}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] backdrop-blur-xl border border-amber-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{kyc.pending || 0}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">{t("admin.kycPackages.pending")}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/[0.02] backdrop-blur-xl border border-red-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <XCircle className="w-8 h-8 text-red-400" />
                <span className="text-2xl font-bold text-red-400">{kyc.rejected || 0}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">{t("admin.kycPackages.rejected")}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/[0.02] backdrop-blur-xl border border-blue-500/20 p-5"
            >
              <div className="flex items-center justify-between">
                <Package className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold text-blue-400">{packages.length}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">{t("admin.kycPackages.totalPackages")}</p>
            </motion.div>
          </div>

          {/* Fee + Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" /> {t("admin.kycPackages.defaultFee")}
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
                >{t("admin.kycPackages.save")}</button>
              </div>
              <p className="text-xs text-gray-500"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(t("admin.kycPackages.currentFee", { fee: feeConfig.kyc_fee || "0" }))
                }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">{t("admin.kycPackages.packageFeature")}</h3>
                <button onClick={togglePackage}
                  className={`p-2 rounded-lg transition-colors ${enabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                >
                  {enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <div className={`text-sm ${enabled ? "text-green-400" : "text-red-400"}`}>
                {enabled ? t("admin.kycPackages.enabled") : t("admin.kycPackages.disabled")}
              </div>
              {activePkg && (
                <p className="text-xs text-gray-500"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(t("admin.kycPackages.activePackage", { name: activePkg.name, price: activePkg.price }))
                  }}
                />
              )}
            </motion.div>
          </div>

          {/* Package CRUD */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" /> {t("admin.kycPackages.kycPackages")}
              </h3>
              <button onClick={openCreate}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t("admin.kycPackages.newPackage")}
              </button>
            </div>

            {packages.length === 0 ? (
              <p className="text-sm text-gray-500">{t("admin.kycPackages.noPackages")}</p>
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
                        title={pkg.is_active ? t("admin.kycPackages.deactivateTitle") : t("admin.kycPackages.activateTitle")}
                      >
                        {pkg.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(pkg)}
                        className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title={t("admin.kycPackages.editTitle")}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeactivate(pkg.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        title={t("admin.kycPackages.deactivateTitle")}
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
                <h3 className="text-lg font-bold text-white">{editPkg ? t("admin.kycPackages.editPackage") : t("admin.kycPackages.newPackageTitle")}</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("admin.kycPackages.name")}</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white focus:outline-none focus:border-cyan-500/50"
                    placeholder={t("admin.kycPackages.namePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("admin.kycPackages.price")}</label>
                  <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white focus:outline-none focus:border-cyan-500/50"
                    type="number" min="0" step="0.01"
                    placeholder={t("admin.kycPackages.pricePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("admin.kycPackages.description")}</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0C1035] border border-white/20 text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                    placeholder={t("admin.kycPackages.optionalDescription")}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                  >{t("admin.kycPackages.cancel")}</button>
                  <button onClick={handleSave}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                  >{editPkg ? t("admin.kycPackages.update") : t("admin.kycPackages.create")}</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 space-y-3"
          >
            <h3 className="text-white font-semibold">{t("admin.kycPackages.quickActions")}</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setActivePage?.("kyc-requests")}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> {t("admin.kycPackages.viewKycRequests")}
              </button>
              <button onClick={() => setActivePage?.("users")}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> {t("admin.kycPackages.userManagement")}
              </button>
            </div>
          </motion.div>

          {/* KYC Policy */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl bg-gradient-to-br from-blue-500/5 to-blue-500/[0.02] backdrop-blur-xl border border-blue-500/20 p-5 space-y-2"
          >
            <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {t("admin.kycPackages.kycPolicy")}
            </h3>
            <ul className="text-xs text-gray-400 space-y-1">
              {Array.isArray(policyItems) && policyItems.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </div>
  );
}
