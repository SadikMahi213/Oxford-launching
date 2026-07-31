import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Package, X, ChevronRight, Clock, Truck, Ban, RotateCcw, MapPin, CreditCard } from "lucide-react"
import { getMyOrders, getMyOrderDetail, cancelMyOrder, requestReturn } from "../../api/marketplace.api.js"

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

export default function CustomerOrderPanel({ onClose }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState("")
  const [msg, setMsg] = useState("")

  useEffect(() => { loadOrders() }, [page, statusFilter])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const r = await getMyOrders(page, 10, statusFilter)
      setOrders(r.data.orders || [])
      setTotal(r.data.total || 0)
    } catch (e) { setOrders([]) }
    setLoading(false)
  }

  const openDetail = async (id) => {
    setSelectedOrder(id)
    setDetailLoading(true)
    try {
      const r = await getMyOrderDetail(id)
      setDetail(r.data)
    } catch (e) { setDetail(null) }
    setDetailLoading(false)
  }

  const handleCancel = async (id) => {
    const reason = prompt("Reason for cancellation (optional):")
    if (reason === null) return
    try {
      await cancelMyOrder(id, reason || "")
      setMsg("Order cancelled")
      loadOrders()
      setDetail(null)
    } catch (e) { setMsg(e.response?.data?.detail || "Cancel failed") }
  }

  const handleReturn = async (id) => {
    const reason = prompt("Reason for return:")
    if (!reason) return
    try {
      await requestReturn(id, reason)
      setMsg("Return request submitted")
    } catch (e) { setMsg(e.response?.data?.detail || "Return request failed") }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">My Orders</h2>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/[0.04] text-gray-400"><X className="w-4 h-4" /></button>
        )}
      </div>

      {msg && <p className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">{msg}</p>}

      {/* Status Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["", "pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled"].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap ${statusFilter === s ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/[0.04] text-gray-400"}`}
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
            <div key={o.id} onClick={() => openDetail(o.id)}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-500">#{o.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[o.status] || "bg-gray-500/20 text-gray-400"}`}>{o.status}</span>
              </div>
              <div className="text-xs text-gray-300 mb-1">
                {o.items?.slice(0, 2).map((item, i) => (
                  <span key={i}>{item.product_name} x{item.quantity}{i < Math.min(o.items.length, 2) - 1 ? ", " : ""}</span>
                ))}
                {o.items?.length > 2 && <span className="text-gray-500"> +{o.items.length - 2} more</span>}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{new Date(o.created_at).toLocaleDateString()}</span>
                <span className="text-white font-semibold">${Number(o.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 10 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-lg bg-white/[0.04] text-xs text-gray-400 disabled:opacity-30">Prev</button>
          <span className="text-xs text-gray-500">{page}/{Math.ceil(total / 10)}</span>
          <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-lg bg-white/[0.04] text-xs text-gray-400 disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
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
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[detail.status] || "bg-gray-500/20 text-gray-400"}`}>{detail.status}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Items</p>
                    {detail.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                        <span className="text-xs text-gray-300">{item.product_name} x{item.quantity}</span>
                        <span className="text-xs text-white font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/[0.06] pt-2 space-y-1">
                      {detail.delivery_charge > 0 && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Delivery</span><span className="text-gray-300">${detail.delivery_charge.toFixed(2)}</span></div>
                      )}
                      <div className="flex justify-between text-sm"><span className="text-gray-400">Total</span><span className="text-white font-bold">${detail.total.toFixed(2)}</span></div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {detail.customer_name && (
                    <div className="p-3 rounded-xl bg-white/[0.03] text-xs space-y-1">
                      <p className="text-gray-400 font-medium">Customer</p>
                      <p className="text-white">{detail.customer_name}</p>
                      {detail.customer_phone && <p className="text-gray-400">{detail.customer_phone}</p>}
                      {detail.customer_address && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <MapPin className="w-3 h-3 text-gray-500 mt-0.5" />
                          <p className="text-gray-400">{detail.customer_address}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tracking */}
                  {detail.tracking_number && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-300">Tracking: {detail.tracking_number}</span>
                    </div>
                  )}

                  {/* Timeline */}
                  {detail.timeline?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Order Timeline</p>
                      <div className="space-y-1.5">
                        {detail.timeline.map((t, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${i === detail.timeline.length - 1 ? "bg-cyan-400" : "bg-gray-600"}`} />
                            <div>
                              <p className="text-gray-300">
                                {t.from_status && <span className="text-gray-500">{t.from_status}</span>}
                                {t.from_status && <span className="text-gray-600 mx-1">→</span>}
                                <span className="text-white">{t.to_status}</span>
                              </p>
                              <p className="text-gray-500">{new Date(t.created_at).toLocaleString()}</p>
                              {t.note && <p className="text-gray-500 italic">{t.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {["pending", "confirmed"].includes(detail.status) && (
                      <button onClick={() => handleCancel(detail.id)} className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium flex items-center justify-center gap-1">
                        <Ban className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                    {["delivered", "completed"].includes(detail.status) && (
                      <button onClick={() => handleReturn(detail.id)} className="flex-1 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium flex items-center justify-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> Request Return
                      </button>
                    )}
                  </div>

                  {/* Payment Info */}
                  <div className="text-[10px] text-gray-500 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Payment: {detail.payment_method}
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
