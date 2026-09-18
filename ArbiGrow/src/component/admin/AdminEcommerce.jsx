<<<<<<< HEAD
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import {
  Store, Check, X, Settings, Package, Coins, BarChart3, Eye,
  Tag, ShoppingBag, Star, Truck, Zap, DollarSign, Users, TrendingUp,
  CreditCard, Plus, Trash2,
} from "lucide-react"
=======
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Store, Check, X, Settings, Package, Coins, BarChart3, Eye, XCircle } from "lucide-react";
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
import {
  adminListSellers, adminUpdateSellerStatus,
  adminGetEcommerceConfig, adminUpdateEcommerceConfig,
  adminGetSellerProducts, adminGetSellerStats,
<<<<<<< HEAD
} from "../../api/ecommerce.api.js"
import {
  adminGetMarketplaceDashboard, adminMarketplaceListSellers,
  adminMarketplaceUpdateSellerStatus, adminMarketplaceListOrders,
  adminListVendorWithdraws, adminProcessVendorWithdraw,
  adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminGetBrands, adminCreateBrand, adminUpdateBrand, adminDeleteBrand,
  adminGetCoupons, adminCreateCoupon, adminDeleteCoupon,
  adminListReviews, adminApproveReview,
  adminGetFlashDeals, adminCreateFlashDeal, adminDeleteFlashDeal,
  adminGetShippingZones, adminCreateShippingZone,
  adminGetShippingRates, adminCreateShippingRate,
} from "../../api/marketplace.api.js"
import AdminOrderManagement from "./AdminOrderManagement.jsx"

