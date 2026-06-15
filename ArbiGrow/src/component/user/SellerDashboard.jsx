import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Store, Package, DollarSign, Plus, Trash2, Coins, Check, X, ChevronLeft, ChevronRight, User, Phone, MapPin, Globe, Image, FileText, Send, AlertCircle, MessageCircle, PlusCircle } from "lucide-react";
import {
  registerSeller, getSellerProfile, updateSellerProfile,
  getMyProducts, createProduct, deleteProduct, updateProduct,
  getSellerOrders, getEcommerceWallet, transferToEcommerce,
  sellerSubmitForReview, getSellerProfileCompletion,
  uploadProductImage, getMyStores,
} from "../../api/ecommerce.api.js";
import useUserStore from "../../store/userStore.js";

const STEPS = [
  { id: "basic", label: "Basic Info", icon: User },
  { id: "store", label: "Store", icon: Store },
  { id: "identity", label: "Identity", icon: FileText },
  { id: "address", label: "Address", icon: MapPin },
  { id: "social", label: "Social Links", icon: Globe },
];

const SellerDashboard = () => {
  const { user } = useUserStore();
  const [tab, setTab] = useState("overview");
  const [seller, setSeller] = useState(null);
  const [allStores, setAllStores] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState({ ecommerce_wallet: 0, main_wallet: 0 });

  const [registerName, setRegisterName] = useState("");
  const [registerDesc, setRegisterDesc] = useState("");
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", description: "", image_urls: [], category: "", arbx_allocated: 0 });
  const [productImageUrlInput, setProductImageUrlInput] = useState("");
  const [productUploading, setProductUploading] = useState(false);
  const [productImageDragIdx, setProductImageDragIdx] = useState(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [msg, setMsg] = useState("");

  const [profileStep, setProfileStep] = useState(0);
  const [profile, setProfile] = useState({
    store_name: "", description: "", phone: "", whatsapp_number: "",
    nid_number: "", nid_front_image_key: "", nid_back_image_key: "",
    country: "", division_state: "", district_city: "", full_address: "",
    store_logo_key: "", store_banner_key: "",
    facebook_url: "", youtube_url: "", tiktok_url: "", website_url: "",
  });
  const [completion, setCompletion] = useState(0);
  const [viewingStore, setViewingStore] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (storeId) => {
    try {
      const storesRes = await getMyStores();
      const stores = storesRes.data?.stores || [];
      setAllStores(stores);

      const sid = storeId || activeStoreId || stores[0]?.id;
      if (!sid && stores.length === 0) return;
      setActiveStoreId(sid);

      const profileRes = await getSellerProfile(sid);
      const profile = profileRes.data;
      setSeller(profile);
      setRegisterName(profile.store_name);
      setRegisterDesc(profile.description || "");
      setProfile(prev => ({
        ...prev,
        store_name: profile.store_name || "",
        description: profile.description || "",
        phone: profile.phone || "",
        whatsapp_number: profile.whatsapp_number || "",
        nid_number: profile.nid_number || "",
        nid_front_image_key: profile.nid_front_image_key || "",
        nid_back_image_key: profile.nid_back_image_key || "",
        country: profile.country || "",
        division_state: profile.division_state || "",
        district_city: profile.district_city || "",
        full_address: profile.full_address || "",
        store_logo_key: profile.store_logo_key || "",
        store_banner_key: profile.store_banner_key || "",
        facebook_url: profile.facebook_url || "",
        youtube_url: profile.youtube_url || "",
        tiktok_url: profile.tiktok_url || "",
        website_url: profile.website_url || "",
      }));
      setCompletion(profile.profile_completion || 0);
      if (profile.status === "approved") {
        const [walletRes] = await Promise.all([
          getEcommerceWallet(),
        ]);
        setWallet(walletRes.data);
        const [prodRes, ordRes] = await Promise.all([
          getMyProducts(sid), getSellerOrders(sid),
        ]);
        setProducts(prodRes.data?.products || []);
        setOrders(ordRes.data?.orders || []);
      }
    } catch { /* not a seller yet */ }
  };

  const switchStore = (storeId) => {
    setActiveStoreId(storeId);
    loadData(storeId);
  };

  const refreshCompletion = async () => {
    try {
      const res = await getSellerProfileCompletion(activeStoreId);
      setCompletion(res.data.profile_completion);
    } catch {}
  };

  const handleRegister = async () => {
    if (!registerName.trim()) return;
    try {
      const res = await registerSeller(registerName, registerDesc);
      setMsg("Store created! Status: " + res.data.status);
      setShowCreateStore(false);
      setRegisterName("");
      setRegisterDesc("");
      loadData();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const res = await updateSellerProfile(profile, activeStoreId);
      setCompletion(res.data.profile_completion);
      setMsg("Profile saved! (" + res.data.profile_completion + "%)");
      loadData(activeStoreId);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleSubmitForReview = async () => {
    try {
      const res = await sellerSubmitForReview(activeStoreId);
      setMsg("Submitted for review!");
      setSeller(prev => ({ ...prev, status: "pending_review" }));
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    try {
      await createProduct({
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        seller_id: activeStoreId,
        description: newProduct.description,
        image_urls: newProduct.image_urls.join(","),
        category: newProduct.category,
        arbx_allocated: parseFloat(newProduct.arbx_allocated || 0),
      });
      setNewProduct({ name: "", price: "", description: "", image_urls: [], category: "", arbx_allocated: 0 });
      setMsg("Product added!");
      loadData(activeStoreId);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddImageUrl = () => {
    const url = productImageUrlInput.trim();
    if (!url) return;
    setNewProduct({ ...newProduct, image_urls: [...newProduct.image_urls, url] });
    setProductImageUrlInput("");
  };

  const handleRemoveImageUrl = (idx) => {
    setNewProduct({ ...newProduct, image_urls: newProduct.image_urls.filter((_, i) => i !== idx) });
  };

  const handleMoveImageUrl = (from, to) => {
    if (to < 0 || to >= newProduct.image_urls.length) return;
    const urls = [...newProduct.image_urls];
    const [moved] = urls.splice(from, 1);
    urls.splice(to, 0, moved);
    setNewProduct({ ...newProduct, image_urls: urls });
  };

  const handleUploadProductImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductUploading(true);
    try {
      const res = await uploadProductImage(file);
      const url = res.data?.url || res.data?.image_url || res.data?.data?.url;
      if (url) setNewProduct({ ...newProduct, image_urls: [...newProduct.image_urls, url] });
    } catch (err) {
      setMsg("Upload error: " + (err.response?.data?.detail || err.message));
    } finally {
      setProductUploading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) return;
    try {
      const res = await transferToEcommerce(parseFloat(transferAmount));
      setWallet(res.data);
      setTransferAmount("");
      setMsg("Transferred $" + transferAmount);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleProduct = async (p) => {
    try {
      await updateProduct(p.id, { is_active: !p.is_active, seller_id: activeStoreId });
      loadData(activeStoreId);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteProduct = async (p) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(p.id, activeStoreId);
      loadData(activeStoreId);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  const updateProfileField = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const isStepComplete = (step) => {
    const p = profile;
    switch (step) {
      case 0: return !!(user?.full_name && user?.email && p.phone);
      case 1: return !!(p.store_name && p.description);
      case 2: return !!(p.nid_number && p.nid_front_image_key && p.nid_back_image_key);
      case 3: return !!(p.country && p.division_state && p.district_city && p.full_address);
      case 4: return true;
      default: return false;
    }
  };

  const stepProgress = STEPS.reduce((acc, _, i) => acc + (isStepComplete(i) ? 1 : 0), 0);

  // ── No stores yet — show create form ──
  if (!seller && allStores.length === 0 && !showCreateStore) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Become a Seller
            </span>
          </h1>
          <p className="text-sm text-gray-400">Start your online store on our marketplace</p>
        </motion.div>
        <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 max-w-lg space-y-4">
          <div>
            <label className="text-sm text-gray-400">Store Name</label>
            <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="My Store" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Description (optional)</label>
            <textarea value={registerDesc} onChange={(e) => setRegisterDesc(e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" rows={3} placeholder="Tell buyers about your store..." />
          </div>
          <button onClick={handleRegister} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
            <Store className="w-4 h-4 inline mr-2" /> Register as Seller
          </button>
          {msg && <p className="text-sm text-center text-green-400">{msg}</p>}
        </div>
      </div>
    );
  }

  if (showCreateStore) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Create New Store
            </span>
          </h1>
          <p className="text-sm text-gray-400">Add another store to your seller account</p>
        </motion.div>
        <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 max-w-lg space-y-4">
          <div>
            <label className="text-sm text-gray-400">Store Name</label>
            <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="My New Store" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Description (optional)</label>
            <textarea value={registerDesc} onChange={(e) => setRegisterDesc(e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" rows={3} placeholder="Tell buyers about your store..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowCreateStore(false); setRegisterName(""); setRegisterDesc(""); }} className="px-5 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all text-sm">Cancel</button>
            <button onClick={handleRegister} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
              <PlusCircle className="w-4 h-4 inline mr-1" /> Create Store
            </button>
          </div>
          {msg && <p className="text-sm text-center text-green-400">{msg}</p>}
        </div>
      </div>
    );
  }

  if (seller?.status === "pending_review") {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {seller.store_name}
            </span>
          </h1>
          <p className="text-sm text-gray-400">Seller Dashboard</p>
          {allStores.length > 1 && <StoreSwitcher stores={allStores} activeId={activeStoreId} onSwitch={switchStore} />}
        </motion.div>
        <div className="rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/[0.02] border border-yellow-500/30 p-8 text-center space-y-3">
          <Send className="w-12 h-12 text-yellow-400 mx-auto" />
          <h2 className="text-xl font-bold text-yellow-300">Under Review</h2>
          <p className="text-gray-400 max-w-md mx-auto">Your seller application has been submitted for review. Our team will review your information and get back to you soon.</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Profile completion: {completion}%
          </div>
        </div>
      </div>
    );
  }

  if (seller?.status === "rejected") {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {seller.store_name}
            </span>
          </h1>
          <p className="text-sm text-gray-400">Seller Dashboard</p>
          {allStores.length > 1 && <StoreSwitcher stores={allStores} activeId={activeStoreId} onSwitch={switchStore} />}
        </motion.div>
        <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/[0.02] border border-red-500/30 p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-red-300">Application Rejected</h2>
          {seller.rejection_reason && (
            <p className="text-gray-300 bg-red-500/10 rounded-xl px-4 py-3 max-w-md mx-auto border border-red-500/20">
              Reason: {seller.rejection_reason}
            </p>
          )}
          <button onClick={() => { setSeller(prev => ({ ...prev, status: "draft" })); }} className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
            Update Profile & Re-submit
          </button>
        </div>
      </div>
    );
  }

  if (seller?.status === "draft") {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {seller.store_name}
                </span>
              </h1>
              <p className="text-sm text-gray-400">Complete your seller profile ({stepProgress}/{STEPS.length} sections)</p>
            </div>
          </div>
          {allStores.length > 1 && <StoreSwitcher stores={allStores} activeId={activeStoreId} onSwitch={switchStore} />}
        </motion.div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Profile Completion</span>
            <span>{completion}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: completion + "%" }}
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setProfileStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                profileStep === i ? "bg-purple-600 text-white" :
                isStepComplete(i) ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-300"
              }`}
            >
              {isStepComplete(i) ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
              {s.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 max-w-2xl space-y-4">
          {profileStep === 0 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><User className="w-4 h-4 text-purple-400" /> Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Full Name</label>
                  <input value={user?.full_name || ""} disabled className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Email</label>
                  <input value={user?.email || ""} disabled className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Phone *</label>
                  <input value={profile.phone} onChange={(e) => updateProfileField("phone", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="+8801XXXXXXXXX" />
                </div>
              </div>
            </>
          )}

          {profileStep === 1 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><Store className="w-4 h-4 text-purple-400" /> Store Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">Store Name *</label>
                  <input value={profile.store_name} onChange={(e) => updateProfileField("store_name", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="My Awesome Store" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Description *</label>
                  <textarea value={profile.description} onChange={(e) => updateProfileField("description", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" rows={3} placeholder="Describe your store..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">WhatsApp Number</label>
                    <input value={profile.whatsapp_number} onChange={(e) => updateProfileField("whatsapp_number", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="+1234567890" />
                    <p className="text-[10px] text-gray-500 mt-0.5">Customers can message you on this number</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Logo URL</label>
                    <input value={profile.store_logo_key} onChange={(e) => updateProfileField("store_logo_key", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Banner URL</label>
                    <input value={profile.store_banner_key} onChange={(e) => updateProfileField("store_banner_key", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://..." />
                  </div>
                </div>
              </div>
            </>
          )}

          {profileStep === 2 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-purple-400" /> Identity Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">NID / Passport Number *</label>
                  <input value={profile.nid_number} onChange={(e) => updateProfileField("nid_number", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="NID number" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">NID Front Image URL *</label>
                    <input value={profile.nid_front_image_key} onChange={(e) => updateProfileField("nid_front_image_key", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">NID Back Image URL *</label>
                    <input value={profile.nid_back_image_key} onChange={(e) => updateProfileField("nid_back_image_key", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://..." />
                  </div>
                </div>
              </div>
            </>
          )}

          {profileStep === 3 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-400" /> Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Country *</label>
                  <input value={profile.country} onChange={(e) => updateProfileField("country", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="Bangladesh" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Division / State *</label>
                  <input value={profile.division_state} onChange={(e) => updateProfileField("division_state", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="Dhaka" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">District / City *</label>
                  <input value={profile.district_city} onChange={(e) => updateProfileField("district_city", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="Dhaka" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-400">Full Address *</label>
                  <textarea value={profile.full_address} onChange={(e) => updateProfileField("full_address", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" rows={2} placeholder="Street, area, post code..." />
                </div>
              </div>
            </>
          )}

          {profileStep === 4 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-purple-400" /> Social Links <span className="text-xs text-gray-500 font-normal">(optional)</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Facebook URL</label>
                  <input value={profile.facebook_url} onChange={(e) => updateProfileField("facebook_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">YouTube URL</label>
                  <input value={profile.youtube_url} onChange={(e) => updateProfileField("youtube_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://youtube.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">TikTok URL</label>
                  <input value={profile.tiktok_url} onChange={(e) => updateProfileField("tiktok_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://tiktok.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Website URL</label>
                  <input value={profile.website_url} onChange={(e) => updateProfileField("website_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://..." />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button onClick={() => setProfileStep(Math.max(0, profileStep - 1))} disabled={profileStep === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-30 text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex gap-2">
              {msg && <p className="text-xs text-green-400 self-center">{msg}</p>}
              <button onClick={handleProfileUpdate}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all text-sm"
              >
                <Check className="w-4 h-4 inline mr-1" /> Save
              </button>
            </div>
            <button onClick={() => setProfileStep(Math.min(STEPS.length - 1, profileStep + 1))} disabled={profileStep === STEPS.length - 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-30 text-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <button onClick={handleSubmitForReview} disabled={completion < 100}
            className={`px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              completion >= 100
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500"
                : "bg-white/10 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" /> Submit for Review {completion >= 100 ? "" : `(${completion}% needed)`}
          </button>
        </div>
      </div>
    );
  }

  // ── Approved state ──
  const tabs = [
    { id: "overview", label: "Overview", icon: Store },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: DollarSign },
    { id: "wallet", label: "Wallet", icon: Coins },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {seller?.store_name}
          </span>
        </h1>
        <p className="text-sm text-gray-400">Seller Dashboard</p>
      </motion.div>

      {/* Store Switcher + Create */}
      <div className="flex items-center gap-2 flex-wrap">
        {allStores.map((store) => (
          <button
            key={store.id}
            onClick={() => switchStore(store.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeStoreId === store.id
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-gray-400 hover:text-white hover:bg-white/20"
            }`}
          >
            <Store className="w-3 h-3" />
            {store.store_name}
          </button>
        ))}
        <button
          onClick={() => { setShowCreateStore(true); setRegisterName(""); setRegisterDesc(""); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
        >
          <PlusCircle className="w-3 h-3" /> New Store
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === t.id ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">{msg}</p>}

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <Package className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-sm text-gray-400">Products</p>
            <p className="text-2xl font-bold text-white">{products.length}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <DollarSign className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-sm text-gray-400">Orders</p>
            <p className="text-2xl font-bold text-white">{orders.length}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <Coins className="w-5 h-5 text-cyan-400 mb-2" />
            <p className="text-sm text-gray-400">Ecommerce Wallet</p>
            <p className="text-2xl font-bold text-white">${parseFloat(wallet.ecommerce_wallet).toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <MessageCircle className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-sm text-gray-400">WhatsApp</p>
            <p className="text-sm font-bold text-white truncate">{seller?.whatsapp_number || "Not set"}</p>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 space-y-3">
            <h3 className="text-white font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Product name" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="Price" type="number" step="0.01" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Category" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.arbx_allocated} onChange={(e) => setNewProduct({ ...newProduct, arbx_allocated: e.target.value })} placeholder="ARBX to allocate for promotion" type="number" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Product Images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {newProduct.image_urls.map((url, idx) => (
                  <div key={idx}
                    draggable
                    onDragStart={() => setProductImageDragIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { handleMoveImageUrl(productImageDragIdx, idx); setProductImageDragIdx(null); }}
                    className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/10 cursor-grab active:cursor-grabbing"
                  >
                    <img src={url} alt={`img ${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button onClick={() => handleMoveImageUrl(idx, idx - 1)} className="p-0.5 bg-white/20 rounded hover:bg-white/30"><ChevronLeft className="w-3 h-3 text-white" /></button>
                      <button onClick={() => handleRemoveImageUrl(idx)} className="p-0.5 bg-red-500/50 rounded hover:bg-red-500/70"><X className="w-3 h-3 text-white" /></button>
                      <button onClick={() => handleMoveImageUrl(idx, idx + 1)} className="p-0.5 bg-white/20 rounded hover:bg-white/30"><ChevronRight className="w-3 h-3 text-white" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={productImageUrlInput} onChange={(e) => setProductImageUrlInput(e.target.value)}
                  placeholder="Paste image URL" className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImageUrl(); } }} />
                <button onClick={handleAddImageUrl} className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"><Plus className="w-3.5 h-3.5" /></button>
                <label className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white cursor-pointer flex items-center gap-1">
                  {productUploading ? <span className="animate-pulse">...</span> : <><Image className="w-3.5 h-3.5" /> Upload</>}
                  <input type="file" accept="image/*" onChange={handleUploadProductImage} hidden />
                </label>
              </div>
            </div>

            <textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Description" rows={2} className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
            <button onClick={handleAddProduct} className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all"><Plus className="w-4 h-4 inline mr-1" /> Add Product</button>
          </div>

          <div className="space-y-2">
            {products.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No products yet</p>
            ) : (
              products.map((p) => (
                <div key={p.id} className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">${parseFloat(p.price).toFixed(2)} | ARBX: {parseFloat(p.arbx_allocated).toFixed(2)} | {p.is_active ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleProduct(p)} className={`px-3 py-1 rounded-lg text-xs font-medium ${p.is_active ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                      {p.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => handleDeleteProduct(p)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No orders yet</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">Order #{o.id}</p>
                  <p className="text-xs text-gray-400">{o.customer_name || "Unknown"} | {o.created_at ? new Date(o.created_at).toLocaleDateString() : ""}</p>
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
            ))
          )}
        </div>
      )}

      {tab === "wallet" && (
        <div className="space-y-4 max-w-lg">
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <p className="text-sm text-gray-400">Ecommerce Wallet Balance</p>
            <p className="text-3xl font-bold text-cyan-400">${parseFloat(wallet.ecommerce_wallet).toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 space-y-3">
            <h3 className="text-white font-semibold">Transfer from Main Wallet</h3>
            <p className="text-xs text-gray-400">Available: ${parseFloat(wallet.main_wallet).toFixed(2)}</p>
            <div className="flex gap-2">
              <input value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} type="number" step="0.01" placeholder="Amount" className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <button onClick={handleTransfer} className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Store Switcher sub-component ──
const StoreSwitcher = ({ stores, activeId, onSwitch }) => (
  <div className="flex items-center gap-2 mt-2 flex-wrap">
    {stores.map((store) => (
      <button
        key={store.id}
        onClick={() => onSwitch(store.id)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          activeId === store.id
            ? "bg-purple-600 text-white"
            : "bg-white/10 text-gray-400 hover:text-white hover:bg-white/20"
        }`}
      >
        <Store className="w-3 h-3" />
        {store.store_name}
      </button>
    ))}
  </div>
);

export default SellerDashboard;
