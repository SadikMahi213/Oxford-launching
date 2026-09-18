<<<<<<< HEAD
import DOMPurify from "dompurify"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "motion/react"
import { useEffect, useState } from "react"
import {
  ShoppingCart, Plus, Minus, Search, X, ChevronLeft, ChevronRight,
  Heart, Star, Clock, Truck, ShieldCheck, Package, Filter,
  MessageCircle, Eye, Trash2, CreditCard, MapPin, Store,
  ArrowLeft, Tag, Award, Zap,
} from "lucide-react"
import useUserStore from "../../store/userStore"
import {
  marketplaceListProducts, marketplaceGetProduct, marketplaceFeaturedProducts,
  marketplaceNewArrivals,
  addToCart, getCart, updateCartItem, removeCartItem, clearCart,
  getMyOrders, checkout, getProductReviews, createReview,
  addToWishlist, removeFromWishlist, getWishlist,
  validateCoupon, trackProductView, getFlashDeals,
  getPublicDeliveryZones, calculateDelivery,
} from "../../api/marketplace.api.js"

// ── Reviews Section (standalone with own state) ──────────────
const ReviewsSection = ({ productId }) => {
  const { t } = useTranslation()
  const [reviews, setReviews] = useState([])
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" })
  useEffect(() => {
    getProductReviews(productId, 1, 5).then((r) => setReviews(r.data.reviews || [])).catch(() => {})
  }, [productId])

  const submitReview = async () => {
    try { await createReview(productId, reviewForm); setReviewForm({ rating: 5, title: "", comment: "" }); getProductReviews(productId, 1, 5).then((r) => setReviews(r.data.reviews || [])).catch(() => {}) } catch (e) { alert(e.response?.data?.detail || t("marketplace.errGeneric")) }
  }

  return (
    <div className="border-t border-white/[0.06] pt-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">{t("marketplace.reviews")}</h3>
      {reviews.length === 0 && <p className="text-xs text-gray-500">{t("marketplace.noReviews")}</p>}
      {reviews.map((r) => (
        <div key={r.id} className="p-3 rounded-xl bg-white/[0.02] space-y-1">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-600"}`} />)}
          </div>
          {r.title && <p className="text-xs text-white font-medium">{r.title}</p>}
          {r.comment && <p className="text-[11px] text-gray-400">{r.comment}</p>}
        </div>
      ))}
      <div className="space-y-2 pt-2">
        <h4 className="text-xs text-gray-400 font-medium">{t("marketplace.writeReview")}</h4>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
              <Star className={`w-5 h-5 ${s <= reviewForm.rating ? "text-amber-400 fill-amber-400" : "text-gray-600"}`} />
            </button>
          ))}
        </div>
        <input value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} placeholder={t("marketplace.title")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
        <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder={t("marketplace.yourReview")} rows={2} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 resize-none" />
        <button onClick={submitReview} className="w-full py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium">{t("marketplace.submitReview")}</button>
      </div>
    </div>
  )
}

