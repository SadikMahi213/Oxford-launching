import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Store, Package, DollarSign, Plus, Trash2, Coins, Check, X, ChevronLeft, ChevronRight, User, Phone, MapPin, Globe, Image, FileText, Send, AlertCircle, MessageCircle, TrendingUp, Clock, PlusCircle } from "lucide-react";
import RichTextEditor from "../common/RichTextEditor.jsx";
import {
  registerSeller, getSellerProfile, updateSellerProfile,
  getMyProducts, createProduct, deleteProduct, updateProduct,
  getSellerOrders, getEcommerceWallet, transferToEcommerce,
  sellerSubmitForReview, getSellerProfileCompletion,
  uploadProductImage, uploadSellerImage, getMyStores, deleteStore,
} from "../../api/ecommerce.api.js";
import {
  getVendorDashboard, getVendorEarnings, getVendorWithdraws,
  requestVendorWithdraw, marketplaceCreateProduct,
  marketplaceUpdateProduct, getVendorProducts,
} from "../../api/marketplace.api.js";
import useUserStore from "../../store/userStore.js";
import SellerOrdersPanel from "./SellerOrdersPanel.jsx";

const STEPS = [
  { id: "basic", label: "Basic Info", icon: User },
  { id: "store", label: "Store", icon: Store },
  { id: "identity", label: "Identity", icon: FileText },
  { id: "address", label: "Address", icon: MapPin },
  { id: "social", label: "Social Links", icon: Globe },
];

const SellerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const [tab, setTab] = useState("overview");
  const [seller, setSeller] = useState(null);
  const [allStores, setAllStores] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState({ ecommerce_wallet: 0, main_wallet: 0 });
