import { motion } from "motion/react"
import { useEffect, useState } from "react"
import {
  Store, Check, X, Settings, Package, Coins, BarChart3, Eye,
  Tag, ShoppingBag, Star, Truck, Zap, DollarSign, Users, TrendingUp,
  CreditCard, Plus, Trash2,
} from "lucide-react"
import {
  adminListSellers, adminUpdateSellerStatus,
  adminGetEcommerceConfig, adminUpdateEcommerceConfig,
  adminGetSellerProducts, adminGetSellerStats,
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