// ── Product Card ────────────────────────────────────────────
const ProductCard = ({ product, openProduct, toggleWishlist, inWishlist }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="group relative bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-hidden hover:border-cyan-500/30 transition-all cursor-pointer"
    onClick={() => openProduct(product.id)}
  >
    <div className="aspect-square bg-white/[0.02] flex items-center justify-center p-4 overflow-hidden">
      {product.image_urls?.[0] ? (
        <img src={product.image_urls[0]} alt={product.name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-105" />
      ) : null}
      <div style={product.image_urls?.[0] ? {display:'none'} : {display:'flex'}} className="items-center justify-center">
        <Package className="w-12 h-12 text-gray-600" />
      </div>
    </div>
    <div className="p-3 space-y-1.5">
      <h3 className="text-xs text-gray-300 font-medium line-clamp-2 leading-tight">{product.name}</h3>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">${Number(product.price).toFixed(2)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id) }}
          className={`p-1.5 rounded-lg transition-all ${inWishlist(product.id) ? "bg-red-500/20 text-red-400" : "bg-white/[0.04] text-gray-500 hover:text-red-400"}`}
        >
          <Heart className={`w-3.5 h-3.5 ${inWishlist(product.id) ? "fill-red-400" : ""}`} />
        </button>
      </div>
    </div>
  </motion.div>
)

// ── Product Detail Modal ─────────────────────────────────────
const ProductDetailModal = ({ selectedProduct, setSelectedProduct, setProductDetail, productDetail, detailLoading, qty, setQty, addItem, selectedImageIdx, setSelectedImageIdx }) => {
  const { t } = useTranslation()
  return (
  <AnimatePresence>
    {selectedProduct && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={() => { setSelectedProduct(null); setProductDetail(null) }}
      >
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25 }}
          className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#0f1128] to-[#0a0b1e] rounded-t-2xl sm:rounded-2xl border border-white/[0.06] p-5"
          onClick={(e) => e.stopPropagation()}
        >
          {detailLoading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : productDetail ? (
            <div className="space-y-4">
              {/* Images Gallery */}
              <div className="space-y-2">
                <div className="relative aspect-square bg-white/[0.02] rounded-xl overflow-hidden group">
                  {productDetail.image_urls?.length > 0 ? (
                    <>
                        <img src={productDetail.image_urls[selectedImageIdx]} alt={productDetail.name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} className="w-full h-full object-cover transition-opacity" />
                      <div style={productDetail.image_urls?.[selectedImageIdx] ? {display:'none'} : {display:'flex'}} className="w-full h-full items-center justify-center"><Package className="w-16 h-16 text-gray-600" /></div>
                      {productDetail.image_urls.length > 1 && (
                        <>
                          <button onClick={() => setSelectedImageIdx((selectedImageIdx - 1 + productDetail.image_urls.length) % productDetail.image_urls.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="w-5 h-5" /></button>
                          <button onClick={() => setSelectedImageIdx((selectedImageIdx + 1) % productDetail.image_urls.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="w-5 h-5" /></button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {productDetail.image_urls.map((_, i) => (
                              <button key={i} onClick={() => setSelectedImageIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === selectedImageIdx ? "bg-white w-4" : "bg-white/40"}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full"><Package className="w-16 h-16 text-gray-600" /></div>
                  )}
                </div>
                {productDetail.image_urls?.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {productDetail.image_urls.map((url, i) => (
                      <button key={i} onClick={() => setSelectedImageIdx(i)} className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === selectedImageIdx ? "border-cyan-400 opacity-100" : "border-transparent opacity-60 hover:opacity-80"}`}>
                        <img src={url} alt={t("marketplace.productImage", { n: i + 1 })} loading="lazy" onError={(e) => { e.target.style.display='none' }} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Price */}
              <div>
                <h2 className="text-lg font-bold text-white">{productDetail.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-bold text-cyan-400">${Number(productDetail.price).toFixed(2)}</span>
                  {productDetail.rating_avg > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{productDetail.rating_avg.toFixed(1)}</span>
                      <span className="text-gray-500">({productDetail.rating_count})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seller */}
              {productDetail.seller && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Store className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">{productDetail.seller.store_name}</span>
                  {productDetail.seller.whatsapp_number && (
                    <a href={`https://wa.me/${productDetail.seller.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="ml-auto p-1.5 rounded-lg bg-green-500/20 text-green-400">
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Variants */}
              {productDetail.variants?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t("marketplace.variants")}</p>
                  <div className="flex flex-wrap gap-2">
                    {productDetail.variants.map((v) => (
                      <button key={v.id} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 hover:border-cyan-500/40">
                        {v.name} - ${Number(v.price).toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {productDetail.description && (
                <div className="text-xs text-gray-400 leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(productDetail.description) }}></div>
              )}

              {/* Tags */}
              {productDetail.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {productDetail.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-gray-500">{tag}</span>
                  ))}
                </div>
              )}

              {/* Qty + Add to Cart */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/[0.04] rounded-xl border border-white/[0.06]">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 text-gray-400 hover:text-white"><Minus className="w-4 h-4" /></button>
                  <span className="px-4 text-sm text-white font-medium">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="p-2.5 text-gray-400 hover:text-white"><Plus className="w-4 h-4" /></button>
                </div>
                <button
                  onClick={() => { addItem(productDetail.id); setSelectedProduct(null) }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold hover:opacity-90 transition-all"
                >
                  {t("marketplace.addToCart")}
                </button>
              </div>

              {/* Reviews */}
              <ReviewsSection productId={productDetail.id} />
            </div>
          ) : (
            <div className="py-10 text-center text-gray-500 text-sm">{t("marketplace.productNotFound")}</div>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
  )
}

// ── Cart Drawer ─────────────────────────────────────────────
const CartDrawer = ({ view, setView, cart, updateQty, removeItem, setShowCheckoutForm }) => {
  const { t } = useTranslation()
  return (
  <AnimatePresence>
    {view === "cart" && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex justify-end"
        onClick={() => setView("shop")}
      >
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25 }}
          className="w-full max-w-sm bg-[#0a0b1e] border-l border-white/[0.06] h-full overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{t("marketplace.cart", { count: cart.itemCount })}</h2>
            <button onClick={() => setView("shop")} className="p-1.5 rounded-lg bg-white/[0.04] text-gray-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 space-y-3">
            {cart.items.length === 0 && <p className="text-xs text-gray-500 text-center py-8">{t("marketplace.cartEmpty")}</p>}
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-14 h-14 rounded-xl bg-white/[0.04] overflow-hidden flex-shrink-0">
                    {item.product_image ? <img src={item.product_image} alt={item.product_name} loading="lazy" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} className="w-full h-full object-cover" /> : null}
                    <div style={item.product_image ? {display:'none'} : {display:'flex'}} className="w-full h-full items-center justify-center">
                      <Package className="w-6 h-6 text-gray-600" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{item.product_name}</p>
                  <p className="text-[11px] text-cyan-400 font-semibold mt-0.5">${item.price.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="p-0.5 rounded bg-white/[0.06] text-gray-400"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs text-white">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="p-0.5 rounded bg-white/[0.06] text-gray-400"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => removeItem(item.id)} className="ml-auto p-1 rounded bg-red-500/10 text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cart.items.length > 0 && (
            <div className="sticky bottom-0 p-4 border-t border-white/[0.06] bg-[#0a0b1e] space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t("marketplace.total")}</span>
                <span className="text-white font-bold">${cart.total.toFixed(2)}</span>
              </div>
              <button onClick={() => setShowCheckoutForm(true)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold">
                {t("marketplace.proceedCheckout")}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
  )
}

// ── Checkout Modal ───────────────────────────────────────────
const CheckoutModal = ({ showCheckoutForm, setShowCheckoutForm, customer, setCustomer, couponCode, setCouponCode, applyCoupon, couponValid, couponDiscount, checkoutMsg, cart, placeOrder, processing, deliveryZones, selectedZoneId, setSelectedZoneId, deliveryCharge, deliveryLoading }) => {
  const { t } = useTranslation()
  return (
  <AnimatePresence>
    {showCheckoutForm && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={() => setShowCheckoutForm(false)}
      >
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-gradient-to-b from-[#0f1128] to-[#0a0b1e] rounded-t-2xl sm:rounded-2xl border border-white/[0.06] p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-sm font-semibold text-white mb-4">{t("marketplace.checkout")}</h2>
          <div className="space-y-3">
            <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder={t("marketplace.fullName")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500" />
            <input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder={t("marketplace.email")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500" />
            <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder={t("marketplace.phone")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500" />
            <textarea value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder={t("marketplace.deliveryAddress")} rows={2} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none" />
            <textarea value={customer.shipping_address} onChange={(e) => setCustomer({ ...customer, shipping_address: e.target.value })} placeholder={t("marketplace.shippingAddress")} rows={2} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none" />

            {/* Delivery Zone */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t("marketplace.deliveryZone")}</label>
              <select value={selectedZoneId || ""} onChange={(e) => setSelectedZoneId(e.target.value || null)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/40">
                <option value="">{t("marketplace.selectZone")}</option>
                {deliveryZones.map((z) => (
                  <option key={z.id} value={z.id}>{z.zone_name}{z.country ? ` (${z.country})` : ""}</option>
                ))}
              </select>
            </div>

            {deliveryLoading && <p className="text-xs text-gray-500">{t("marketplace.calculatingDelivery")}</p>}
            {deliveryCharge > 0 && !deliveryLoading && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t("marketplace.deliveryCharge")}</span>
                <span className="text-white">${deliveryCharge.toFixed(2)}</span>
              </div>
            )}

            {/* Coupon */}
            <div className="flex items-center gap-2">
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder={t("marketplace.couponCode")} className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 uppercase" />
              <button onClick={applyCoupon} className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium">{t("marketplace.apply")}</button>
            </div>
            {couponValid && <p className="text-xs text-green-400">{t("marketplace.discount")}: -${couponDiscount.toFixed(2)}</p>}

            <div className="flex items-center justify-between text-sm border-t border-white/[0.06] pt-3">
              <span className="text-gray-400">{t("marketplace.subtotal")}</span>
              <span className="text-gray-300">${Math.max(0, cart.total - couponDiscount).toFixed(2)}</span>
            </div>
            {deliveryCharge > 0 && !deliveryLoading && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t("marketplace.delivery")}</span>
                <span className="text-gray-300">${deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm border-t border-white/[0.06] pt-2">
              <span className="text-gray-400 font-semibold">{t("marketplace.total")}</span>
              <span className="text-white font-bold">${Math.max(0, cart.total - couponDiscount + deliveryCharge).toFixed(2)}</span>
            </div>

            {checkoutMsg && <p className={`text-xs ${checkoutMsg.includes("success") ? "text-green-400" : "text-red-400"}`}>{checkoutMsg}</p>}
            <button onClick={placeOrder} disabled={processing} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold disabled:opacity-50">
              {processing ? t("marketplace.processing") : t("marketplace.placeOrder")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
  )
}

// ── Orders View ──────────────────────────────────────────────
const OrdersView = ({ orders: _o }) => {
  const { t } = useTranslation()
  const [panelKey, setPanelKey] = useState(0)
  // Import CustomerOrderPanel lazily via dynamic import
  const [Panel, setPanel] = useState(null)
  useEffect(() => {
    import("./CustomerOrderPanel.jsx").then(m => setPanel(() => m.default)).catch(() => {})
  }, [])
  if (!Panel) return <div className="text-xs text-gray-500 text-center py-8">{t("marketplace.loadingOrders")}</div>
  return <Panel key={panelKey} onClose={() => {}} />
}

// ── Shop View ────────────────────────────────────────────────
const ShopView = ({ search, setSearch, sortBy, setSortBy, setPage, handleSearch, featured, products, totalPages, page, ProductCardComponent, openProduct, toggleWishlist, inWishlist, loading }) => {
  const { t } = useTranslation()
  return (
  <div className="space-y-4">
    {/* Search & Filters */}
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("marketplace.searchProducts")} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/40"
        />
      </div>
      <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/40">
        <option value="newest">{t("marketplace.newest")}</option>
        <option value="price_asc">{t("marketplace.priceAsc")}</option>
        <option value="price_desc">{t("marketplace.priceDesc")}</option>
      </select>
    </form>

    {/* Featured / New Arrivals */}
    {featured.length > 0 && (
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">{t("marketplace.featured")}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featured.slice(0, 4).map((p) => <ProductCardComponent key={p.id} product={p} openProduct={openProduct} toggleWishlist={toggleWishlist} inWishlist={inWishlist} />)}
        </div>
      </section>
    )}

    {/* All Products */}
    <section>
      <h2 className="text-sm font-semibold text-white mb-3">{t("marketplace.allProducts")}</h2>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <p className="text-gray-500 text-center py-8 text-sm">{t("marketplace.noProducts")}</p>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((p) => <ProductCardComponent key={p.id} product={p} openProduct={openProduct} toggleWishlist={toggleWishlist} inWishlist={inWishlist} />)}
      </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 disabled:opacity-30">{t("marketplace.prev")}</button>
          <span className="text-xs text-gray-500">{page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 disabled:opacity-30">{t("marketplace.next")}</button>
        </div>
      )}
    </section>
  </div>
  )
}

// ── Main Component ──────────────────────────────────────────
export default function MarketplacePage() {
  const { t } = useTranslation()
  const { user } = useUserStore()

  const [view, setView] = useState("shop")
  const [products, setProducts] = useState([])
  const [featured, setFeatured] = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [loading, setLoading] = useState(true)

  // Shop
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // Cart
  const [cart, setCart] = useState({ items: [], total: 0, itemCount: 0 })

  // Product detail
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productDetail, setProductDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [qty, setQty] = useState(1)

  // Checkout
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [checkoutMsg, setCheckoutMsg] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponValid, setCouponValid] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [deliveryZones, setDeliveryZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [customer, setCustomer] = useState({
    name: user?.full_name || "", email: user?.email || "",
    phone: "", address: "", shipping_address: "",
  })

  // Orders
  const [orders, setOrders] = useState([])
  const [ordersPage, setOrdersPage] = useState(1)

  // Wishlist
  const [wishlist, setWishlist] = useState([])

  // Image gallery
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  useEffect(() => { loadShop() }, [search, sortBy, page])
  useEffect(() => { loadFeatured(); loadCartData(); loadWishlist() }, [])

  // Load delivery zones when checkout opens
  useEffect(() => {
    if (showCheckoutForm) {
      getPublicDeliveryZones().then(r => setDeliveryZones(r.data?.zones || [])).catch(() => {})
    }
  }, [showCheckoutForm])

  // Calculate delivery charge when zone or cart changes
  useEffect(() => {
    if (!selectedZoneId || cart.items.length === 0) {
      setDeliveryCharge(0)
      return
    }
    setDeliveryLoading(true)
    // Get unique seller IDs from cart items
    const sellerIds = [...new Set(cart.items.map(i => i.seller_id).filter(Boolean))]
    Promise.all(sellerIds.map(sid =>
      calculateDelivery(selectedZoneId, sid, cart.total)
        .then(r => r.data?.delivery_charge || 0)
        .catch(() => 0)
    )).then(charges => {
      setDeliveryCharge(charges.reduce((a, b) => a + b, 0))
      setDeliveryLoading(false)
    }).catch(() => { setDeliveryLoading(false) })
  }, [selectedZoneId, cart.total, cart.items.length, showCheckoutForm])
  useEffect(() => { if (view === "orders") loadOrders() }, [view, ordersPage])

  const loadFeatured = async () => {
    try {
      const [fr, nr] = await Promise.all([
        marketplaceFeaturedProducts(),
        marketplaceNewArrivals(),
      ])
      setFeatured(fr.data.products || [])
      setNewArrivals(nr.data.products || [])
    } catch (e) {}
  }

  const loadShop = async () => {
    setLoading(true)
    try {
      const r = await marketplaceListProducts({ search, sort_by: sortBy, page, per_page: 12 })
      setProducts(r.data.products || [])
      setTotalPages(r.data.total_pages || 0)
    } catch (e) {}
    setLoading(false)
  }

  const loadCartData = async () => {
    try {
      const r = await getCart()
      if (r.data.cart) setCart({ ...r.data, itemCount: r.data.item_count })
    } catch (e) {}
  }

  const loadOrders = async () => {
    try {
      const r = await getMyOrders(ordersPage, 10)
      setOrders(r.data.orders || [])
    } catch (e) {}
  }

  const loadWishlist = async () => {
    try {
      const r = await getWishlist()
      setWishlist(r.data.wishlist || [])
    } catch (e) {}
  }

  const handleSearch = (e) => { e.preventDefault(); setPage(1) }

  const openProduct = async (id) => {
    setDetailLoading(true)
    setSelectedProduct(id)
    setQty(1)
    setSelectedImageIdx(0)
    try {
      const r = await marketplaceGetProduct(id)
      setProductDetail(r.data.product)
      trackProductView(id).catch(() => {})
    } catch (e) { setProductDetail(null) }
    setDetailLoading(false)
  }

  const addItem = async (id, variantId) => {
    try {
      await addToCart(id, qty, variantId)
      await loadCartData()
    } catch (e) {}
  }

  const updateQty = async (itemId, q) => {
    if (q < 1) return
    try { await updateCartItem(itemId, q); await loadCartData() } catch (e) {}
  }

  const removeItem = async (id) => {
    try { await removeCartItem(id); await loadCartData() } catch (e) {}
  }

  const applyCoupon = async () => {
    if (!couponCode) return
    try {
      const r = await validateCoupon(couponCode, cart.total)
      setCouponDiscount(r.data.discount || 0)
      setCouponValid(true)
    } catch (e) { setCouponDiscount(0); setCouponValid(false); alert(e.response?.data?.detail || t("marketplace.invalidCoupon")) }
  }

  const placeOrder = async () => {
    setProcessing(true)
    setCheckoutMsg("")
    try {
      const items = cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, variant_id: i.variant?.id || null }))
      const r = await checkout({
        items, customer_name: customer.name, customer_email: customer.email,
        customer_phone: customer.phone, customer_address: customer.address,
        shipping_address: customer.shipping_address || customer.address,
        coupon_code: couponValid ? couponCode : null,
        zone_id: selectedZoneId,
      })
      setCheckoutMsg(t("marketplace.orderPlaced"))
      setShowCheckoutForm(false)
      setCart({ items: [], total: 0, itemCount: 0 })
      setCouponCode(""); setCouponDiscount(0); setCouponValid(false)
    } catch (e) {
      setCheckoutMsg(e.response?.data?.detail || t("marketplace.checkoutFailed"))
    }
    setProcessing(false)
  }

  const toggleWishlist = async (id) => {
    const exists = wishlist.find((w) => w.product_id === id)
    try {
      if (exists) await removeFromWishlist(id)
      else await addToWishlist(id)
      await loadWishlist()
    } catch (e) {}
  }

  const inWishlist = (id) => wishlist.some((w) => w.product_id === id)

  // ── Main Render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0b1e] px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {view !== "shop" && view !== "orders" && (
            <button onClick={() => setView("shop")} className="p-1.5 rounded-lg bg-white/[0.04] text-gray-400"><ArrowLeft className="w-4 h-4" /></button>
          )}
          <h1 className="text-base font-bold text-white">{t("marketplace.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("orders")} className={`p-2 rounded-xl ${view === "orders" ? "bg-cyan-500/20 text-cyan-400" : "bg-white/[0.04] text-gray-400"}`}>
            <Package className="w-4 h-4" />
          </button>
          <button onClick={() => setView("cart")} className="relative p-2 rounded-xl bg-white/[0.04] text-gray-400">
            <ShoppingCart className="w-4 h-4" />
            {cart.itemCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{cart.itemCount}</span>}
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "shop" && <ShopView search={search} setSearch={setSearch} sortBy={sortBy} setSortBy={setSortBy} setPage={setPage} handleSearch={handleSearch} featured={featured} products={products} totalPages={totalPages} page={page} ProductCardComponent={ProductCard} openProduct={openProduct} toggleWishlist={toggleWishlist} inWishlist={inWishlist} loading={loading} />}
      {view === "orders" && <OrdersView orders={orders} />}

      {/* Modals/Drawers */}
      <ProductDetailModal selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} setProductDetail={setProductDetail} productDetail={productDetail} detailLoading={detailLoading} qty={qty} setQty={setQty} addItem={addItem} selectedImageIdx={selectedImageIdx} setSelectedImageIdx={setSelectedImageIdx} />
      <CartDrawer view={view} setView={setView} cart={cart} updateQty={updateQty} removeItem={removeItem} setShowCheckoutForm={setShowCheckoutForm} />
      <CheckoutModal showCheckoutForm={showCheckoutForm} setShowCheckoutForm={setShowCheckoutForm} customer={customer} setCustomer={setCustomer} couponCode={couponCode} setCouponCode={setCouponCode} applyCoupon={applyCoupon} couponValid={couponValid} couponDiscount={couponDiscount} checkoutMsg={checkoutMsg} cart={cart} placeOrder={placeOrder} processing={processing} deliveryZones={deliveryZones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId} deliveryCharge={deliveryCharge} deliveryLoading={deliveryLoading} />
    </div>
  )
}
=======
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ShoppingCart, Plus, Minus, Search, User, Mail, Phone, MapPin, X, ChevronLeft, ChevronRight, ImageOff, MessageCircle } from "lucide-react";
import DOMPurify from "dompurify";
import useUserStore from "../../store/userStore";
import { listProducts, placeOrder, getMyOrders } from "../../api/ecommerce.api.js";

const MarketplacePage = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("shop");
  const [loading, setLoading] = useState(true);
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productImageIndex, setProductImageIndex] = useState(0);

  const [customer, setCustomer] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (user) {
      setCustomer((prev) => ({
        ...prev,
        name: prev.name || user.full_name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const res = await listProducts({ search, page: 1, limit: 50 });
      setProducts(res.data?.products || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const res = await getMyOrders();
      setOrders(res.data?.orders || []);
    } catch { /* ignore */ }
  };

  const addToCart = (product) => {
    setCart((prev) => ({
      ...prev,
      [product.id]: { product, qty: (prev[product.id]?.qty || 0) + 1 },
    }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId]) {
        if (next[productId].qty <= 1) delete next[productId];
        else next[productId] = { ...next[productId], qty: next[productId].qty - 1 };
      }
      return next;
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, i) => sum + parseFloat(i.product.price) * i.qty, 0);

  const validateForm = () => {
    const errors = {};
    if (!customer.name.trim()) errors.name = t('marketplace.err_nameRequired');
    if (!customer.email.trim()) errors.email = t('marketplace.err_emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.email = t('marketplace.err_emailInvalid');
    if (!customer.phone.trim()) errors.phone = t('marketplace.err_phoneRequired');
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(customer.phone)) errors.phone = t('marketplace.err_phoneInvalid');
    if (!customer.address.trim()) errors.address = t('marketplace.err_addressRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!validateForm()) return;
    try {
      const items = cartItems.map((i) => ({
        product_id: i.product.id,
        quantity: i.qty,
      }));
      await placeOrder({
        items,
        customer_name: customer.name.trim(),
        customer_email: customer.email.trim(),
        customer_phone: customer.phone.trim(),
        customer_address: customer.address.trim(),
      });
      setCart({});
      setShowCheckoutForm(false);
      setCheckoutMsg(t('marketplace.orderSuccess'));
      setTimeout(() => setCheckoutMsg(""), 3000);
      fetchOrders();
    } catch (err) {
      setCheckoutMsg(t('marketplace.orderFailed', { error: err.response?.data?.detail || err.message }));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t('marketplace.title')}
          </span>
        </h1>
        <p className="text-sm text-gray-400">{t('marketplace.subtitle')}</p>
      </motion.div>

      <div className="flex gap-2">
        <button onClick={() => setView("shop")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${view === "shop" ? "bg-cyan-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>{t('marketplace.shop')}</button>
        <button onClick={() => setView("orders")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${view === "orders" ? "bg-cyan-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
          {t('marketplace.myOrders', { count: orders.length })}
        </button>
      </div>

      {view === "shop" && (
        <>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('marketplace.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button onClick={fetchProducts} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-medium transition-colors">{t('marketplace.search')}</button>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-8">{t('marketplace.loadingProducts')}</div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-400 py-8">{t('marketplace.noProducts')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all cursor-pointer"
                  onClick={() => { setSelectedProduct(p); setProductImageIndex(0); }}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover" />
                  ) : (p.image_urls && p.image_urls.length > 0) ? (
                    <img src={p.image_urls[0]} alt={p.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-white/5 flex items-center justify-center"><ImageOff className="w-8 h-8 text-gray-500" /></div>
                  )}
                  <div className="p-4 space-y-2">
                    <h3 className="text-white font-semibold">{p.name}</h3>
                    <div className="text-xs text-gray-400 line-clamp-2">{p.description ? p.description.replace(/<[^>]*>/g, "") : ""}</div>
                    <p className="text-sm text-gray-300">{t('marketplace.by', { store: p.store_name })}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-bold text-cyan-400">${parseFloat(p.price).toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        {cart[p.id] ? (
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); removeFromCart(p.id); }} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><Minus className="w-3 h-3 text-white" /></button>
                            <span className="text-white text-sm">{cart[p.id].qty}</span>
                            <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center hover:bg-cyan-500"><Plus className="w-3 h-3 text-white" /></button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-medium transition-colors">
                            <ShoppingCart className="w-3.5 h-3.5" /> {t('marketplace.add')}
                          </button>
                        )}
                        {p.seller_whatsapp && (
                          <a
                            href={`https://wa.me/${p.seller_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I'm interested in " + p.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 text-[10px] font-medium text-white transition-colors"
                            title={t('marketplace.contactSellerWhatsapp')}
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {cartItems.length > 0 && !showCheckoutForm && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
              className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-4 shadow-xl z-50"
            >
              <h3 className="text-white font-semibold mb-2">{t('marketplace.cart', { count: cartItems.length })}</h3>
              {cartItems.map((i) => (
                <div key={i.product.id} className="flex justify-between text-sm text-gray-300 py-1">
                  <span>{i.product.name} x{i.qty}</span>
                  <span>${(parseFloat(i.product.price) * i.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-white/10 my-2 pt-2 flex justify-between text-white font-bold">
                <span>{t('marketplace.total')}</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setShowCheckoutForm(true)} className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
                {t('marketplace.proceedToCheckout')}
              </button>
              {checkoutMsg && <p className="text-xs text-center mt-1 text-green-400">{checkoutMsg}</p>}
            </motion.div>
          )}
        </>
      )}

      {view === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t('marketplace.noOrders')}</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{t('marketplace.orderNumber', { id: o.id })}</p>
                    <p className="text-xs text-gray-400">{o.customer_name} | {o.created_at ? new Date(o.created_at).toLocaleDateString() : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-bold">${parseFloat(o.total).toFixed(2)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      o.status === "delivered" ? "bg-green-500/20 text-green-400" :
                      o.status === "shipped" ? "bg-blue-500/20 text-blue-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>{o.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showCheckoutForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCheckoutForm(false)}
        >
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-1">{t('marketplace.customerInfo')}</h2>
            <p className="text-sm text-gray-400 mb-5">{t('marketplace.confirmDetails')}</p>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1"><User className="w-3.5 h-3.5" /> {t('marketplace.fullName')}</label>
                <input value={customer.name} onChange={(e) => { setCustomer({ ...customer, name: e.target.value }); setFormErrors({ ...formErrors, name: "" }); }}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border ${formErrors.name ? "border-red-500" : "border-white/10"} text-white focus:outline-none focus:border-cyan-500/50`} />
                {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1"><Mail className="w-3.5 h-3.5" /> {t('marketplace.email')}</label>
                <input value={customer.email} onChange={(e) => { setCustomer({ ...customer, email: e.target.value }); setFormErrors({ ...formErrors, email: "" }); }}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border ${formErrors.email ? "border-red-500" : "border-white/10"} text-white focus:outline-none focus:border-cyan-500/50`} />
                {formErrors.email && <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1"><Phone className="w-3.5 h-3.5" /> {t('marketplace.phone')}</label>
                <input value={customer.phone} onChange={(e) => { setCustomer({ ...customer, phone: e.target.value }); setFormErrors({ ...formErrors, phone: "" }); }}
                  placeholder="+1234567890"
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border ${formErrors.phone ? "border-red-500" : "border-white/10"} text-white focus:outline-none focus:border-cyan-500/50`} />
                {formErrors.phone && <p className="text-xs text-red-400 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1"><MapPin className="w-3.5 h-3.5" /> {t('marketplace.deliveryAddress')}</label>
                <textarea value={customer.address} onChange={(e) => { setCustomer({ ...customer, address: e.target.value }); setFormErrors({ ...formErrors, address: "" }); }}
                  rows={3} placeholder={t('marketplace.addressPlaceholder')}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border ${formErrors.address ? "border-red-500" : "border-white/10"} text-white focus:outline-none focus:border-cyan-500/50`} />
                {formErrors.address && <p className="text-xs text-red-400 mt-1">{formErrors.address}</p>}
              </div>

              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('marketplace.cartTotal')}</p>
                  <p className="text-xl font-bold text-cyan-400">${cartTotal.toFixed(2)}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCheckoutForm(false)} className="px-5 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all">{t('marketplace.cancel')}</button>
                  <button onClick={handleCheckout} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
                    {t('marketplace.placeOrder')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {selectedProduct && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="w-full max-w-2xl rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-white">{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                {(() => {
                  const imgs = selectedProduct.image_urls && selectedProduct.image_urls.length > 0
                    ? selectedProduct.image_urls
                    : selectedProduct.image_url ? [selectedProduct.image_url] : [];
                  if (imgs.length === 0) return <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center"><ImageOff className="w-12 h-12 text-gray-500" /></div>;
                  return (
                    <div>
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/5 mb-2">
                        <img src={imgs[productImageIndex]} alt={selectedProduct.name} className="w-full h-full object-contain" />
                      </div>
                      {imgs.length > 1 && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setProductImageIndex((prev) => (prev - 1 + imgs.length) % imgs.length)} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"><ChevronLeft className="w-4 h-4" /></button>
                          <div className="flex gap-1 flex-1 justify-center">
                            {imgs.map((img, idx) => (
                              <button key={idx} onClick={() => setProductImageIndex(idx)}
                                className={`w-2 h-2 rounded-full ${idx === productImageIndex ? "bg-cyan-400" : "bg-white/20"} transition-colors`} />
                            ))}
                          </div>
                          <button onClick={() => setProductImageIndex((prev) => (prev + 1) % imgs.length)} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="w-full md:w-1/2 space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('marketplace.store')}</p>
                  <p className="text-white font-medium">{selectedProduct.store_name}</p>
                  {selectedProduct.seller_whatsapp && (
                    <a
                      href={`https://wa.me/${selectedProduct.seller_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I'm interested in " + selectedProduct.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-xs font-medium text-white transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> {t('marketplace.contactWhatsapp')}
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('marketplace.price')}</p>
                  <p className="text-2xl font-bold text-cyan-400">${parseFloat(selectedProduct.price).toFixed(2)}</p>
                </div>
                {selectedProduct.category && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{t('marketplace.category')}</p>
                    <span className="inline-block px-3 py-1 rounded-full text-xs bg-cyan-500/20 text-cyan-300">{selectedProduct.category}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('marketplace.description')}</p>
                  <div className="text-sm text-gray-300 leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedProduct.description ? DOMPurify.sanitize(selectedProduct.description) : t('marketplace.noDescription') }} />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  {cart[selectedProduct.id] ? (
                    <div className="flex items-center gap-3">
                      <button onClick={() => removeFromCart(selectedProduct.id)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><Minus className="w-4 h-4 text-white" /></button>
                      <span className="text-white font-medium text-lg">{cart[selectedProduct.id].qty}</span>
                      <button onClick={() => addToCart(selectedProduct)} className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center hover:bg-cyan-500"><Plus className="w-4 h-4 text-white" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
                      <ShoppingCart className="w-4 h-4" /> {t('marketplace.addToCart')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default MarketplacePage;
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