const [vendorDash, setVendorDash] = useState(null);

  const [registerName, setRegisterName] = useState("");
  const [registerDesc, setRegisterDesc] = useState("");
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", description: "", image_urls: [], category: "", arbx_allocated: 0, sku: "", stock_quantity: 0, discount_price: "" });
  const [editProduct, setEditProduct] = useState(null);
  const [editProductData, setEditProductData] = useState({ name: "", price: "", description: "", image_urls: [], category: "", sku: "", stock_quantity: 0, discount_price: "" });
  const [productImageUrlInput, setProductImageUrlInput] = useState("");
  const [productUploading, setProductUploading] = useState(false);
  const [productImageDragIdx, setProductImageDragIdx] = useState(null);
  const [uploadingField, setUploadingField] = useState(null);
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
  const [storeToDelete, setStoreToDelete] = useState(null);

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
        const [walletRes, dashRes] = await Promise.all([
          getEcommerceWallet(),
          getVendorDashboard().catch(() => ({ data: {} })),
        ]);
        setVendorDash(dashRes.data || null);
        setWallet(walletRes.data);
        const [prodRes, ordRes] = await Promise.all([
          getVendorProducts().catch(() => ({ data: { products: [] } })),
          getSellerOrders(sid),
        ]);
        const pdata = prodRes.data?.products || prodRes.data?.data || [];
        setProducts(Array.isArray(pdata) ? pdata : []);
        setOrders(ordRes.data?.orders || []);
      }
    } catch { /* not a seller yet */ }
  };

  const handleDeleteStore = async (storeId) => {
    try {
      await deleteStore(storeId);
      setStoreToDelete(null);
      const storesRes = await getMyStores();
      const stores = storesRes.data?.stores || [];
      setAllStores(stores);
      if (stores.length === 0) {
        setSeller(null);
        setActiveStoreId(null);
        setProducts([]);
        setOrders([]);
      } else if (activeStoreId === storeId) {
        switchStore(stores[0].id);
      }
      setMsg(t('seller.storeDeleted'));
    } catch (err) {
      setMsg(err?.response?.data?.detail || t('seller.deleteStoreFailed'));
    }
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
      setMsg(t('seller.storeCreated', { status: res.data.status }));
      setShowCreateStore(false);
      setRegisterName("");
      setRegisterDesc("");
      loadData();
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const res = await updateSellerProfile(profile, activeStoreId);
      setCompletion(res.data.profile_completion);
      setMsg(t('seller.profileSaved', { percent: res.data.profile_completion }));
      loadData(activeStoreId);
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
    }
  };

  const handleSubmitForReview = async () => {
    try {
      const res = await sellerSubmitForReview(activeStoreId);
      setMsg(t('seller.submittedForReview'));
      setSeller(prev => ({ ...prev, status: "pending_review" }));
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    try {
      const payload = {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        description: newProduct.description,
        category: newProduct.category,
        sku: newProduct.sku || undefined,
        stock_quantity: parseInt(newProduct.stock_quantity) || 0,
        discount_price: newProduct.discount_price ? parseFloat(newProduct.discount_price) : undefined,
        image_urls: newProduct.image_urls.length ? newProduct.image_urls : undefined,
      };
      await marketplaceCreateProduct(payload);
      setNewProduct({ name: "", price: "", description: "", image_urls: [], category: "", arbx_allocated: 0, sku: "", stock_quantity: 0, discount_price: "" });
      setMsg(t('seller.productAdded'));
      loadData(activeStoreId);
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
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

  const handleUploadSellerImage = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const imageType = field === "store_logo_key" ? "logo" : field === "store_banner_key" ? "banner" : field === "nid_front_image_key" ? "nid_front" : "nid_back";
      const res = await uploadSellerImage(file, imageType);
      const url = res.data?.image_url || res.data?.data?.image_url || res.data?.data?.url;
      if (url) updateProfileField(field, url);
    } catch (err) {
      setMsg(t('seller.uploadError') + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingField(null);
    }
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
      setMsg(t('seller.uploadError') + (err.response?.data?.detail || err.message));
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
      setMsg(t('seller.transferred', { amount: transferAmount }));
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
    }
  };

  const handleVendorWithdraw = async () => {
    try {
      await requestVendorWithdraw(parseFloat(vendorDash.pending_payout || 0));
      setMsg(t('seller.withdrawRequested'));
      loadData(activeStoreId);
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleProduct = async (p) => {
    try {
      await updateProduct(p.id, { is_active: !p.is_active, seller_id: activeStoreId });
      loadData(activeStoreId);
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteProduct = async (p) => {
    if (!confirm(t('seller.deleteConfirm'))) return;
    try {
      await deleteProduct(p.id, activeStoreId);
      loadData(activeStoreId);
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditProductOpen = (p) => {
    let imgs = p.image_urls || [];
    if (typeof imgs === "string") { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
    if (!Array.isArray(imgs)) imgs = [];
    setEditProduct(p);
    setEditProductData({
      name: p.name || "",
      price: p.price?.toString() || "",
      description: p.description || "",
      image_urls: imgs,
      category: p.category || "",
      sku: p.sku || "",
      stock_quantity: p.stock_quantity?.toString() || "0",
      discount_price: p.discount_price?.toString() || "",
    });
  };

  const handleEditProductClose = () => {
    setEditProduct(null);
  };

  const handleSaveProduct = async () => {
    if (!editProductData.name || !editProductData.price) return;
    try {
      await marketplaceUpdateProduct(editProduct.id, {
        name: editProductData.name,
        price: parseFloat(editProductData.price),
        description: editProductData.description,
        category: editProductData.category,
        sku: editProductData.sku || undefined,
        stock_quantity: parseInt(editProductData.stock_quantity) || 0,
        discount_price: editProductData.discount_price ? parseFloat(editProductData.discount_price) : undefined,
        image_urls: editProductData.image_urls.length ? editProductData.image_urls : undefined,
      });
      setEditProduct(null);
      setMsg(t('seller.productUpdated'));
      loadData(activeStoreId);
    } catch (err) {
      setMsg(t('seller.errorPrefix') + (err.response?.data?.detail || err.message));
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
              {t('seller.becomeASeller')}
            </span>
          </h1>
          <p className="text-sm text-gray-400">{t('seller.startStore')}</p>
        </motion.div>
        <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 max-w-lg space-y-4">
          <div>
            <label className="text-sm text-gray-400">{t('seller.storeName')}</label>
            <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder={t('seller.storeNamePlaceholder')} />

          </div>
          <div>
            <label className="text-sm text-gray-400">{t('seller.description')} <span className="text-gray-500">{t('seller.descriptionRichText')}</span></label>
            <RichTextEditor
              content={registerDesc}
              onChange={setRegisterDesc}
              placeholder={t('seller.descPlaceholder')}
              minHeight="100px"
            />
          </div>
          <button onClick={handleRegister} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
            <Store className="w-4 h-4 inline mr-2" /> {t('seller.registerAsSeller')}
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
              {t('seller.createNewStore')}
            </span>
          </h1>
          <p className="text-sm text-gray-400">{t('seller.addStore')}</p>
        </motion.div>
        <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 max-w-lg space-y-4">
          <div>
            <label className="text-sm text-gray-400">{t('seller.storeName')}</label>
            <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder={t('seller.storeNamePlaceholder2')} />
          </div>
          <div>
            <label className="text-sm text-gray-400">{t('seller.description')} <span className="text-gray-500">{t('seller.descriptionRichText')}</span></label>
            <RichTextEditor
              content={registerDesc}
              onChange={setRegisterDesc}
              placeholder={t('seller.descPlaceholder')}
              minHeight="100px"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowCreateStore(false); setRegisterName(""); setRegisterDesc(""); }} className="px-5 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all text-sm">{t('seller.cancel')}</button>
            <button onClick={handleRegister} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
              <PlusCircle className="w-4 h-4 inline mr-1" /> {t('seller.createStore')}
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
          <p className="text-sm text-gray-400">{t('seller.dashboard')}</p>
          {allStores.length > 1 && <StoreSwitcher stores={allStores} activeId={activeStoreId} onSwitch={switchStore} />}
        </motion.div>
        <div className="rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/[0.02] border border-yellow-500/30 p-8 text-center space-y-3">
          <Send className="w-12 h-12 text-yellow-400 mx-auto" />
          <h2 className="text-xl font-bold text-yellow-300">{t('seller.underReview')}</h2>
          <p className="text-gray-400 max-w-md mx-auto">{t('seller.underReviewDesc')}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            {t('seller.profileCompletion', { percent: completion })}%
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
          <p className="text-sm text-gray-400">{t('seller.dashboard')}</p>
          {allStores.length > 1 && <StoreSwitcher stores={allStores} activeId={activeStoreId} onSwitch={switchStore} />}
        </motion.div>
        <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/[0.02] border border-red-500/30 p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-red-300">{t('seller.applicationRejected')}</h2>
          {seller.rejection_reason && (
            <p className="text-gray-300 bg-red-500/10 rounded-xl px-4 py-3 max-w-md mx-auto border border-red-500/20">
              {t('seller.reason', { reason: seller.rejection_reason })}
            </p>
          )}
          <button onClick={() => { setSeller(prev => ({ ...prev, status: "draft" })); }} className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
            {t('seller.updateAndResubmit')}
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
              <p className="text-sm text-gray-400">{t('seller.completeProfile', { count: stepProgress, total: STEPS.length })}</p>
            </div>
          </div>
          {allStores.length > 1 && <StoreSwitcher stores={allStores} activeId={activeStoreId} onSwitch={switchStore} />}
        </motion.div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{t('seller.profileCompletionLabel')}</span>
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
              {t('seller.' + s.id)}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 max-w-2xl space-y-4">
          {profileStep === 0 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><User className="w-4 h-4 text-purple-400" /> {t('seller.basicInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.fullName')}</label>
                  <input value={user?.full_name || ""} disabled className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.email')}</label>
                  <input value={user?.email || ""} disabled className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.phone')}</label>
                  <input value={profile.phone} onChange={(e) => updateProfileField("phone", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder={t('seller.phonePlaceholder')} />
                </div>
              </div>
            </>
          )}

          {profileStep === 1 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><Store className="w-4 h-4 text-purple-400" /> {t('seller.storeInfo')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.storeNameReq')}</label>
                  <input value={profile.store_name} onChange={(e) => updateProfileField("store_name", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder={t('seller.storeNamePlaceholder3')} />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.descriptionReq')} <span className="text-gray-500">{t('seller.descriptionRichText')}</span></label>
                  <RichTextEditor
                    content={profile.description}
                    onChange={(html) => updateProfileField("description", html)}
                    placeholder={t('seller.descriptionPlaceholder')}
                    minHeight="100px"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">{t('seller.whatsappNumber')}</label>
                    <input value={profile.whatsapp_number} onChange={(e) => updateProfileField("whatsapp_number", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="+1234567890" />
                    <p className="text-[10px] text-gray-500 mt-0.5">{t('seller.whatsappHint')}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">{t('seller.storeLogo')}</label>
                    <div className="flex gap-2 mt-1">
                      <input value={profile.store_logo_key} onChange={(e) => updateProfileField("store_logo_key", e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder={t('seller.pasteUrlOrUpload')} />
                      <label className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all ${uploadingField === "store_logo_key" ? "bg-purple-500/50 text-white animate-pulse" : "bg-purple-600 hover:bg-purple-500 text-white"}`}>
                        {uploadingField === "store_logo_key" ? "..." : <><Image className="w-3.5 h-3.5" /> {t('seller.upload')}</>}
                        <input type="file" accept="image/*" onChange={(e) => handleUploadSellerImage(e, "store_logo_key")} hidden />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">{t('seller.storeBanner')}</label>
                    <div className="flex gap-2 mt-1">
                      <input value={profile.store_banner_key} onChange={(e) => updateProfileField("store_banner_key", e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder={t('seller.pasteUrlOrUpload')} />
                      <label className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all ${uploadingField === "store_banner_key" ? "bg-purple-500/50 text-white animate-pulse" : "bg-purple-600 hover:bg-purple-500 text-white"}`}>
                        {uploadingField === "store_banner_key" ? "..." : <><Image className="w-3.5 h-3.5" /> {t('seller.upload')}</>}
                        <input type="file" accept="image/*" onChange={(e) => handleUploadSellerImage(e, "store_banner_key")} hidden />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {profileStep === 2 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-purple-400" /> {t('seller.identityInfo')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.nidPassport')}</label>
                  <input value={profile.nid_number} onChange={(e) => updateProfileField("nid_number", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder={t('seller.nidPlaceholder')} />
                </div>                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">{t('seller.nidFront')}</label>
                    <div className="flex gap-2 mt-1">
                      <input value={profile.nid_front_image_key} onChange={(e) => updateProfileField("nid_front_image_key", e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder={t('seller.pasteUrlOrUpload')} />
                      <label className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all ${uploadingField === "nid_front_image_key" ? "bg-purple-500/50 text-white animate-pulse" : "bg-purple-600 hover:bg-purple-500 text-white"}`}>
                        {uploadingField === "nid_front_image_key" ? "..." : <><Image className="w-3.5 h-3.5" /> {t('seller.upload')}</>}
                        <input type="file" accept="image/*" onChange={(e) => handleUploadSellerImage(e, "nid_front_image_key")} hidden />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">{t('seller.nidBack')}</label>
                    <div className="flex gap-2 mt-1">
                      <input value={profile.nid_back_image_key} onChange={(e) => updateProfileField("nid_back_image_key", e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder={t('seller.pasteUrlOrUpload')} />
                      <label className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all ${uploadingField === "nid_back_image_key" ? "bg-purple-500/50 text-white animate-pulse" : "bg-purple-600 hover:bg-purple-500 text-white"}`}>
                        {uploadingField === "nid_back_image_key" ? "..." : <><Image className="w-3.5 h-3.5" /> {t('seller.upload')}</>}
                        <input type="file" accept="image/*" onChange={(e) => handleUploadSellerImage(e, "nid_back_image_key")} hidden />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {profileStep === 3 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-400" /> {t('seller.addressInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.country')}</label>
                  <input value={profile.country} onChange={(e) => updateProfileField("country", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder={t('seller.countryPlaceholder')} />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.divisionState')}</label>
                  <input value={profile.division_state} onChange={(e) => updateProfileField("division_state", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder={t('seller.divisionPlaceholder')} />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.districtCity')}</label>
                  <input value={profile.district_city} onChange={(e) => updateProfileField("district_city", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder={t('seller.districtPlaceholder')} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-400">{t('seller.fullAddress')}</label>
                  <textarea value={profile.full_address} onChange={(e) => updateProfileField("full_address", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" rows={2} placeholder={t('seller.addressPlaceholder')} />
                </div>
              </div>
            </>
          )}

          {profileStep === 4 && (
            <>
              <h3 className="text-white font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-purple-400" /> {t('seller.socialLinks')} <span className="text-xs text-gray-500 font-normal">{t('seller.optional')}</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.facebookUrl')}</label>
                  <input value={profile.facebook_url} onChange={(e) => updateProfileField("facebook_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.youtubeUrl')}</label>
                  <input value={profile.youtube_url} onChange={(e) => updateProfileField("youtube_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://youtube.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.tiktokUrl')}</label>
                  <input value={profile.tiktok_url} onChange={(e) => updateProfileField("tiktok_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://tiktok.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.websiteUrl')}</label>
                  <input value={profile.website_url} onChange={(e) => updateProfileField("website_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://..." />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button onClick={() => setProfileStep(Math.max(0, profileStep - 1))} disabled={profileStep === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-30 text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> {t('seller.previous')}
            </button>
            <div className="flex gap-2">
              {msg && <p className="text-xs text-green-400 self-center">{msg}</p>}
              <button onClick={handleProfileUpdate}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all text-sm"
              >
                <Check className="w-4 h-4 inline mr-1" /> {t('seller.save')}
              </button>
            </div>
            <button onClick={() => setProfileStep(Math.min(STEPS.length - 1, profileStep + 1))} disabled={profileStep === STEPS.length - 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-30 text-sm"
            >
              {t('seller.next')} <ChevronRight className="w-4 h-4" />
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
            <Send className="w-4 h-4" /> {completion >= 100 ? t('seller.submitForReview') : t('seller.submitForReview') + ' ' + t('seller.percentNeeded', { percent: completion })}
          </button>
        </div>
      </div>
    );
  }

  // ── Approved state ──
  const tabs = [
    { id: "overview", label: t('seller.overview'), icon: Store },
    { id: "products", label: t('seller.products'), icon: Package },
    { id: "orders", label: t('seller.orders'), icon: DollarSign },
    { id: "wallet", label: t('seller.wallet'), icon: Coins },
    { id: "settings", label: t('seller.settings') || "Settings", icon: FileText },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {seller?.store_name}
          </span>
        </h1>
        <p className="text-sm text-gray-400">{t('seller.dashboard')}</p>
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
            {allStores.length > 1 && (
              <Trash2
                className="w-3 h-3 ml-1 cursor-pointer text-red-400/60 hover:text-red-400"
                onClick={(e) => { e.stopPropagation(); setStoreToDelete(store.id); }}
              />
            )}
          </button>
        ))}
        <button
          onClick={() => { setShowCreateStore(true); setRegisterName(""); setRegisterDesc(""); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
        >
          <PlusCircle className="w-3 h-3" /> {t('seller.newStore')}
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
            <p className="text-sm text-gray-400">{t('seller.productsCount')}</p>
            <p className="text-2xl font-bold text-white">{products.length}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-sm text-gray-400">{t('seller.revenue')}</p>
            <p className="text-2xl font-bold text-white">${vendorDash?.revenue ? Number(vendorDash.revenue).toFixed(2) : "0.00"}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <Clock className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-sm text-gray-400">{t('seller.pendingOrders')}</p>
            <p className="text-2xl font-bold text-white">{vendorDash ? vendorDash.pending_orders : 0}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <DollarSign className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-sm text-gray-400">{t('seller.ordersCount')}</p>
            <p className="text-2xl font-bold text-white">{orders.length}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <Coins className="w-5 h-5 text-cyan-400 mb-2" />
            <p className="text-sm text-gray-400">{t('seller.ecommerceWalletBalance')}</p>
            <p className="text-2xl font-bold text-white">${parseFloat(wallet.ecommerce_wallet).toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <MessageCircle className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-sm text-gray-400">{t('seller.whatsapp')}</p>
            <p className="text-sm font-bold text-white truncate">{seller?.whatsapp_number || t('seller.notSet')}</p>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 space-y-3">
            <h3 className="text-white font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> {t('seller.addProduct')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder={t('seller.productName')} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder={t('seller.price')} type="number" step="0.01" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} placeholder={t('seller.category')} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder={t('seller.sku')} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.stock_quantity} onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })} placeholder={t('seller.stockQuantity')} type="number" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.discount_price} onChange={(e) => setNewProduct({ ...newProduct, discount_price: e.target.value })} placeholder={t('seller.discountPrice')} type="number" step="0.01" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <input value={newProduct.arbx_allocated} onChange={(e) => setNewProduct({ ...newProduct, arbx_allocated: e.target.value })} placeholder={t('seller.ofaAllocated')} type="number" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-gray-400">
              <span>{t('seller.category')}</span><span>{t('seller.sku')}</span><span>{t('seller.stock')}</span><span>{t('seller.discountPrice')}</span>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('seller.productImages')}</label>
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
                  placeholder={t('seller.pasteImageUrl')} className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImageUrl(); } }} />
                <button onClick={handleAddImageUrl} className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"><Plus className="w-3.5 h-3.5" /></button>
                <label className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white cursor-pointer flex items-center gap-1">
                  {productUploading ? <span className="animate-pulse">...</span> : <><Image className="w-3.5 h-3.5" /> {t('seller.upload')}</>}
                  <input type="file" accept="image/*" onChange={handleUploadProductImage} hidden />
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">{t('seller.productDesc')} <span className="text-gray-500">{t('seller.descriptionRichText')}</span></label>
              <RichTextEditor
                content={newProduct.description}
                onChange={(html) => setNewProduct({ ...newProduct, description: html })}
                placeholder={t('seller.productDescPlaceholder')}
                minHeight="120px"
              />
            </div>
            <button onClick={handleAddProduct} className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all"><Plus className="w-4 h-4 inline mr-1" /> {t('seller.addProduct')}</button>
          </div>

          <div className="space-y-2">
            {products.length === 0 ? (
              <p className="text-gray-400 text-center py-4">{t('seller.noProducts')}</p>
            ) : (
              products.map((p) => (
                <div key={p.id} className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">${Number(p.price || 0).toFixed(2)} | {t('seller.sku')}: {p.sku || "—"} | {t('seller.stock')}: {p.stock_quantity ?? "—"} | {p.is_active ? t('seller.active') : t('seller.inactive')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditProductOpen(p)} className="px-3 py-1 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                      {t('seller.edit') || "Edit"}
                    </button>
                    <button onClick={() => handleToggleProduct(p)} className={`px-3 py-1 rounded-lg text-xs font-medium ${p.is_active ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                      {p.is_active ? t('seller.deactivate') : t('seller.activate')}
                    </button>
                    <button onClick={() => handleDeleteProduct(p)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleEditProductClose}>
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-cyan-400" /> {t('seller.edit')}: {editProduct.name}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={editProductData.name} onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })} placeholder={t('seller.productName')} className="col-span-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
                <input value={editProductData.price} onChange={(e) => setEditProductData({ ...editProductData, price: e.target.value })} placeholder={t('seller.price')} type="number" step="0.01" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
                <input value={editProductData.category} onChange={(e) => setEditProductData({ ...editProductData, category: e.target.value })} placeholder={t('seller.category')} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
                <input value={editProductData.sku} onChange={(e) => setEditProductData({ ...editProductData, sku: e.target.value })} placeholder={t('seller.sku')} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
                <input value={editProductData.stock_quantity} onChange={(e) => setEditProductData({ ...editProductData, stock_quantity: e.target.value })} placeholder={t('seller.stockQty')} type="number" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
                <input value={editProductData.discount_price} onChange={(e) => setEditProductData({ ...editProductData, discount_price: e.target.value })} placeholder={t('seller.discountPrice')} type="number" step="0.01" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{t('seller.productImages')}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editProductData.image_urls.map((url, idx) => (
                    <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                      <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      <button onClick={() => setEditProductData({ ...editProductData, image_urls: editProductData.image_urls.filter((_, i) => i !== idx) })} className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/70 rounded-full"><X className="w-3 h-3 text-white" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={productImageUrlInput} onChange={(e) => setProductImageUrlInput(e.target.value)}
                    placeholder={t('seller.pasteImageUrl')} className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const url = productImageUrlInput.trim(); if (url) { setEditProductData({ ...editProductData, image_urls: [...editProductData.image_urls, url] }); setProductImageUrlInput(""); } } }} />
                  <button onClick={() => { const url = productImageUrlInput.trim(); if (url) { setEditProductData({ ...editProductData, image_urls: [...editProductData.image_urls, url] }); setProductImageUrlInput(""); } }} className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white"><Plus className="w-3.5 h-3.5" /></button>
                  <label className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white cursor-pointer flex items-center gap-1">
                    {productUploading ? <span className="animate-pulse">...</span> : <><Image className="w-3.5 h-3.5" /> {t('seller.upload')}</>}
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setProductUploading(true);
                      try {
                        const res = await uploadProductImage(file);
                        const url = res.data?.url || res.data?.image_url || res.data?.data?.url;
                        if (url) setEditProductData({ ...editProductData, image_urls: [...editProductData.image_urls, url] });
                      } catch (err) {
                        setMsg(t('seller.uploadError') + (err.response?.data?.detail || err.message));
                      } finally {
                        setProductUploading(false);
                      }
                    }} hidden />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">{t('seller.productDesc')}</label>
                <RichTextEditor
                  content={editProductData.description}
                  onChange={(html) => setEditProductData({ ...editProductData, description: html })}
                  placeholder={t('seller.productDescPlaceholder')}
                  minHeight="100px"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleEditProductClose} className="flex-1 px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all text-sm">{t('seller.cancel')}</button>
                <button onClick={handleSaveProduct} className="flex-[2] px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all"><Check className="w-4 h-4 inline mr-1" /> {t('seller.saveChanges')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "orders" && <SellerOrdersPanel />}

      {tab === "settings" && (
        <div className="space-y-4 max-w-3xl">
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-purple-400" /> {t('seller.storeSettings')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400">{t('seller.storeName')}</label>
                <input value={profile.store_name} onChange={(e) => updateProfileField("store_name", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-400">{t('seller.phone')}</label>
                <input value={profile.phone} onChange={(e) => updateProfileField("phone", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-400">{t('seller.whatsappNumber')}</label>
                <input value={profile.whatsapp_number} onChange={(e) => updateProfileField("whatsapp_number", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="+1234567890" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400">{t('seller.description')}</label>
                <RichTextEditor
                  content={profile.description}
                  onChange={(html) => updateProfileField("description", html)}
                  placeholder={t('seller.storeDescPlaceholder')}
                  minHeight="100px"
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h4 className="text-sm text-gray-400 font-medium mb-3">{t('seller.identity')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.nidPassport')}</label>
                  <input value={profile.nid_number} onChange={(e) => updateProfileField("nid_number", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.nidFront')}</label>
                  <input value={profile.nid_front_image_key} onChange={(e) => updateProfileField("nid_front_image_key", e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.nidBack')}</label>
                  <input value={profile.nid_back_image_key} onChange={(e) => updateProfileField("nid_back_image_key", e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h4 className="text-sm text-gray-400 font-medium mb-3">{t('seller.address')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.country')}</label>
                  <input value={profile.country} onChange={(e) => updateProfileField("country", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.divisionState')}</label>
                  <input value={profile.division_state} onChange={(e) => updateProfileField("division_state", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.districtCity')}</label>
                  <input value={profile.district_city} onChange={(e) => updateProfileField("district_city", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-gray-400">{t('seller.fullAddress')}</label>
                  <textarea value={profile.full_address} onChange={(e) => updateProfileField("full_address", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" rows={2} />
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h4 className="text-sm text-gray-400 font-medium mb-3">{t('seller.delivery')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.defaultDeliveryCharge')}</label>
                  <input value={profile.default_delivery_charge ?? ""} onChange={(e) => updateProfileField("default_delivery_charge", e.target.value === "" ? null : parseFloat(e.target.value) || 0)} type="number" step="0.01" className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="0.00" />
                  <p className="text-[10px] text-gray-500 mt-1">{t('seller.deliveryHint')}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h4 className="text-sm text-gray-400 font-medium mb-3">{t('seller.socialLinks')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">{t('seller.facebook')}</label>
                  <input value={profile.facebook_url} onChange={(e) => updateProfileField("facebook_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.youtube')}</label>
                  <input value={profile.youtube_url} onChange={(e) => updateProfileField("youtube_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://youtube.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.tiktok')}</label>
                  <input value={profile.tiktok_url} onChange={(e) => updateProfileField("tiktok_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://tiktok.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400">{t('seller.website')}</label>
                  <input value={profile.website_url} onChange={(e) => updateProfileField("website_url", e.target.value)} className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50" placeholder="https://..." />
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center gap-3">
              <button onClick={handleProfileUpdate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all">
                <Check className="w-4 h-4 inline mr-1" /> {t('seller.saveSettings')}
              </button>
              {msg && <p className="text-sm text-green-400">{msg}</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "wallet" && (
        <div className="space-y-4 max-w-lg">
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
            <p className="text-sm text-gray-400">{t('seller.ecommerceWalletBalance')}</p>
            <p className="text-3xl font-bold text-cyan-400">${parseFloat(wallet.ecommerce_wallet).toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 space-y-3">
            <h3 className="text-white font-semibold">{t('seller.transferFromMain')}</h3>
            <p className="text-xs text-gray-400">{t('seller.available', { balance: parseFloat(wallet.main_wallet).toFixed(2) })}</p>
            <div className="flex gap-2">
              <input value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} type="number" step="0.01" placeholder={t('walletTransfer.amount_plh')} className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50" />
              <button onClick={handleTransfer} className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">{t('seller.transfer')}</button>
            </div>
          </div>
          {vendorDash && (
            <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 space-y-3">
              <h3 className="text-white font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('seller.vendorEarnings')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-gray-400">{t('seller.pendingPayout')}</p>
                  <p className="text-xl font-bold text-yellow-400">${parseFloat(vendorDash.pending_payout || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-gray-400">{t('seller.totalRevenue')}</p>
                  <p className="text-xl font-bold text-green-400">${parseFloat(vendorDash.revenue || 0).toFixed(2)}</p>
                </div>
              </div>
              <button onClick={handleVendorWithdraw} className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> {t('seller.requestWithdraw')}
              </button>
            </div>
          )}
        </div>
      )}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setStoreToDelete(null)}>
          <div className="rounded-2xl bg-[#0f0b2e] border border-white/10 p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-bold text-white">{t('seller.deleteStore')}</h3>
            </div>
            <p className="text-sm text-gray-400">{t('seller.deleteStoreConfirm')}</p>
            <div className="flex gap-3">
              <button onClick={() => setStoreToDelete(null)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all">{t('seller.cancel')}</button>
              <button onClick={() => handleDeleteStore(storeToDelete)} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium hover:from-red-500 hover:to-rose-500 transition-all">{t('seller.delete')}</button>
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
          {stores.length > 1 && (
            <Trash2
              className="w-3 h-3 ml-1 cursor-pointer text-red-400/60 hover:text-red-400"
              onClick={(e) => { e.stopPropagation(); setStoreToDelete(store.id); }}
            />
          )}
      </button>
    ))}
  </div>
);

export default SellerDashboard;
