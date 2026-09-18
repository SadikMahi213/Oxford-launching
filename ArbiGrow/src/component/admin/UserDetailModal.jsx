import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Wallet,
  FileText,
  Users,
  Package,
  Eye,
  GitBranch,
  Award,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  RotateCcw,
  Shield,
} from "lucide-react";

export default function UserDetailModal({
  selectedUser,
  onClose,
  userStatus,
  setUserStatus,
  userIssueNote,
  setUserIssueNote,
  handleStatusChange,
  isUpdating,
  updateMessage,
  walletForm,
  onWalletFieldChange,
  onWalletUpdate,
  isWalletUpdating,
  walletUpdateMessage,
  hasWalletChanges,
  onBlockUnblock,
  isBlocking,
  onProfileUpdate,
  isProfileUpdating,
  profileUpdateMessage,
  onPasswordReset,
  isPasswordResetting,
  passwordResetMessage,
}) {
  // console.log("user from modal", selectedUser);

  const documentImages = [
    selectedUser?.kyc?.front_image_url,
    selectedUser?.kyc?.back_image_url,
  ].filter(Boolean);
  const formatNumber = (num) => {
    const n = Number(num);
    if (isNaN(n)) return "0.00";
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const normalizeStatus = (value) => {
    const normalized = String(value || "pending").toLowerCase();
    return ["pending", "approved", "rejected", "issue", "inactive"].includes(normalized)
      ? normalized
      : "pending";
  };
  const currentUserStatus = normalizeStatus(
    selectedUser?.status || selectedUser?.kyc?.status,
  );
  const currentIssueNote = String(selectedUser?.issue_note || "");
  const normalizedSelectedStatus = normalizeStatus(userStatus);
  const hasIssueNoteChanged =
    normalizedSelectedStatus === "issue" &&
    String(userIssueNote || "").trim() !== currentIssueNote.trim();
  const shouldDisableStatusUpdate =
    isUpdating ||
    (normalizedSelectedStatus === currentUserStatus && !hasIssueNoteChanged);

  const depositHistory = Array.isArray(selectedUser?.deposit_history)
    ? selectedUser.deposit_history
    : [];
  const withdrawalHistory = Array.isArray(selectedUser?.withdrawal_history)
    ? selectedUser.withdrawal_history
    : [];
  const currentActivePackages = Array.isArray(selectedUser?.current_active_packages)
    ? selectedUser.current_active_packages
    : selectedUser?.current_active_package
      ? [selectedUser.current_active_package]
      : [];
  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };
  const formatPercent = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return value || "-";
    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
  };

  const levelColors = {
    1: {
      bg: "from-blue-600/15 to-cyan-600/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      dot: "bg-blue-500",
    },
    2: {
      bg: "from-cyan-600/15 to-teal-600/10",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      dot: "bg-cyan-500",
    },
    3: {
      bg: "from-purple-600/15 to-violet-600/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      dot: "bg-purple-500",
    },
    4: {
      bg: "from-pink-600/15 to-rose-600/10",
      border: "border-pink-500/30",
      text: "text-pink-400",
      dot: "bg-pink-500",
    },
    5: {
      bg: "from-amber-600/15 to-orange-600/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      dot: "bg-amber-500",
    },
  };

  const [selectedReferralLevel, setSelectedReferralLevel] = useState(1);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  useEffect(() => {
    setSelectedReferralLevel(1);
    setIsEditingProfile(false);
    setShowPasswordReset(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setProfileForm({
      full_name: selectedUser?.full_name || "",
      first_name: selectedUser?.first_name || "",
      last_name: selectedUser?.last_name || "",
      username: selectedUser?.username || "",
      email: selectedUser?.email || "",
      mobile_number: selectedUser?.mobile_number || "",
      date_of_birth: selectedUser?.date_of_birth || "",
      country_of_residence: selectedUser?.country_of_residence || "",
      residential_address: selectedUser?.residential_address || "",
      city: selectedUser?.city || "",
      state_province: selectedUser?.state_province || "",
      postal_code: selectedUser?.postal_code || "",
      gender: selectedUser?.gender || "",
      nationality: selectedUser?.nationality || "",
      religion: selectedUser?.religion || "",
      marital_status: selectedUser?.marital_status || "",
      national_id_number: selectedUser?.national_id_number || "",
      passport_number: selectedUser?.passport_number || "",
    });
  }, [selectedUser?.id]);

  const referralLevels = useMemo(() => {
    const fallbackRates = {
      1: "10%",
      2: "9%",
      3: "8%",
      4: "7%",
      5: "5%",
    };
    const sourceLevels = Array.isArray(selectedUser?.referral_tree?.levels)
      ? selectedUser.referral_tree.levels
      : [];

    const byLevel = sourceLevels.reduce((acc, levelRow) => {
      const levelNo = Number(levelRow?.level);
      acc[levelNo] = {
        level: levelNo,
        commissionRate: levelRow?.commission_rate || fallbackRates[levelNo] || "0%",
        totalEarnings: Number(levelRow?.total_earnings || 0),
        users: Array.isArray(levelRow?.users)
          ? levelRow.users.map((member) => ({
              id: member?.id,
              name: member?.name || "-",
              username: member?.username || "-",
              joinDate: member?.join_date || "-",
              totalEarnings: Number(member?.total_earnings || 0),
              directReferrals: Number(member?.direct_referrals || 0),
              referredBy: member?.referred_by || "-",
              status: member?.status || "inactive",
            }))
          : [],
      };
      return acc;
    }, {});

    return [1, 2, 3, 4, 5].map((levelNo) => {
      return (
        byLevel[levelNo] || {
          level: levelNo,
          commissionRate: fallbackRates[levelNo],
          totalEarnings: 0,
          users: [],
        }
      );
    });
  }, [selectedUser?.referral_tree]);

  const totalReferrals =
    Number(selectedUser?.referral_tree?.total_referrals || 0) ||
    referralLevels.reduce((sum, level) => sum + level.users.length, 0);
  const totalActiveReferrals = Number(
    selectedUser?.referral_tree?.total_active_referrals || 0,
  );
  const totalTeamMembers = Number(selectedUser?.referral_tree?.total_team_members || 0);
  const bonusEligibleMembers = Number(selectedUser?.referral_tree?.bonus_eligible_members || 0);
  const nonBonusMembers = Number(selectedUser?.referral_tree?.non_bonus_members || 0);
  const activeLevel =
    referralLevels.find((level) => level.level === selectedReferralLevel) ||
    referralLevels[0];
  const lc = levelColors[selectedReferralLevel];

  return (
    <AnimatePresence>
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-br from-[#0d1137] to-[#0a0e27] border-b border-white/10 p-4 sm:p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-white">User Details</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Basic Info */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  User Information
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(!isEditingProfile);
                    setPasswordError("");
                    if (!isEditingProfile) {
                      setProfileForm({
                        full_name: selectedUser?.full_name || "",
                        first_name: selectedUser?.first_name || "",
                        last_name: selectedUser?.last_name || "",
                        username: selectedUser?.username || "",
                        email: selectedUser?.email || "",
                        mobile_number: selectedUser?.mobile_number || "",
                        date_of_birth: selectedUser?.date_of_birth || "",
                        country_of_residence: selectedUser?.country_of_residence || "",
                        residential_address: selectedUser?.residential_address || "",
                        city: selectedUser?.city || "",
                        state_province: selectedUser?.state_province || "",
                        postal_code: selectedUser?.postal_code || "",
                        gender: selectedUser?.gender || "",
                        nationality: selectedUser?.nationality || "",
                        religion: selectedUser?.religion || "",
                        marital_status: selectedUser?.marital_status || "",
                        national_id_number: selectedUser?.national_id_number || "",
                        passport_number: selectedUser?.passport_number || "",
                      });
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isEditingProfile
                      ? "bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                      : "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                  }`}
                >
                  {isEditingProfile ? (
                    <>
                      <X className="w-4 h-4" /> Cancel
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" /> Edit Profile
                    </>
                  )}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 sm:p-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField label="Full Name" value={profileForm.full_name} onChange={(v) => setProfileForm(p => ({...p, full_name: v}))} />
                    <FormField label="First Name" value={profileForm.first_name} onChange={(v) => setProfileForm(p => ({...p, first_name: v}))} />
                    <FormField label="Last Name" value={profileForm.last_name} onChange={(v) => setProfileForm(p => ({...p, last_name: v}))} />
                    <FormField label="Username" value={profileForm.username} onChange={(v) => setProfileForm(p => ({...p, username: v}))} />
                    <FormField label="Email" value={profileForm.email} onChange={(v) => setProfileForm(p => ({...p, email: v}))} type="email" />
                    <FormField label="Mobile Number" value={profileForm.mobile_number} onChange={(v) => setProfileForm(p => ({...p, mobile_number: v}))} />
                    <FormField label="Date of Birth" value={profileForm.date_of_birth} onChange={(v) => setProfileForm(p => ({...p, date_of_birth: v}))} type="date" />
                    <FormField label="Gender" value={profileForm.gender} onChange={(v) => setProfileForm(p => ({...p, gender: v}))} />
                    <FormField label="Nationality" value={profileForm.nationality} onChange={(v) => setProfileForm(p => ({...p, nationality: v}))} />
                    <FormField label="Religion" value={profileForm.religion} onChange={(v) => setProfileForm(p => ({...p, religion: v}))} />
                    <FormField label="Marital Status" value={profileForm.marital_status} onChange={(v) => setProfileForm(p => ({...p, marital_status: v}))} />
                    <FormField label="Country of Residence" value={profileForm.country_of_residence} onChange={(v) => setProfileForm(p => ({...p, country_of_residence: v}))} />
                    <FormField label="City" value={profileForm.city} onChange={(v) => setProfileForm(p => ({...p, city: v}))} />
                    <FormField label="State/Province" value={profileForm.state_province} onChange={(v) => setProfileForm(p => ({...p, state_province: v}))} />
                    <FormField label="Postal Code" value={profileForm.postal_code} onChange={(v) => setProfileForm(p => ({...p, postal_code: v}))} />
                    <div className="sm:col-span-2 lg:col-span-3">
                      <FormField label="Residential Address" value={profileForm.residential_address} onChange={(v) => setProfileForm(p => ({...p, residential_address: v}))} />
                    </div>
                    <FormField label="National ID Number" value={profileForm.national_id_number} onChange={(v) => setProfileForm(p => ({...p, national_id_number: v}))} />
                    <FormField label="Passport Number" value={profileForm.passport_number} onChange={(v) => setProfileForm(p => ({...p, passport_number: v}))} />
                  </div>

                  <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onProfileUpdate?.(selectedUser?.id, profileForm)}
                      disabled={isProfileUpdating}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isProfileUpdating ? (
                        <>Updating...</>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Save Changes
                        </>
                      )}
                    </button>
                    {profileUpdateMessage && (
                      <div className={`text-sm ${profileUpdateMessage.includes("success") ? "text-green-400" : "text-red-400"}`}>
                        {profileUpdateMessage}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={User} label="Full Name" value={selectedUser?.full_name || "N/A"} />
                  <InfoCard icon={User} label="First Name" value={selectedUser?.first_name || "N/A"} />
                  <InfoCard icon={User} label="Last Name" value={selectedUser?.last_name || "N/A"} />
                  <InfoCard icon={User} label="Username" value={selectedUser?.username || "N/A"} />
                  <InfoCard icon={Mail} label="Email" value={selectedUser?.email || "N/A"} breakAll />
                  <InfoCard icon={Phone} label="Mobile Number" value={selectedUser?.mobile_number || selectedUser?.kyc?.phone_number || "N/A"} />
                  <InfoCard icon={MapPin} label="Date of Birth" value={selectedUser?.date_of_birth || "N/A"} />
                  <InfoCard icon={MapPin} label="Gender" value={selectedUser?.gender || "N/A"} />
                  <InfoCard icon={MapPin} label="Nationality" value={selectedUser?.nationality || "N/A"} />
                  <InfoCard icon={MapPin} label="Religion" value={selectedUser?.religion || "N/A"} />
                  <InfoCard icon={MapPin} label="Marital Status" value={selectedUser?.marital_status || "N/A"} />
                  <InfoCard icon={MapPin} label="Country of Residence" value={selectedUser?.country_of_residence || selectedUser?.kyc?.country || "N/A"} />
                  <InfoCard icon={MapPin} label="City" value={selectedUser?.city || "N/A"} />
                  <InfoCard icon={MapPin} label="State/Province" value={selectedUser?.state_province || "N/A"} />
                  <InfoCard icon={MapPin} label="Postal Code" value={selectedUser?.postal_code || "N/A"} />
                  <InfoCard icon={MapPin} label="Residential Address" value={selectedUser?.residential_address || "N/A"} />
                  <InfoCard icon={FileText} label="National ID Number" value={selectedUser?.national_id_number || "N/A"} />
                  <InfoCard icon={FileText} label="Passport Number" value={selectedUser?.passport_number || "N/A"} />
                  <InfoCard icon={FileText} label="KYC Document Type" value={selectedUser?.kyc?.document_type?.toUpperCase() || "N/A"} />
                </div>
              )}

              {/* Active Packages */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  Current Active Packages
                </h3>
                {currentActivePackages.length > 0 ? (
                  <div className="grid gap-3">
                    {currentActivePackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-2 text-sm">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Package Name</div>
                            <div className="text-white font-semibold">
                              {pkg.package_name || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Invested Amount</div>
                            <div className="text-white font-semibold">
                              {pkg.invested_amount} USDT
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">ROI Cap</div>
                            <div className="text-white font-semibold">
                              {formatPercent(pkg.roi_percent)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Started</div>
                            <div className="text-white font-semibold">
                              {formatDateTime(pkg.start_date)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Status</div>
                            <div className="text-white font-semibold capitalize">
                              {pkg.status || "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                    No active packages found for this user.
                  </div>
                )}
              </div>

              {/* Captcha & Ad View Earnings */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-400" />
                  Task Earnings
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">Total Captcha Earned</div>
                    <div className="text-sm font-semibold text-purple-300">
                      ${formatNumber(selectedUser?.total_captcha_earned || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">Total Ad View Earned</div>
                    <div className="text-sm font-semibold text-purple-300">
                      ${formatNumber(selectedUser?.total_ad_view_earned || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallets */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                  Wallets
                </h3>

                <div className="grid gap-3">
                  {[
                    {
                      key: "main_wallet",
                      label: "Main Wallet",
                    },
                    {
                      key: "deposit_wallet",
                      label: "Deposit Wallet",
                    },
                    {
                      key: "withdraw_wallet",
                      label: "Withdraw Wallet",
                    },
                    {
                      key: "referral_wallet",
                      label: "Referral Wallet",
                    },
                    {
                      key: "generation_wallet",
                      label: "Generation Wallet",
                    },
                    {
                      key: "arbx_wallet",
                      label: "OFA token Wallet",
                    },
                    {
                      key: "arbx_mining_wallet",
                      label: "OFA token Mining Wallet",
                    },
                    {
                      key: "captcha_wallet",
                      label: "Captcha Wallet",
                    },
                    {
                      key: "ad_view_wallet",
                      label: "Ad View Wallet",
                    },
                    {
                      key: "ecommerce_wallet",
                      label: "Ecommerce Wallet",
                    },
                    {
                      key: "matching_bonus_wallet",
                      label: "Matching Bonus Wallet",
                    },
                  ].map((wallet, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="text-xs text-gray-400 mb-1">
                        {wallet.label}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.00000000000001"
                        value={walletForm?.[wallet.key] ?? ""}
                        onChange={(e) =>
                          onWalletFieldChange?.(wallet.key, e.target.value)
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#0C1035] px-3 py-2 text-sm text-white font-mono focus:border-cyan-500/50 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
                  <button
                    type="button"
                    onClick={onWalletUpdate}
                    disabled={isWalletUpdating || !hasWalletChanges}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWalletUpdating ? "Updating Wallets..." : "Update Wallets"}
                  </button>
                  {walletUpdateMessage && (
                    <div className="text-sm text-cyan-300">{walletUpdateMessage}</div>
                  )}
                </div>
              </div>

              {/* Referral Tree */}
              <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden">
                <div className="p-4 md:p-5 border-b border-white/10 flex items-center gap-3">
                  <GitBranch className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Referral Tree</h3>
                    <p className="text-xs text-gray-400">
                      {totalTeamMembers > 0 ? `${totalTeamMembers} total team members` : `${totalReferrals} members across 5 levels`}
                      {totalActiveReferrals > 0
                        ? ` • ${totalActiveReferrals} active`
                        : ""}
                    </p>
                  </div>
                </div>

                {totalTeamMembers > 0 && (
                  <div className="grid grid-cols-3 gap-2 px-4 md:px-5 pt-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                      <div className="text-lg font-bold text-cyan-400">{totalTeamMembers}</div>
                      <div className="text-[9px] text-gray-500">Total Team</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                      <div className="text-lg font-bold text-green-400">{bonusEligibleMembers}</div>
                      <div className="text-[9px] text-gray-500">Bonus Eligible</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                      <div className="text-lg font-bold text-amber-400">{nonBonusMembers}</div>
                      <div className="text-[9px] text-gray-500">Non-Bonus</div>
                    </div>
                  </div>
                )}

                <div className="px-4 md:px-5 pt-4 pb-1">
                  <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {referralLevels.map((level) => {
                      const levelStyle = levelColors[level.level];
                      const isActive = selectedReferralLevel === level.level;

                      return (
                        <button
                          key={level.level}
                          onClick={() => setSelectedReferralLevel(level.level)}
                          className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border transition-all duration-200 min-w-[72px] ${
                            isActive
                              ? `bg-gradient-to-br ${levelStyle.bg} ${levelStyle.border}`
                              : "bg-white/[0.04] border-white/10 hover:border-white/20"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-semibold ${
                              isActive ? levelStyle.text : "text-gray-500"
                            }`}
                          >
                            Level {level.level}
                          </span>
                          <span
                            className={`text-lg font-bold leading-none ${
                              isActive ? "text-white" : "text-gray-500"
                            }`}
                          >
                            {level.users.length}
                          </span>
                          <span
                            className={`text-[9px] font-medium ${
                              isActive ? levelStyle.text : "text-gray-600"
                            }`}
                          >
                            {level.commissionRate}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className={`mx-4 md:mx-5 mt-3 px-3 py-2.5 rounded-xl bg-gradient-to-r ${lc.bg} border ${lc.border} flex flex-wrap items-center justify-between gap-2`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${lc.border} ${lc.text} bg-black/20`}
                    >
                      L{selectedReferralLevel}
                    </span>
                    <span className="text-white text-sm font-semibold">
                      {activeLevel.users.length} member
                      {activeLevel.users.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Award className={`w-3.5 h-3.5 ${lc.text}`} />
                      <span className={`${lc.text} font-semibold`}>
                        {activeLevel.commissionRate}
                      </span>
                    </div>
                    <span className="text-green-400 font-semibold">
                      ${activeLevel.totalEarnings.toFixed(2)} earned
                    </span>
                  </div>
                </div>

                <div className="p-4 md:p-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedReferralLevel}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      {activeLevel.users.length === 0 ? (
                        <div className="md:col-span-2 p-4 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-gray-400">
                          No members found for Level {selectedReferralLevel}.
                        </div>
                      ) : (
                        activeLevel.users.map((member, index) => (
                          <motion.div
                            key={`${member.id}-${index}`}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            className={`p-4 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/10 hover:${lc.border} transition-all duration-300`}
                          >
                            <div className="flex items-center justify-between mb-3 gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${lc.bg} border ${lc.border} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                                >
                                  {(member.name || "U").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-semibold text-sm truncate">
                                    {member.name || "-"}
                                  </div>
                                  <div className="text-gray-400 text-[11px] truncate">
                                    @{member.username || "-"}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
                                  member.status === "active"
                                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                                    : "bg-gray-500/10 text-gray-500 border-gray-500/30"
                                }`}
                              >
                                {member.status === "active" ? "● Active" : "○ Inactive"}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                              {[
                                {
                                  label: "Joined",
                                  value: member.joinDate || "-",
                                  cls: "text-white",
                                },
                                {
                                  label: "Earnings",
                                  value: `$${Number(member.totalEarnings || 0).toFixed(2)}`,
                                  cls: "text-green-400",
                                },
                                {
                                  label: "Sub-refs",
                                  value: String(member.directReferrals || 0),
                                  cls: lc.text,
                                },
                              ].map((stat) => (
                                <div
                                  key={stat.label}
                                  className="bg-white/[0.04] rounded-lg px-2 py-3 flex flex-col items-center justify-center text-center"
                                >
                                  <div className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wide">
                                    {stat.label}
                                  </div>
                                  <div className={`text-[11px] font-bold ${stat.cls} leading-tight`}>
                                    {stat.value}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r ${lc.bg} border ${lc.border}`}
                            >
                              <Users className={`w-3 h-3 ${lc.text} flex-shrink-0`} />
                              <span className="text-gray-500 text-[10px]">via</span>
                              <span className={`${lc.text} text-[10px] font-semibold truncate`}>
                                @{member.referredBy || "-"}
                              </span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="px-4 md:px-5 pb-4 border-t border-white/10 pt-3 flex items-center justify-between">
                  <button
                    onClick={() =>
                      setSelectedReferralLevel((prev) => Math.max(1, prev - 1))
                    }
                    disabled={selectedReferralLevel === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>

                  <div className="flex items-center gap-1.5">
                    {referralLevels.map((level) => {
                      const levelStyle = levelColors[level.level];
                      const isActive = selectedReferralLevel === level.level;
                      return (
                        <button
                          key={level.level}
                          onClick={() => setSelectedReferralLevel(level.level)}
                          className={`rounded-full transition-all duration-300 ${
                            isActive
                              ? `h-2 w-5 ${levelStyle.dot}`
                              : "h-2 w-2 bg-white/20 hover:bg-white/40"
                          }`}
                        />
                      );
                    })}
                  </div>

                  <button
                    onClick={() =>
                      setSelectedReferralLevel((prev) => Math.min(5, prev + 1))
                    }
                    disabled={selectedReferralLevel === 5}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">
                  Document Images
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {documentImages.length > 0 ? (
                    documentImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden border border-white/10"
                      >
                        <img
                          src={img}
                          alt={`Document ${idx + 1}`}
                          className="w-full h-64 object-cover"
                        />
                        <div className="p-2 bg-white/5 text-center text-sm text-gray-400">
                          {selectedUser?.documentType === "passport"
                            ? "Passport"
                            : selectedUser?.documentType === "driving_license"
                              ? idx === 0
                                ? "Driving Licence Front"
                                : "Driving Licence Back"
                              : idx === 0
                                ? "NID Front"
                                : "NID Back"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400">No documents uploaded</div>
                  )}
                </div>
              </div>

              {/* Status Update */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                <h3 className="text-lg font-bold text-white mb-4">
                  Update Status
                </h3>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <select
                    value={userStatus}
                    onChange={(e) => setUserStatus(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl  bg-[#0C1035] border border-white/20 text-white focus:border-cyan-500/50 focus:outline-none"
                  >
                    <option value="pending">Processing</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="issue">Issue</option>
                  </select>
                  {normalizedSelectedStatus === "issue" && (
                    <textarea
                      value={userIssueNote}
                      onChange={(e) => setUserIssueNote(e.target.value)}
                      placeholder="Write the issue details for this user..."
                      className="flex-1 min-h-24 px-4 py-3 rounded-xl bg-[#0C1035] border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
                    />
                  )}
                  <button
                    onClick={handleStatusChange}
                    disabled={shouldDisableStatusUpdate}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdating ? "Updating..." : "Update Status"}
                  </button>

                  {updateMessage && (
                    <div className="mt-3 text-sm text-green-400">
                      {updateMessage}
                    </div>
                  )}
                </div>

                {selectedUser?.blocked_at && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <h4 className="text-sm font-semibold text-red-300 mb-2">
                      Account Blocked
                    </h4>
                    <p className="text-xs text-red-200/80">
                      Blocked at: {new Date(selectedUser.blocked_at).toLocaleString()}
                    </p>
                    {selectedUser?.blocked_reason && (
                      <p className="text-xs text-red-200/80 mt-1">
                        Reason: {selectedUser.blocked_reason}
                      </p>
                    )}
                  </div>
                )}
                {onBlockUnblock && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => onBlockUnblock(selectedUser)}
                      disabled={isBlocking}
                      className={`w-full px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedUser?.blocked_at
                          ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30"
                          : "bg-gradient-to-r from-orange-600 to-red-500 text-white hover:shadow-lg hover:shadow-red-500/30"
                      }`}
                    >
                      {isBlocking
                        ? "Processing..."
                        : selectedUser?.blocked_at
                          ? "Unblock Account"
                          : "Block Account"}
                    </button>
                  </div>
                )}
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-cyan-300">
                      Deposit History
                    </h4>
                    <div className="max-h-56 space-y-2 overflow-y-auto">
                      {depositHistory.length === 0 ? (
                        <div className="text-sm text-gray-400">
                          No deposit history found.
                        </div>
                      ) : (
                        depositHistory.map((item) => (
                          <div
                            key={`dep-${item.id}`}
                            className="rounded-lg border border-white/10 bg-[#0C1035] p-3 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white">
                                {item.amount} USDT
                              </span>
                              <span className="text-xs uppercase text-gray-400">
                                {item.status}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              {item.network_name || "-"} | {formatDateTime(item.created_at)}
                            </div>
                            <div className="mt-1 break-all font-mono text-[11px] text-gray-500">
                              {item.txid || "-"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-cyan-300">
                      Withdrawal History
                    </h4>
                    <div className="max-h-56 space-y-2 overflow-y-auto">
                      {withdrawalHistory.length === 0 ? (
                        <div className="text-sm text-gray-400">
                          No withdrawal history found.
                        </div>
                      ) : (
                        withdrawalHistory.map((item) => (
                          <div
                            key={`wdw-${item.id}`}
                            className="rounded-lg border border-white/10 bg-[#0C1035] p-3 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white">
                                {item.amount} USDT
                              </span>
                              <span className="text-xs uppercase text-gray-400">
                                {item.status}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              {item.source_wallet || "-"} |{" "}
                              {item.network_name || "-"}
                            </div>
                            <div className="mt-1 break-all text-[11px] text-gray-500">
                              {item.destination_address || "-"}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {formatDateTime(item.created_at)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security / Password Reset */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-400" />
                  Security
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Admin cannot view the user's existing password. Passwords are securely hashed.
                </p>

                {!showPasswordReset ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 text-white font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Password
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                        placeholder="Enter new password (min 6 characters)"
                        className="w-full px-4 py-3 rounded-xl bg-[#0C1035] border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-3 rounded-xl bg-[#0C1035] border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
                      />
                    </div>

                    {passwordError && (
                      <div className="text-sm text-red-400">{passwordError}</div>
                    )}

                    {passwordResetMessage && (
                      <div className={`text-sm ${passwordResetMessage.includes("success") ? "text-green-400" : "text-red-400"}`}>
                        {passwordResetMessage}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (newPassword.length < 6) {
                            setPasswordError("Password must be at least 6 characters");
                            return;
                          }
                          if (newPassword !== confirmPassword) {
                            setPasswordError("Passwords do not match");
                            return;
                          }
                          onPasswordReset?.(selectedUser?.id, newPassword);
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        disabled={isPasswordResetting}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 text-white font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isPasswordResetting ? "Resetting..." : "Confirm Reset"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordReset(false);
                          setNewPassword("");
                          setConfirmPassword("");
                          setPasswordError("");
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-semibold hover:text-white hover:bg-white/10 transition-all duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Small internal reusable card component (UI identical) */
function InfoCard({ icon: Icon, label, value, breakAll }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-cyan-400" />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div
        className={`text-white font-semibold ${breakAll ? "break-all" : ""}`}
      >
        {value || "N/A"}
      </div>
    </div>
  );
}

/* Editable form field for profile editing */
function FormField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-[#0C1035] border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
      />
    </div>
  );
}
