import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "motion/react"
import { Package, X, Truck, Ban, Check, Box, MapPin, DollarSign, BarChart3, Plus } from "lucide-react"
import { getSellerOrderList, updateSellerOrderStatus, addSellerTracking, getSellerOrderStats, getSellerDeliveryZones, createSellerDeliveryZone, updateSellerDeliveryZone, deleteSellerDeliveryZone } from "../../api/marketplace.api.js"

const STATUS_COLORS = {
  pending: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  processing: "bg-indigo-500/20 text-indigo-400",
  packed: "bg-violet-500/20 text-violet-400",
  ready_to_ship: "bg-purple-500/20 text-purple-400",
  picked_up: "bg-cyan-500/20 text-cyan-400",
  out_for_delivery: "bg-sky-500/20 text-sky-400",
  delivered: "bg-green-500/20 text-green-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  refunded: "bg-pink-500/20 text-pink-400",
  failed: "bg-gray-500/20 text-gray-400",
}

const SELLER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed"],
  packed: ["ready_to_ship"],
  ready_to_ship: ["picked_up"],
  picked_up: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: ["completed"],
}

export default function SellerOrdersPanel() {
  const { t } = useTranslation()
  const [tab, setTab] = useState("orders") // orders, stats, zones
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ id: "orders", label: t("seller.tabOrders"), icon: Package }, { id: "stats", label: t("seller.tabStats"), icon: BarChart3 }, { id: "zones", label: t("seller.tabZones"), icon: MapPin }].map(
          (tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${tab === tb.id ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/[0.04] text-gray-400"}`}
            ><tb.icon className="w-3.5 h-3.5" />{tb.label}</button>
          )
        )}
      </div>
      {tab === "orders" && <SellerOrderList />}
      {tab === "stats" && <SellerOrderStats />}
      {tab === "zones" && <SellerDeliveryZoneManager />}
    </div>
  )
}

