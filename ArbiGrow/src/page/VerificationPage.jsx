import DOMPurify from "dompurify";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Upload,
  AlertCircle,
  FileText,
  CheckCircle,
  Image as ImageIcon,
  X,
  ChevronDown,
  Camera,
  Check,
  Car,
} from "lucide-react";
import { submitKYC, getActiveKycPackage } from "../api/kyc.api.js";
import { refreshUserStore } from "../api/user.api.js";
import { getFeeInfo } from "../api/user.api.js";
import profilePlaceholder from "../assets/banner.jpeg";
// import logo from "../assets/Arbigrow-Logo.png";
import { useNavigate } from "react-router";
import { countries } from "../constants/countries";
import useUserStore from "../store/userStore";

export default function VerificationPage({ embedded, onSuccess }) {
  const { t } = useTranslation();
  const { user, setUser } = useUserStore();
  const [idNumber, setIdNumber] = useState("");
  const [idType, setIdType] = useState("nid");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState(user?.full_name || "");

  const [country, setCountry] = useState(countries[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState("");
  const [backPreviewUrl, setBackPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [profileImageMsg, setProfileImageMsg] = useState("");
  const [kycFee, setKycFee] = useState("0");
  const [hasExistingKyc, setHasExistingKyc] = useState(false);
  const [activePackage, setActivePackage] = useState(null);
  const [transactionId, setTransactionId] = useState("");

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!frontImage) {
      setFrontPreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(frontImage);
    setFrontPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [frontImage]);

  useEffect(() => {
    if (!backImage) {
      setBackPreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(backImage);
    setBackPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [backImage]);

  useEffect(() => {
    getFeeInfo().then((res) => {
      const data = res?.data;
      if (data) {
        setKycFee(data.kyc_fee || "0");
        setHasExistingKyc(data.has_kyc || false);
        if (data.has_kyc) {
          if (data.kyc_status === "approved") {
            if (onSuccess) onSuccess();
            return;
          }
          if (data.kyc_full_name) setFullName(data.kyc_full_name);
          if (data.kyc_country) {
            const matched = countries.find((c) => c.name === data.kyc_country);
            if (matched) setCountry(matched);
          }
          if (data.kyc_phone_number) setPhoneNumber(data.kyc_phone_number.replace(/^\+\d+/, ""));
          if (data.kyc_document_type) setIdType(data.kyc_document_type);
          if (data.kyc_document_number) setIdNumber(data.kyc_document_number);
        }
      }
    }).catch(() => {});
    getActiveKycPackage().then((res) => {
      if (res?.active && res?.package) {
        setActivePackage(res.package);
      }
    }).catch(() => {});
  }, []);

  const validateImageFile = (file) => {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      return t("kycVerification.errors.invalidFileType");
    }

    if (file.size > 5 * 1024 * 1024) {
      return t("kycVerification.errors.fileTooLarge");
    }

    return null;
  };

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      c.code.toLowerCase().includes((searchQuery || "").toLowerCase()),
  );

  const handleFrontImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationError = validateImageFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      setFrontImage(file);
      setError("");
    }
  };

  const handleProfileImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationError = validateImageFile(file);
      if (validationError) { setError(validationError); return; }
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
      setProfileImageMsg("");
      setError("");
    }
  };

  const handleProfileImageUpload = async () => {
    if (!profileImageFile) return;
    setProfileImageUploading(true);
    setProfileImageMsg("");
    try {
      const token = useUserStore.getState().token;
      const formData = new FormData();
      formData.append("file", profileImageFile);
      const res = await fetch("/api/v1/user/profile-image/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t("kycVerification.errors.uploadFailed"));
      setUser({ profile_image_url: data.profile_image_url });
      setProfileImageMsg(t("kycVerification.profileImageUploaded"));
      setProfileImageFile(null);
      setProfileImagePreview("");
    } catch (err) {
      setProfileImageMsg(err.message || t("kycVerification.errors.uploadFailed"));
    } finally {
      setProfileImageUploading(false);
    }
  };

  const handleBackImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationError = validateImageFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      setBackImage(file);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError(t("kycVerification.errors.enterFullName"));
      return;
    }

    if (!idNumber.trim()) {
      setError(t("kycVerification.errors.enterIdNumber"));
      return;
    }

    if (!phoneNumber.trim()) {
      setError(t("kycVerification.errors.enterPhone"));
      return;
    }

    const phoneRegex = /^[0-9]{6,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError(t("kycVerification.errors.validPhone"));
      return;
    }

    if (!frontImage) {
      setError(t("kycVerification.errors.uploadFront"));
      return;
    }

    if (idType !== "passport" && !backImage) {
      setError(t("kycVerification.errors.uploadBack"));
      return;
    }

    if (!hasExistingKyc && activePackage && !transactionId.trim()) {
      setError(t("kycVerification.errors.enterTransactionId"));
      return;
    }

    const totalFee = parseFloat(kycFee) + (activePackage ? parseFloat(activePackage.price) : 0);
    if (!hasExistingKyc && totalFee > 0 && parseFloat(user?.deposit_wallet || 0) < totalFee) {
      setError(t("kycVerification.errors.insufficientBalance", { fee: String(totalFee), balance: user?.deposit_wallet || "0" }));
      return;
    }

    const formData = new FormData();
    formData.append("full_name", fullName.trim());
    formData.append("country", country.name);
    formData.append("phone_number", `${country.dialCode}${phoneNumber}`);

    formData.append("document_type", idType);
    formData.append("document_number", idNumber);
    formData.append("front_image", frontImage);

    if (idType !== "passport" && backImage) {
      formData.append("back_image", backImage);
    }

    if (activePackage) {
      formData.append("kyc_package_id", activePackage.id);
    }
    if (transactionId.trim()) {
      formData.append("transaction_id", transactionId.trim());
    }

    setIsSubmitting(true);

    try {
      const response = await submitKYC(formData);

      const kycMessage = response?.data?.message || "";
      const kycSucceeded =
        kycMessage === "KYC submitted successfully" ||
        kycMessage === "KYC resubmitted successfully";

      if (kycSucceeded) {
        try {
          const meRes = await refreshUserStore();
          if (meRes?.data?.user) {
            setUser({ ...meRes.data.user, kyc_status: meRes.data.kyc_status, doc_submitted: meRes.data.doc_submitted, kyc_note: meRes.data.kyc_note });
          }
        } catch (_) {}
        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/verification-pending");
        }
      }
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        setError(t("kycVerification.errors.unauthorized"));
      } else if (err.response?.status === 400) {
        setError(err.response.data?.detail || t("kycVerification.errors.badRequest"));
      } else if (err.response?.status === 422) {
        const messages = err.response.data?.detail
          ?.map((d) => d.msg)
          .join(", ");
        setError(messages || t("kycVerification.errors.validationError"));
      } else {
        setError(t("kycVerification.errors.submissionFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-gradient-to-b from-[#060913] via-[#080b1f] to-[#060913] text-white ${embedded ? "p-4 md:p-6 rounded-2xl" : "flex items-center justify-center px-3 sm:px-4 md:px-6 py-8 md:py-12"} relative overflow-hidden`}>
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/4 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/4 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-[400px] h-[400px] bg-blue-600/4 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative max-w-2xl w-full"
      >
        {/* Card */}
        <div className="relative p-5 sm:p-8 md:p-12 rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-2xl">
          {/* Glow effect */}
          <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-6"
              >
                <ShieldCheck className="w-10 h-10 text-blue-400" />
              </motion.div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {t("kycVerification.title")}
                </span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                {t("kycVerification.subtitle")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t("kycVerification.profileImage")} <span className="text-gray-500">{t("kycVerification.optional")}</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${profilePlaceholder})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="" className="w-full h-full object-cover" />
                    ) : user?.profile_image_url ? (
                      <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-white/60" />
                    )}
                  </div>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleProfileImageChange}
                    className="hidden"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => profileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                    >
                      {t("kycVerification.chooseFile")}
                    </button>
                    {profileImageFile && (
                      <button
                        type="button"
                        onClick={handleProfileImageUpload}
                        disabled={profileImageUploading}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                      >
                        {profileImageUploading ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        {profileImageUploading ? t("kycVerification.uploading") : t("kycVerification.upload")}
                      </button>
                    )}
                  </div>
                </div>
                {profileImageMsg && (
                  <p className={`mt-2 text-xs ${profileImageMsg.includes("uploaded") ? "text-green-400" : "text-red-400"}`}>
                    {profileImageMsg}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t("kycVerification.fullName")} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setError("");
                  }}
                  placeholder={t("kycVerification.enterFullName")}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
                />
              </div>

              {/* Country Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t("kycVerification.countryOfIssue")}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIsCountryDropdownOpen(!isCountryDropdownOpen)
                    }
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white flex items-center justify-between hover:bg-white/10 focus:outline-none focus:border-cyan-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <span>{country.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isCountryDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Dropdown */}
                  {isCountryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-50 w-full mt-2 p-2 max-h-60 sm:max-h-64 bg-[#0a0e27] border border-white/10 rounded-xl shadow-2xl overflow-y-auto backdrop-blur-2xl"
                    >
                      {/* Search */}
                      <div className="p-2 mb-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t("kycVerification.searchCountries")}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      {/* Country List */}
                      <div className="space-y-1">
                        {filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setCountry(c);
                              setIsCountryDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className="w-full px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-3 text-left"
                          >
                            <span className="text-xl">{c.flag}</span>
                            <span className="text-sm">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t("kycVerification.phoneNumber")}
                </label>

                <div className="flex items-center gap-2">
                  {/* Country Code */}
                  <div className="px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-gray-300 min-w-[90px] text-center">
                    {country.dialCode}
                  </div>

                  {/* Phone Input */}
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      // allow only digits
                      const value = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(value);
                      setError("");
                    }}
                    placeholder={t("kycVerification.enterPhone")}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
                  />
                </div>
              </div>

              {/* ID Type Selection */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setIdType("nid")}
                  className={`relative p-4 rounded-xl border transition-all duration-300 ${
                    idType === "nid"
                      ? "bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <FileText
                    className={`w-6 h-6 mx-auto mb-2 ${idType === "nid" ? "text-blue-400" : "text-gray-400"}`}
                  />
                  <div
                    className={`text-sm font-semibold ${idType === "nid" ? "text-white" : "text-gray-400"}`}
                  >
                    {t("kycVerification.nationalId")}
                  </div>
                  {idType === "nid" && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-xl border-2 border-blue-400"
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIdType("passport")}
                  className={`relative p-4 rounded-xl border transition-all duration-300 ${
                    idType === "passport"
                      ? "bg-cyan-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Upload
                    className={`w-6 h-6 mx-auto mb-2 ${idType === "passport" ? "text-cyan-400" : "text-gray-400"}`}
                  />
                  <div
                    className={`text-sm font-semibold ${idType === "passport" ? "text-white" : "text-gray-400"}`}
                  >
                    {t("kycVerification.passport")}
                  </div>
                  {idType === "passport" && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-xl border-2 border-cyan-400"
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIdType("driving_license")}
                  className={`relative p-4 rounded-xl border transition-all duration-300 ${
                    idType === "driving_license"
                      ? "bg-amber-500/20 border-amber-500/50 shadow-lg shadow-amber-500/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Car
                    className={`w-6 h-6 mx-auto mb-2 ${idType === "driving_license" ? "text-amber-400" : "text-gray-400"}`}
                  />
                  <div
                    className={`text-sm font-semibold ${idType === "driving_license" ? "text-white" : "text-gray-400"}`}
                  >
                    {t("kycVerification.drivingLicence")}
                  </div>
                  {idType === "driving_license" && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-xl border-2 border-amber-400"
                    />
                  )}
                </button>
              </div>

              {/* ID Number Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {idType === "nid" ? t("kycVerification.nationalIdNumber") : idType === "driving_license" ? t("kycVerification.drivingLicenceNumber") : t("kycVerification.passportNumber")}
                </label>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value);
                      setError("");
                    }}
                    placeholder={
                      idType === "nid"
                        ? t("kycVerification.enterNid")
                        : t("kycVerification.enterPassport")
                    }
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
                  />

                  {idNumber && !error && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                      }}
                      className="absolute right-4 flex items-center justify-center h-full"
                    >
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Transaction ID */}
              {!hasExistingKyc && activePackage && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t("kycVerification.transactionId")} <span className="text-gray-500">{t("kycVerification.transactionIdRequired")}</span>
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => {
                      setTransactionId(e.target.value);
                      setError("");
                    }}
                    placeholder={t("kycVerification.enterTransactionId")}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
                  />
                </div>
              )}

              {/* KYC Package Fee */}
              {!hasExistingKyc && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/[0.02] border border-cyan-500/30">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-300">
                      {parseFloat(kycFee) > 0 ? (
                        <>
                          <p className="font-medium text-cyan-300">
                            {activePackage
                              ? t("kycVerification.packageNameFee", { name: activePackage.name, price: activePackage.price })
                              : t("kycVerification.packageFee", { fee: kycFee })}
                          </p>
                          <p className="mt-1"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(t("kycVerification.feeDescription", { fee: activePackage ? activePackage.price : kycFee }))
                            }}
                          />
                          {parseFloat(user?.deposit_wallet || 0) < parseFloat(kycFee) && (
                            <p className="mt-1 text-red-400 text-xs">
                              {t("kycVerification.insufficientBalance", { balance: user?.deposit_wallet || "0" })}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-cyan-300">
                            {activePackage
                              ? t("kycVerification.packageNameFree", { name: activePackage.name })
                              : t("kycVerification.packageFree")}
                          </p>
                          <p className="mt-1">
                            {t("kycVerification.freeDescription")}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* File Uploads */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-300">
                  {t("kycVerification.uploadDocuments")}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      ref={frontInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFrontImageChange}
                      className="hidden"
                    />

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => frontInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") frontInputRef.current?.click();
                      }}
                      className="w-full h-40 cursor-pointer rounded-xl border-2 border-dashed border-white/10 hover:border-cyan-500/50 bg-white/5 hover:bg-white/10 transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
                    >
                      {frontImage ? (
                        <div className="relative w-full h-full p-3">
                          <div className="w-full h-full rounded-lg bg-white/5 flex items-center justify-center relative overflow-hidden">
                            {frontPreviewUrl ? (
                              <img
                                src={frontPreviewUrl}
                                alt={t("kycVerification.frontSide")}
                                className="h-full w-full object-cover rounded-lg"
                              />
                            ) : (
                              <ImageIcon className="w-12 h-12 text-green-400" />
                            )}

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFrontImage(null);
                              }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                            >
                              <X className="w-4 h-4 text-red-400" />
                            </button>
                          </div>

                          <p className="text-xs text-gray-400 mt-4 text-center truncate">
                            {frontImage.name}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-300">
                              {t("kycVerification.frontSide")}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t("kycVerification.clickToUpload")}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Back Image Upload */}
                  {idType !== "passport" && (
                    <>
                      <div>
                        <input
                          ref={backInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBackImageChange}
                          className="hidden"
                        />

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => backInputRef.current?.click()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              backInputRef.current?.click();
                          }}
                          className="w-full h-40 cursor-pointer rounded-xl border-2 border-dashed border-white/10 hover:border-cyan-500/50 bg-white/5 hover:bg-white/10 transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
                        >
                          {backImage ? (
                            <div className="relative w-full h-full p-3">
                              <div className="w-full h-full rounded-lg bg-white/5 flex items-center justify-center relative overflow-hidden">
                                {backPreviewUrl ? (
                                  <img
                                    src={backPreviewUrl}
                                    alt={t("kycVerification.backSide")}
                                    className="h-full w-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <ImageIcon className="w-12 h-12 text-green-400" />
                                )}

                                {/* Remove Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBackImage(null);
                                  }}
                                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                                >
                                  <X className="w-4 h-4 text-red-400" />
                                </button>
                              </div>

                              <p className="text-xs text-gray-400 mt-4 text-center truncate">
                                {backImage.name}
                              </p>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-300">
                                  {t("kycVerification.backSide")}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {t("kycVerification.clickToUpload")}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative w-full group px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-xl font-semibold overflow-hidden shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>

                      <span className="relative flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      {t("kycVerification.processing")}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      {hasExistingKyc
                        ? t("kycVerification.resubmit")
                        : parseFloat(kycFee) > 0
                        ? t("kycVerification.purchaseSubmit", { fee: activePackage ? activePackage.price : kycFee })
                        : t("kycVerification.submitForVerification")}
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-400">
                  <p className="mb-1">
                    {t("kycVerification.infoBox")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("kycVerification.infoBoxSub")}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
