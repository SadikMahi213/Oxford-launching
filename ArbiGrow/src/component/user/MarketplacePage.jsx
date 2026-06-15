import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ShoppingCart, Plus, Minus, Search, User, Mail, Phone, MapPin, X, ChevronLeft, ChevronRight, ImageOff, MessageCircle } from "lucide-react";
import DOMPurify from "dompurify";
import useUserStore from "../../store/userStore";
import { listProducts, placeOrder, getMyOrders } from "../../api/ecommerce.api.js";

const MarketplacePage = () => {
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
    if (!customer.name.trim()) errors.name = "Full name is required";
    if (!customer.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.email = "Invalid email format";
    if (!customer.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(customer.phone)) errors.phone = "Invalid phone number";
    if (!customer.address.trim()) errors.address = "Delivery address is required";
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
      setCheckoutMsg("Order placed successfully! (COD)");
      setTimeout(() => setCheckoutMsg(""), 3000);
      fetchOrders();
    } catch (err) {
      setCheckoutMsg("Failed to place order: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Marketplace
          </span>
        </h1>
        <p className="text-sm text-gray-400">Browse products and place orders</p>
      </motion.div>

      <div className="flex gap-2">
        <button onClick={() => setView("shop")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${view === "shop" ? "bg-cyan-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>Shop</button>
        <button onClick={() => setView("orders")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${view === "orders" ? "bg-cyan-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
          My Orders ({orders.length})
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
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button onClick={fetchProducts} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-medium transition-colors">Search</button>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No products available yet</div>
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
                    <p className="text-sm text-gray-300">By: {p.store_name}</p>
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
                            <ShoppingCart className="w-3.5 h-3.5" /> Add
                          </button>
                        )}
                        {p.seller_whatsapp && (
                          <a
                            href={`https://wa.me/${p.seller_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I'm interested in " + p.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 text-[10px] font-medium text-white transition-colors"
                            title="Contact seller on WhatsApp"
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
              <h3 className="text-white font-semibold mb-2">Cart ({cartItems.length} items)</h3>
              {cartItems.map((i) => (
                <div key={i.product.id} className="flex justify-between text-sm text-gray-300 py-1">
                  <span>{i.product.name} x{i.qty}</span>
                  <span>${(parseFloat(i.product.price) * i.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-white/10 my-2 pt-2 flex justify-between text-white font-bold">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setShowCheckoutForm(true)} className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
                Proceed to Checkout
              </button>
              {checkoutMsg && <p className="text-xs text-center mt-1 text-green-400">{checkoutMsg}</p>}
            </motion.div>
          )}
        </>
      )}

      {view === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No orders yet</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">Order #{o.id}</p>
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
            <h2 className="text-xl font-bold text-white mb-1">Customer Information</h2>
            <p className="text-sm text-gray-400 mb-5">Please confirm your details to place the order</p>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1"><User className="w-3.5 h-3.5" /> Full Name *</label>
                <input value={customer.name} onChange={(e) => { setCustomer({ ...customer, name: e.target.value }); setFormErrors({ ...formErrors, name: "" }); }}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border ${formErrors.name ? "border-red-500" : "border-white/10"} text-white focus:outline-none focus:border-cyan-500/50`} />
                {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1"><Mail className="w-3.5 h-3.5" /> Email *</label>
                <input value={customer.email} onChange={(e) => { setCustomer({ ...customer, email: e.target.value }); setFormErrors({ ...formErrors, email: "" }); }}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border ${formErrors.email ? "border-red-500" : "border-white/10"} text-white focus:outline-none focus:border-cyan-500/50`} />
                {formErrors.email && <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1"><Phone className="w-3.5 h-3.5" /> Phone *</label>
                <input value={customer.phone} onChange={(e) => { setCustomer({ ...customer, phone: e.target.value }); setFormErrors({ ...formErrors, phone: "" }); }}
                  placeholder="+1234567890"
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border ${formErrors.phone ? "border-red-500" : "border-white/10"} text-white focus:outline-none focus:border-cyan-500/50`} />
                {formErrors.phone && <p className="text-xs text-red-400 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1"><MapPin className="w-3.5 h-3.5" /> Delivery Address *</label>
                <textarea value={customer.address} onChange={(e) => { setCustomer({ ...customer, address: e.target.value }); setFormErrors({ ...formErrors, address: "" }); }}
                  rows={3} placeholder="Street, City, Area, Postal Code"
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border ${formErrors.address ? "border-red-500" : "border-white/10"} text-white focus:outline-none focus:border-cyan-500/50`} />
                {formErrors.address && <p className="text-xs text-red-400 mt-1">{formErrors.address}</p>}
              </div>

              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Cart total</p>
                  <p className="text-xl font-bold text-cyan-400">${cartTotal.toFixed(2)}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCheckoutForm(false)} className="px-5 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all">Cancel</button>
                  <button onClick={handleCheckout} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
                    Place Order (COD)
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
                  <p className="text-sm text-gray-400 mb-1">Store</p>
                  <p className="text-white font-medium">{selectedProduct.store_name}</p>
                  {selectedProduct.seller_whatsapp && (
                    <a
                      href={`https://wa.me/${selectedProduct.seller_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I'm interested in " + selectedProduct.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-xs font-medium text-white transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Contact on WhatsApp
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Price</p>
                  <p className="text-2xl font-bold text-cyan-400">${parseFloat(selectedProduct.price).toFixed(2)}</p>
                </div>
                {selectedProduct.category && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Category</p>
                    <span className="inline-block px-3 py-1 rounded-full text-xs bg-cyan-500/20 text-cyan-300">{selectedProduct.category}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Description</p>
                  <div className="text-sm text-gray-300 leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedProduct.description ? DOMPurify.sanitize(selectedProduct.description) : "No description available" }} />
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
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
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