function SellerOrderList() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [msg, setMsg] = useState("")
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [trackingInput, setTrackingInput] = useState("")

  useEffect(() => { loadOrders() }, [page, statusFilter])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const r = await getSellerOrderList(statusFilter, page, 10)
      setOrders(r.data.orders || [])
      setTotal(r.data.total || 0)
    } catch (e) { setOrders([]) }
    setLoading(false)
  }

  const handleStatus = async (id, status) => {
    try {
      const note = document.getElementById(`note-${id}`)?.value || ""
      await updateSellerOrderStatus(id, status, note)
      setMsg(t("seller.orderUpdated", { id }))
      loadOrders()
      setSelectedOrder(null)
    } catch (e) { setMsg(e.response?.data?.detail || t("seller.updateFailed")) }
  }

  const handleTracking = async (id) => {
    if (!trackingInput) return
    try {
      await addSellerTracking(id, trackingInput)
      setMsg(t("seller.trackingAdded", { id }))
      setTrackingInput("")
      loadOrders()
    } catch (e) { setMsg(e.response?.data?.detail || t("seller.trackingFailed")) }
  }

  return (
    <div className="space-y-3">
      {msg && <p className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">{msg}</p>}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["", "pending", "confirmed", "processing", "packed", "ready_to_ship", "delivered", "cancelled"].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap ${statusFilter === s ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/[0.04] text-gray-400"}`}
          >{s ? t(`orders.status.${s}`) : t("orders.all")}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">{t("orders.noOrders")}</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-500">#{o.id} - {o.customer_name || t("seller.guest")}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[o.status] || ""}`}>{t(`orders.status.${o.status}`, { defaultValue: o.status })}</span>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                {o.items?.map((item, i) => (
                  <span key={i}>{item.product_name} x{item.quantity}{i < o.items.length - 1 ? ", " : ""}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-500">${Number(o.total).toFixed(2)}</span>
                <span className="text-gray-500">{new Date(o.created_at).toLocaleDateString()}</span>
              </div>

              {/* Action buttons */}
              {selectedOrder === o.id ? (
                <div className="space-y-2 p-2 rounded-lg bg-white/[0.04]">
                  {/* Customer checkout details */}
                  <div className="space-y-1 pb-2 border-b border-white/[0.06] mb-2">
                    <p className="text-[10px] text-gray-500 font-medium">{t("orders.customer")}</p>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {o.customer_name && <><span className="text-gray-500">{t("seller.name")}:</span><span className="text-gray-300">{o.customer_name}</span></>}
                      {o.customer_email && <><span className="text-gray-500">{t("seller.email")}:</span><span className="text-gray-300">{o.customer_email}</span></>}
                      {o.customer_phone && <><span className="text-gray-500">{t("seller.phone")}:</span><span className="text-gray-300">{o.customer_phone}</span></>}
                      {o.customer_address && <><span className="text-gray-500">{t("seller.address")}:</span><span className="text-gray-300 col-span-1">{o.customer_address}</span></>}
                      {o.shipping_address && o.shipping_address !== o.customer_address && <><span className="text-gray-500">{t("seller.shipping")}:</span><span className="text-gray-300 col-span-1">{o.shipping_address}</span></>}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">{t("seller.updateStatus")}</p>
                  <div className="flex gap-1 flex-wrap">
                    {(SELLER_TRANSITIONS[o.status] || []).map((s) => (
                      <button key={s} onClick={() => handleStatus(o.id, s)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${
                          ["cancelled", "refunded"].includes(s) ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                          "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        }`}
                      >{t(`orders.status.${s}`, { defaultValue: s })}</button>
                    ))}
                  </div>
                  <textarea id={`note-${o.id}`} placeholder={t("seller.noteOptional")} rows={1} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-[10px] text-white placeholder-gray-500 resize-none" />

                  {/* Tracking */}
                  <div className="flex items-center gap-2">
                    <input value={trackingInput} onChange={(e) => setTrackingInput(e.target.value)} placeholder={t("seller.trackingNumber")} className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-[10px] text-white placeholder-gray-500" />
                    <button onClick={() => handleTracking(o.id)} className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[10px] font-medium border border-blue-500/30">{t("seller.save")}</button>
                  </div>

                  <button onClick={() => setSelectedOrder(null)} className="text-[10px] text-gray-500">{t("seller.close")}</button>
                </div>
              ) : (
                <button onClick={() => { setSelectedOrder(o.id); setTrackingInput(o.tracking_number || "") }} className="w-full py-1.5 rounded-lg bg-white/[0.04] text-xs text-cyan-400 border border-white/[0.06]">{t("seller.manageOrder")}</button>
              )}

              {o.tracking_number && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-400">
                  <Truck className="w-3 h-3" />
                  {o.tracking_number}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {total > 10 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-lg bg-white/[0.04] text-xs text-gray-400 disabled:opacity-30">{t("orders.prev")}</button>
          <span className="text-xs text-gray-500">{page}/{Math.ceil(total / 10)}</span>
          <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-lg bg-white/[0.04] text-xs text-gray-400 disabled:opacity-30">{t("orders.next")}</button>
        </div>
      )}
    </div>
  )
}

function SellerOrderStats() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSellerOrderStats().then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!stats) return <p className="text-xs text-gray-500 text-center py-4">{t("seller.noStats")}</p>

  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: t("seller.totalOrders"), value: stats.total_orders },
        { label: t("orders.status.pending"), value: stats.pending_orders, color: "text-amber-400" },
        { label: t("seller.active"), value: stats.active_orders, color: "text-cyan-400" },
        { label: t("seller.completed"), value: stats.completed_orders, color: "text-green-400" },
        { label: t("seller.revenue"), value: `$${Number(stats.total_revenue || 0).toFixed(2)}`, color: "text-emerald-400" },
        { label: t("seller.commission"), value: `$${Number(stats.total_commission || 0).toFixed(2)}`, color: "text-rose-400" },
      ].map((s, i) => (
        <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
          <p className="text-[10px] text-gray-500">{s.label}</p>
          <p className={`text-base font-bold ${s.color || "text-white"}`}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}

function SellerDeliveryZoneManager() {
  const { t } = useTranslation()
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ zone_name: "", delivery_charge: "0", country: "", state: "", city: "", areas: "", estimated_days: "" })

  useEffect(() => { loadZones() }, [])

  const loadZones = async () => {
    setLoading(true)
    try {
      const r = await getSellerDeliveryZones()
      setZones(r.data?.zones || [])
    } catch (e) { setZones([]) }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!form.zone_name) { setMsg(t("seller.zoneNameRequired")); return }
    try {
      await createSellerDeliveryZone({
        zone_name: form.zone_name,
        delivery_charge: parseFloat(form.delivery_charge) || 0,
        country: form.country || "",
        state: form.state || "",
        city: form.city || "",
        area: form.areas || "",
        estimated_days: form.estimated_days || "",
      })
      setMsg(t("seller.zoneCreated"))
      setShowForm(false)
      setForm({ zone_name: "", delivery_charge: "0", country: "", state: "", city: "", areas: "", estimated_days: "" })
      loadZones()
    } catch (e) { setMsg(e.response?.data?.detail || t("seller.zoneCreateFailed")) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(t("seller.deleteZoneConfirm", { name }))) return
    try {
      await deleteSellerDeliveryZone(id)
      setMsg(t("seller.zoneDeleted", { name }))
      loadZones()
    } catch (e) { setMsg(e.response?.data?.detail || t("seller.zoneDeleteFailed")) }
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-3">
      {msg && <p className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">{msg}</p>}

      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/30">
        <Plus className="w-3.5 h-3.5" /> {showForm ? t("seller.cancel") : t("seller.addZone")}
      </button>

      {showForm && (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
          <input value={form.zone_name} onChange={(e) => setForm({ ...form, zone_name: e.target.value })} placeholder={t("seller.zoneNameReq")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
          <input value={form.delivery_charge} onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })} placeholder={t("seller.deliveryCharge")} type="number" step="0.01" className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder={t("seller.country")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder={t("seller.state")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t("seller.city")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
            <input value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} placeholder={t("seller.areas")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
          </div>
          <input value={form.estimated_days} onChange={(e) => setForm({ ...form, estimated_days: e.target.value })} placeholder={t("seller.estDeliveryDays")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
          <button onClick={handleCreate} className="w-full py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium">{t("seller.createZone")}</button>
        </div>
      )}

      {zones.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">{t("seller.noZones")}</p>
      ) : (
        zones.map((z) => (
          <div key={z.zone_id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-white font-medium">{z.zone_name}</p>
              <p className="text-[10px] text-gray-500">${Number(z.delivery_charge).toFixed(2)}</p>
              {(z.country || z.city) && <p className="text-[10px] text-gray-500">{z.country}{z.country && z.city ? ", " : ""}{z.city}</p>}
            </div>
            <button onClick={() => handleDelete(z.zone_id, z.zone_name)} className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px]">{t("seller.delete")}</button>
          </div>
        ))
      )}
    </div>
  )
}