export default function AdminEcommerce() {
  const [tab, setTab] = useState("dashboard")
  const [msg, setMsg] = useState("")

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000) }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "sellers", label: "Sellers", icon: Store },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "brands", label: "Brands", icon: ShoppingBag },
    { id: "coupons", label: "Coupons", icon: DollarSign },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "withdraws", label: "Vendor Withdraws", icon: CreditCard },
    { id: "shipping", label: "Shipping", icon: Truck },
    { id: "deals", label: "Flash Deals", icon: Zap },
    { id: "orders", label: "Orders", icon: Package },
    { id: "config", label: "Config", icon: Settings },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Store className="w-5 h-5 text-cyan-400" />
        <h1 className="text-lg font-bold text-white">Marketplace</h1>
      </div>
      {msg && <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300">{msg}</div>}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
              tab === t.id ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/[0.04] text-gray-400 border border-transparent hover:border-white/[0.1]"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "sellers" && <SellersTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "brands" && <BrandsTab />}
      {tab === "coupons" && <CouponsTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "withdraws" && <WithdrawsTab />}
      {tab === "shipping" && <ShippingTab />}
      {tab === "deals" && <DealsTab />}
      {tab === "orders" && <AdminOrderManagement />}
      {tab === "config" && <ConfigTab />}
    </div>
  )

  // ── Dashboard Tab ─────────────────────────────────────────
  function DashboardTab() {
    const [data, setData] = useState(null)
    useEffect(() => {
      adminGetMarketplaceDashboard().then((r) => setData(r.data)).catch(() => {})
    }, [])

    if (!data) return <div className="text-xs text-gray-500">Loading...</div>

    const cards = [
      { label: "Total Vendors", value: data.total_vendors, icon: Store, color: "text-blue-400" },
      { label: "Pending Vendors", value: data.pending_vendors, icon: Users, color: "text-amber-400" },
      { label: "Total Products", value: data.total_products, icon: Package, color: "text-emerald-400" },
      { label: "Total Orders", value: data.total_orders, icon: ShoppingBag, color: "text-violet-400" },
      { label: "Revenue", value: `$${Number(data.total_revenue).toFixed(2)}`, icon: TrendingUp, color: "text-cyan-400" },
      { label: "Commission", value: `$${Number(data.total_commission).toFixed(2)}`, icon: Coins, color: "text-purple-400" },
    ]

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-[10px] text-gray-400">{c.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>
    )
  }

  // ── Sellers Tab ───────────────────────────────────────────
  function SellersTab() {
    const [sellers, setSellers] = useState([])
    const [filter, setFilter] = useState("")
    const [detail, setDetail] = useState(null)
    useEffect(() => { load() }, [filter])

    const load = async () => {
      try {
        const r = filter ? await adminMarketplaceListSellers(filter) : await adminMarketplaceListSellers()
        setSellers(r.data.sellers || [])
      } catch (e) {}
    }

    const updateStatus = async (id, status, reason) => {
      try { await adminMarketplaceUpdateSellerStatus(id, status, reason); showMsg("Status updated"); load() } catch (e) { showMsg("Error updating") }
    }

    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {["", "pending_review", "approved", "rejected"].map((s) => (
            <button key={s || "all"} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs ${filter === s ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/[0.04] text-gray-400"}`}>{s || "All"}</button>
          ))}
        </div>
        <div className="space-y-2">
          {sellers.map((s) => (
            <div key={s.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{s.store_name}</p>
                <p className="text-[10px] text-gray-500">ID: {s.user_id} | Status: <span className={s.status === "approved" ? "text-green-400" : s.status === "rejected" ? "text-red-400" : "text-amber-400"}>{s.status}</span></p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setDetail(s)} className="p-1.5 rounded-lg bg-white/[0.04] text-gray-400"><Eye className="w-3.5 h-3.5" /></button>
                {s.status === "pending_review" && (
                  <>
                    <button onClick={() => updateStatus(s.id, "approved")} className="p-1.5 rounded-lg bg-green-500/20 text-green-400"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateStatus(s.id, "rejected")} className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
            <div className="bg-[#0f1128] rounded-2xl border border-white/[0.06] p-5 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-white mb-3">{detail.store_name}</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <p><span className="text-gray-500">Phone:</span> {detail.phone || "-"}</p>
                <p><span className="text-gray-500">WhatsApp:</span> {detail.whatsapp_number || "-"}</p>
                <p><span className="text-gray-500">Country:</span> {detail.country || "-"}</p>
                <p><span className="text-gray-500">City:</span> {detail.district_city || "-"}</p>
                <p><span className="text-gray-500">Address:</span> {detail.full_address || "-"}</p>
                <p><span className="text-gray-500">Completion:</span> {detail.profile_completion}%</p>
                {detail.rejection_reason && <p className="text-red-400">Reason: {detail.rejection_reason}</p>}
              </div>
              <button onClick={() => { setDetail(null); updateStatus(detail.id, "approved") }} className="w-full mt-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold">Approve</button>
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  // ── Generic CRUD helper ──────────────────────────────────
  function CrudTable({ title, columns, data, onDelete, onAdd, addFields, renderActions }) {
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({})

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={() => { setShowForm(!showForm); setForm({}) }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 text-xs"><Plus className="w-3 h-3" /> Add</button>
        </div>
        {showForm && (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
            {addFields.map((f) => (
              <input key={f.key} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.label} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
            ))}
            <button onClick={() => { onAdd(form); setShowForm(false); setForm({}) }} className="w-full py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs">Create</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {columns.map((c) => <th key={c} className="text-left py-2 pr-3 font-medium">{c}</th>)}
              <th className="text-right py-2">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id || i} className="border-b border-white/[0.03] text-gray-300">
                  {columns.map((c) => <td key={c} className="py-2 pr-3">{row[c.toLowerCase()] || row[c] || "-"}</td>)}
                  <td className="py-2 text-right">
                    {renderActions ? renderActions(row) : (
                      <button onClick={() => onDelete(row.id)} className="p-1 rounded bg-red-500/10 text-red-400"><Trash2 className="w-3 h-3" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Categories Tab ────────────────────────────────────────
  function CategoriesTab() {
    const [cats, setCats] = useState([])
    useEffect(() => { adminGetCategories().then((r) => setCats(r.data.categories || [])).catch(() => {}) }, [])

    const addCat = async (f) => {
      try { await adminCreateCategory(f); adminGetCategories().then((r) => setCats(r.data.categories || [])); showMsg("Category created") } catch (e) { showMsg("Error") }
    }
    const delCat = async (id) => {
      try { await adminDeleteCategory(id); setCats(cats.filter((c) => c.id !== id)); showMsg("Deleted") } catch (e) { showMsg("Error") }
    }

    return <CrudTable title="Categories" columns={["ID", "Name", "Slug", "Active"]} data={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, active: c.is_active ? "Yes" : "No" }))} onAdd={addCat} onDelete={delCat} addFields={[{ key: "name", label: "Name" }, { key: "slug", label: "Slug (optional)" }]} />
  }

  // ── Brands Tab ────────────────────────────────────────────
  function BrandsTab() {
    const [brands, setBrands] = useState([])
    useEffect(() => { adminGetBrands().then((r) => setBrands(r.data.brands || [])).catch(() => {}) }, [])

    const addBrand = async (f) => {
      try { await adminCreateBrand(f); adminGetBrands().then((r) => setBrands(r.data.brands || [])); showMsg("Brand created") } catch (e) { showMsg("Error") }
    }
    const delBrand = async (id) => {
      try { await adminDeleteBrand(id); setBrands(brands.filter((b) => b.id !== id)); showMsg("Deleted") } catch (e) { showMsg("Error") }
    }

    return <CrudTable title="Brands" columns={["ID", "Name", "Slug", "Active"]} data={brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug, active: b.is_active ? "Yes" : "No" }))} onAdd={addBrand} onDelete={delBrand} addFields={[{ key: "name", label: "Name" }, { key: "slug", label: "Slug" }]} />
  }

  // ── Coupons Tab ───────────────────────────────────────────
  function CouponsTab() {
    const [coupons, setCoupons] = useState([])
    useEffect(() => { adminGetCoupons().then((r) => setCoupons(r.data.coupons || [])).catch(() => {}) }, [])

    const addCoupon = async (f) => {
      try { await adminCreateCoupon(f); adminGetCoupons().then((r) => setCoupons(r.data.coupons || [])); showMsg("Coupon created") } catch (e) { showMsg("Error") }
    }
    const delCoupon = async (id) => {
      try { await adminDeleteCoupon(id); setCoupons(coupons.filter((c) => c.id !== id)); showMsg("Deleted") } catch (e) { showMsg("Error") }
    }

    return <CrudTable title="Coupons" columns={["Code", "Type", "Value", "Used", "Active"]} data={coupons.map((c) => ({ code: c.code, type: c.discount_type, value: c.discount_value, used: `${c.used_count}/${c.usage_limit || "\u221e"}`, active: c.is_active ? "Yes" : "No" }))} onAdd={addCoupon} onDelete={delCoupon} addFields={[{ key: "code", label: "Code" }, { key: "discount_value", label: "Value" }, { key: "discount_type", label: "Type (percentage/fixed)" }]} />
  }

  // ── Reviews Tab ───────────────────────────────────────────
  function ReviewsTab() {
    const [reviews, setReviews] = useState([])
    useEffect(() => { adminListReviews().then((r) => setReviews(r.data.reviews || [])).catch(() => {}) }, [])

    const toggleApprove = async (id, approved) => {
      try { await adminApproveReview(id, approved); adminListReviews().then((r) => setReviews(r.data.reviews || [])) } catch (e) {}
    }

    return (
      <div className="space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-gray-600"}`} />)}</div>
              <button onClick={() => toggleApprove(r.id, !r.is_approved)} className={`px-2 py-0.5 rounded-full text-[10px] ${r.is_approved ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{r.is_approved ? "Approved" : "Pending"}</button>
            </div>
            {r.title && <p className="text-xs text-white mt-1">{r.title}</p>}
            {r.comment && <p className="text-[11px] text-gray-400 mt-0.5">{r.comment}</p>}
          </div>
        ))}
      </div>
    )
  }

  // ── Withdraws Tab ─────────────────────────────────────────
  function WithdrawsTab() {
    const [withdraws, setWithdraws] = useState([])
    useEffect(() => { adminListVendorWithdraws().then((r) => setWithdraws(r.data.withdraws || [])).catch(() => {}) }, [])

    const process = async (id, status) => {
      try { await adminProcessVendorWithdraw(id, { status }); adminListVendorWithdraws().then((r) => setWithdraws(r.data.withdraws || [])); showMsg("Updated") } catch (e) { showMsg("Error") }
    }

    return (
      <div className="space-y-2">
        {withdraws.map((w) => (
          <div key={w.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">${Number(w.amount).toFixed(2)}</p>
              <p className="text-[10px] text-gray-500">Seller #{w.seller_id} | {w.status}</p>
            </div>
            {w.status === "pending" && (
              <div className="flex gap-1.5">
                <button onClick={() => process(w.id, "approved")} className="p-1.5 rounded-lg bg-green-500/20 text-green-400"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => process(w.id, "rejected")} className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ── Shipping Tab ──────────────────────────────────────────
  function ShippingTab() {
    const [zones, setZones] = useState([])
    useEffect(() => { adminGetShippingZones().then((r) => setZones(r.data.zones || [])).catch(() => {}) }, [])

    const addZone = async (f) => {
      try { await adminCreateShippingZone(f); adminGetShippingZones().then((r) => setZones(r.data.zones || [])); showMsg("Zone created") } catch (e) { showMsg("Error") }
    }

    return <CrudTable title="Shipping Zones" columns={["ID", "Name", "Active"]} data={zones.map((z) => ({ id: z.id, name: z.name, active: z.is_active ? "Yes" : "No" }))} onAdd={addZone} onDelete={() => {}} addFields={[{ key: "name", label: "Zone Name" }, { key: "countries", label: "Countries (comma-separated)" }]} />
  }

  // ── Flash Deals Tab ───────────────────────────────────────
  function DealsTab() {
    const [deals, setDeals] = useState([])
    useEffect(() => { adminGetFlashDeals().then((r) => setDeals(r.data.deals || [])).catch(() => {}) }, [])

    const addDeal = async (f) => {
      try { await adminCreateFlashDeal(f); adminGetFlashDeals().then((r) => setDeals(r.data.deals || [])); showMsg("Deal created") } catch (e) { showMsg("Error") }
    }
    const delDeal = async (id) => {
      try { await adminDeleteFlashDeal(id); setDeals(deals.filter((d) => d.id !== id)) } catch (e) {}
    }

    return <CrudTable title="Flash Deals" columns={["Title", "Type", "Value", "Active"]} data={deals.map((d) => ({ title: d.title, type: d.discount_type, value: d.discount_value, active: d.is_active ? "Yes" : "No" }))} onAdd={addDeal} onDelete={delDeal} addFields={[{ key: "title", label: "Title" }, { key: "discount_value", label: "Discount Value" }, { key: "start_date", label: "Start Date (ISO)" }, { key: "end_date", label: "End Date (ISO)" }]} />
  }

  // ── Config Tab ────────────────────────────────────────────
  function ConfigTab() {
    const [bonus, setBonus] = useState("50")
    const [fee, setFee] = useState("5")

    useEffect(() => {
      adminGetEcommerceConfig().then((r) => {
        setBonus(String(r.data.signup_bonus_arbx || 50))
        setFee(String(r.data.seller_order_fee_percent || 5))
      }).catch(() => {})
    }, [])

    const save = async () => {
      try { await adminUpdateEcommerceConfig(Number(bonus), Number(fee)); showMsg("Config saved") } catch (e) { showMsg("Error") }
    }

    return (
      <div className="space-y-3 max-w-sm">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Signup Bonus (ARBX)</label>
          <input value={bonus} onChange={(e) => setBonus(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Seller Order Fee (%)</label>
          <input value={fee} onChange={(e) => setFee(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white" />
        </div>
        <button onClick={save} className="px-6 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium">Save</button>
      </div>
    )
  }
}
=======
} from "../../api/ecommerce.api.js";

const AdminEcommerce = () => {
  const [tab, setTab] = useState("sellers");
  const [sellers, setSellers] = useState([]);
  const [config, setConfig] = useState({ signup_bonus_arbx: 50, seller_order_fee_percent: 5 });
  const [bonusInput, setBonusInput] = useState("50");
  const [feeInput, setFeeInput] = useState("5");
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
      setFeeInput(String(res.data.seller_order_fee_percent || 5));
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
      await adminUpdateEcommerceConfig(parseFloat(bonusInput) || 50, parseFloat(feeInput) || 5);
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
        <p className="text-sm text-gray-400">Manage sellers, products, and OFA token config</p>
      </motion.div>

      {msg && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">{msg}</p>}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("sellers")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${tab === "sellers" ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
          <Store className="w-4 h-4" /> Sellers ({sellers.length})
        </button>
        <button onClick={() => setTab("config")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${tab === "config" ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
          <Settings className="w-4 h-4" /> OFA Config
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
                    <th className="px-5 py-3 font-medium">OFA Allocated</th>
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
          <h3 className="text-white font-semibold flex items-center gap-2"><Coins className="w-5 h-5" /> OFA Configuration</h3>

          <div>
            <label className="text-sm text-gray-400">Signup Bonus OFA</label>
            <input value={bonusInput} onChange={(e) => setBonusInput(e.target.value)} type="number" step="1"
              className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
            />
            <p className="text-xs text-gray-500 mt-1">OFA tokens credited to new sellers when admin approves their account</p>
          </div>

          <div>
            <label className="text-sm text-gray-400">Seller Order Fee (%)</label>
            <input value={feeInput} onChange={(e) => setFeeInput(e.target.value)} type="number" step="0.1" min="0" max="100"
              className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
            />
            <p className="text-xs text-gray-500 mt-1">Percentage deducted from each order total before seller payout (e.g. 5 = 5%)</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-sm text-gray-400">Current bonus: <strong className="text-white">{config.signup_bonus_arbx}</strong> OFA | Fee: <strong className="text-white">{config.seller_order_fee_percent}%</strong></span>
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
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
