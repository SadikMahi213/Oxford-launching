import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Package, X, Truck, Ban, DollarSign, RotateCcw, Search, BarChart3 } from "lucide-react"
import { getAdminOrderList, getAdminOrderDetail, adminUpdateOrderStatus, adminRefundOrder, getAdminReturnRequests, processReturnRequest, getOrderReportsSummary, getOrderDailyReport, getOrderSellerReport } from "../../api/marketplace.api.js"

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

export default function AdminOrderManagement() {
  const [tab, setTab] = useState("orders")
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "orders", label: "Orders", icon: Package },
          { id: "returns", label: "Returns", icon: RotateCcw },
          { id: "reports", label: "Reports", icon: BarChart3 },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${tab === t.id ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/[0.04] text-gray-400"}`}
          ><t.icon className="w-3.5 h-3.5" />{t.label}</button>
        ))}
      </div>
      {tab === "orders" && <AdminOrderList />}
      {tab === "returns" && <AdminReturnRequests />}
      {tab === "reports" && <AdminOrderReports />}
    </div>
  )
}

function AdminOrderList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: "", search: "", page: 1 })
  const [total, setTotal] = useState(0)
  const [msg, setMsg] = useState("")
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { loadOrders() }, [filters])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const r = await getAdminOrderList({ ...filters, per_page: 10 })
      setOrders(r.data.orders || [])
      setTotal(r.data.total || 0)
    } catch (e) { setOrders([]) }
    setLoading(false)
  }

  const openDetail = async (id) => {
    setSelectedOrder(id)
    setDetailLoading(true)
    try {
      const r = await getAdminOrderDetail(id)
      setDetail(r.data)
    } catch (e) { setDetail(null) }
    setDetailLoading(false)
  }

  const handleStatusOverride = async (id, status) => {
    if (!confirm(`Set order #${id} to "${status}"?`)) return
    try {
      await adminUpdateOrderStatus(id, status)
      setMsg(`Order #${id} set to ${status}`)
      loadOrders()
      setDetail(null)
    } catch (e) { setMsg(e.response?.data?.detail || "Failed") }
  }

  const handleRefund = async (id) => {
    const amount = prompt("Refund amount:")
    if (!amount) return
    try {
      await adminRefundOrder(id, parseFloat(amount))
      setMsg(`Refund processed for #${id}`)
      loadOrders()
      setDetail(null)
    } catch (e) { setMsg(e.response?.data?.detail || "Refund failed") }
  }

  return (
    <div className="space-y-3">
      {msg && <p className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">{msg}</p>}

      {/* Search + Filter */}
      <div className="flex items-center gap-2">
        <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          placeholder="Search by order ID or customer..." className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["", "pending", "confirmed", "processing", "packed", "shipped", "delivered", "completed", "cancelled", "refunded", "failed"].map((s) => (
          <button key={s} onClick={() => setFilters({ ...filters, status: s, page: 1 })}
            className={`px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap ${filters.status === s ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/[0.04] text-gray-400"}`}
          >{s || "All"}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No orders found</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} onClick={() => openDetail(o.id)} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:border-cyan-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500">#{o.id} | {o.customer_name || "N/A"}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[o.status] || ""}`}>{o.status}</span>
              </div>
              {o.items?.length > 0 && (
                <div className="text-xs text-gray-300 mb-1">
                  {o.items.map((item, i) => (<span key={i}>{item.product_name} x{item.quantity}{i < o.items.length - 1 ? ", " : ""}</span>))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{new Date(o.created_at).toLocaleDateString()}</span>
                <span className="text-white font-semibold">${Number(o.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 10 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="px-3 py-1 rounded-lg bg-white/[0.04] text-xs text-gray-400 disabled:opacity-30">Prev</button>
          <span className="text-xs text-gray-500">{filters.page}/{Math.ceil(total / 10)}</span>
          <button disabled={filters.page >= Math.ceil(total / 10)} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="px-3 py-1 rounded-lg bg-white/[0.04] text-xs text-gray-400 disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => { setSelectedOrder(null); setDetail(null) }}
          >
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#0f1128] to-[#0a0b1e] rounded-t-2xl sm:rounded-2xl border border-white/[0.06] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              {detailLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : detail ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Order #{detail.id}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[detail.status] || ""}`}>{detail.status}</span>
                  </div>

                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-white/[0.03] text-xs space-y-1">
                    <p className="text-gray-400 font-medium">Customer: {detail.customer_name || "N/A"}</p>
                    {detail.customer_phone && <p className="text-gray-400">Phone: {detail.customer_phone}</p>}
                    {detail.customer_address && <p className="text-gray-400">Address: {detail.customer_address}</p>}
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {detail.items?.map((item) => (
                      <div key={item.id} className="flex justify-between p-2 rounded-lg bg-white/[0.03] text-xs">
                        <span className="text-gray-300">{item.product_name} x{item.quantity}</span>
                        <span className="text-white">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/[0.06] pt-2 space-y-1">
                      {detail.delivery_charge > 0 && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Delivery</span><span className="text-gray-300">${detail.delivery_charge.toFixed(2)}</span></div>
                      )}
                      {detail.commission_amount > 0 && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Commission</span><span className="text-rose-400">-${detail.commission_amount.toFixed(2)}</span></div>
                      )}
                      <div className="flex justify-between text-sm"><span className="text-gray-400">Total</span><span className="text-white font-bold">${detail.total.toFixed(2)}</span></div>
                    </div>
                  </div>

                  {/* Seller Info */}
                  {detail.seller_name && <p className="text-xs text-gray-500">Seller: {detail.seller_name}</p>}

                  {/* Tracking */}
                  {detail.tracking_number && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 text-xs text-blue-400">
                      <Truck className="w-3.5 h-3.5" /> {detail.tracking_number}
                    </div>
                  )}

                  {/* Timeline */}
                  {detail.timeline?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-medium">Timeline</p>
                      {detail.timeline.map((t, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px]">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 ${i === detail.timeline.length - 1 ? "bg-cyan-400" : "bg-gray-600"}`} />
                          <div>
                            <p className="text-gray-400">
                              {t.from_status && <span className="text-gray-500">{t.from_status} → </span>}
                              <span className="text-white">{t.to_status}</span>
                            </p>
                            <p className="text-gray-600">{new Date(t.created_at).toLocaleString()}</p>
                            {t.note && <p className="text-gray-500 italic">{t.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payment Info */}
                  <div className="text-[10px] text-gray-500 space-y-0.5">
                    <p>Payment: {detail.payment_method} | Refunded: ${Number(detail.refunded_amount || 0).toFixed(2)}</p>
                  </div>

                  {/* Admin Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <select onChange={(e) => handleStatusOverride(detail.id, e.target.value)} defaultValue=""
                      className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white"
                    >
                      <option value="" disabled>Override Status...</option>
                      <option value="confirmed">confirmed</option>
                      <option value="processing">processing</option>
                      <option value="packed">packed</option>
                      <option value="ready_to_ship">ready_to_ship</option>
                      <option value="picked_up">picked_up</option>
                      <option value="out_for_delivery">out_for_delivery</option>
                      <option value="delivered">delivered</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="refunded">refunded</option>
                      <option value="failed">failed</option>
                    </select>
                    <button onClick={() => handleRefund(detail.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Refund
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-8">Order not found</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AdminReturnRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [msg, setMsg] = useState("")

  useEffect(() => { load() }, [filter])

  const load = async () => {
    setLoading(true)
    try {
      const r = await getAdminReturnRequests(filter)
      setRequests(r.data?.requests || [])
    } catch (e) { setRequests([]) }
    setLoading(false)
  }

  const process = async (id, status) => {
    const note = prompt(`Note for ${status} request:`)
    if (note === null) return
    const refundAmount = status === "approved" ? parseFloat(prompt("Refund amount:") || "0") : 0
    try {
      await processReturnRequest(id, status, note || "", refundAmount)
      setMsg(`Request ${status}`)
      load()
    } catch (e) { setMsg(e.response?.data?.detail || "Failed") }
  }

  return (
    <div className="space-y-3">
      {msg && <p className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">{msg}</p>}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["", "pending", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-2.5 py-1 rounded-lg text-[10px] ${filter === s ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/[0.04] text-gray-400"}`}
          >{s || "All"}</button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : requests.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No return requests</p>
      ) : (
        requests.map((r) => (
          <div key={r.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white font-medium">Order #{r.order_id} - Request #{r.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.status === "pending" ? "bg-amber-500/20 text-amber-400" : r.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{r.status}</span>
            </div>
            <p className="text-xs text-gray-400">Reason: {r.reason}</p>
            {r.admin_note && <p className="text-xs text-gray-500">Admin note: {r.admin_note}</p>}
            <p className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => process(r.id, "approved")} className="flex-1 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium">Approve</button>
                <button onClick={() => process(r.id, "rejected")} className="flex-1 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium">Reject</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function AdminOrderReports() {
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getOrderReportsSummary().then(r => setSummary(r.data)).catch(() => {}),
      getOrderDailyReport(days).then(r => setDaily(r.data?.daily || [])).catch(() => {}),
      getOrderSellerReport().then(r => setSellers(r.data?.sellers || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [days])

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-3">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Total Orders", value: summary.total_orders },
            { label: "Revenue", value: `$${Number(summary.total_revenue || 0).toFixed(2)}` },
            { label: "Commission", value: `$${Number(summary.total_commission || 0).toFixed(2)}` },
            { label: "Pending", value: summary.pending_orders },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <p className="text-[10px] text-gray-500">{s.label}</p>
              <p className="text-sm font-bold text-white">{s.value || "0"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Daily Report */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">Daily Orders</p>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-[10px] text-white">
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
        {daily.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No data</p>
        ) : (
          daily.map((d, i) => (
            <div key={i} className="p-2 rounded-lg bg-white/[0.03] flex items-center justify-between text-xs">
              <span className="text-gray-400">{d.date}</span>
              <span className="text-white">{d.count} orders / ${Number(d.revenue || 0).toFixed(2)}</span>
            </div>
          ))
        )}
      </div>

      {/* Seller Report */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium">Seller Performance</p>
        {sellers.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No data</p>
        ) : (
          sellers.map((s, i) => (
            <div key={i} className="p-2 rounded-lg bg-white/[0.03] flex items-center justify-between text-xs">
              <span className="text-gray-300">{s.seller_name || `Seller #${s.seller_id}`}</span>
              <span className="text-gray-400">{s.count} orders / ${Number(s.revenue || 0).toFixed(2)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
