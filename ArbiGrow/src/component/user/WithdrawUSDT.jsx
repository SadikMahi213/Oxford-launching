import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Building2, ChevronDown, Copy, Send, CheckCircle, Network } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import KycWarningBanner from "./KycWarningBanner.jsx";
import {
  createWithdrawalRequest,
  getActiveDepositNetworks,
  getMyWithdrawals,
  getMyBankInfo,
  refreshUserStore,
} from "../../api/user.api.js";
import { getFeeConfig } from "../../api/admin.api.js";
import StatusFeedbackModal from "../StatusFeedbackModal.jsx";

const MIN_WITHDRAW_AMOUNT = 10;
const MAX_WITHDRAW_AMOUNT = 700;
const MAIN_WALLET_BUFFER_RATE = 0.01;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatAmount = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return amount % 1 === 0 ? String(amount) : amount.toFixed(2);
};

const toNumber = (value) => Number(value ?? 0);

const getStatusColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "approved":
      return "text-green-400 bg-green-500/10 border-green-500/30";
    case "pending":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    case "rejected":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    default:
      return "text-gray-400 bg-gray-500/10 border-gray-500/30";
  }
};

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message;

const INITIAL_FIELD_ERRORS = {
  wallet: "",
  amount: "",
  network: "",
};

const getApiFieldErrors = (error) => {
  const details = error?.response?.data?.detail;
  if (!Array.isArray(details)) return null;
  const mapped = {};
  let hasMappedError = false;
  details.forEach((item) => {
    const field = item?.loc?.[item.loc.length - 1];
    const message = typeof item?.msg === "string" ? item.msg : "Invalid value";
    if (field === "source_wallet") { mapped.wallet = message; hasMappedError = true; }
    if (field === "amount") { mapped.amount = message; hasMappedError = true; }
    if (field === "network_name") { mapped.network = message; hasMappedError = true; }
  });
  return hasMappedError ? mapped : null;
};

export default function WithdrawPage() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [selectedWalletKey, setSelectedWalletKey] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(INITIAL_FIELD_ERRORS);
  const [feedback, setFeedback] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [bankInfo, setBankInfo] = useState(null);
  const [withdrawalMode, setWithdrawalMode] = useState("both");
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState("");

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const walletOptions = useMemo(
    () => [
      { key: "main_wallet", label: t('withdraw.mainWallet'), balance: toNumber(user?.main_wallet) },
      { key: "referral_wallet", label: t('withdraw.referralWallet'), balance: toNumber(user?.referral_wallet) },
      { key: "generation_wallet", label: t('withdraw.generationWallet'), balance: toNumber(user?.generation_wallet) },
      { key: "captcha_wallet", label: t('withdraw.captchaWallet'), balance: toNumber(user?.captcha_wallet) },
      { key: "ad_view_wallet", label: t('withdraw.adWallet'), balance: toNumber(user?.ad_view_wallet) },
    ],
    [user],
  );

  const selectedWallet = useMemo(
    () => walletOptions.find((w) => w.key === selectedWalletKey),
    [walletOptions, selectedWalletKey],
  );

  const walletLabelMap = useMemo(
    () => new Map(walletOptions.map((w) => [w.key, w.label])),
    [walletOptions],
  );

  const amountNumber = useMemo(() => {
    const p = Number(amount.trim());
    return Number.isNaN(p) || p <= 0 ? 0 : p;
  }, [amount]);

  const EARNING_WALLETS = new Set(["captcha_wallet", "ad_view_wallet"]);
  const mainWalletBalance = toNumber(user?.main_wallet);
  const requiredMainWalletBalance = useMemo(
    () => amountNumber * (1 + MAIN_WALLET_BUFFER_RATE),
    [amountNumber],
  );
  const mainWalletShortfall = useMemo(
    () => Math.max(requiredMainWalletBalance - mainWalletBalance, 0),
    [requiredMainWalletBalance, mainWalletBalance],
  );
  const hasEnoughMainWalletBalance =
    amountNumber <= 0 || EARNING_WALLETS.has(selectedWalletKey) || mainWalletShortfall === 0;

  const hasApprovedBank = bankInfo?.status === "approved";

  const isBankingMode = withdrawalMode === "banking_only";
  const isNetworkMode = withdrawalMode === "network_only";
  const isBothMode = withdrawalMode === "both";
  const canUseBank = (isBankingMode || isBothMode) && hasApprovedBank;
  const canUseNetwork = isNetworkMode || (isBothMode && !hasApprovedBank);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [userResponse, withdrawalsResponse, bankRes, feeRes, netRes] = await Promise.all([
          refreshUserStore(),
          getMyWithdrawals(),
          getMyBankInfo(),
          getFeeConfig(useUserStore.getState().token).catch(() => ({ data: {} })),
          getActiveDepositNetworks().catch(() => ({ data: { data: [] } })),
        ]);
        if (userResponse?.data?.user) {
          setUser({ ...userResponse.data.user, kyc_status: userResponse.data.kyc_status });
        }
        setWithdrawals(withdrawalsResponse?.data?.data || []);
        setBankInfo(bankRes?.data?.data || null);
        setWithdrawalMode(feeRes?.data?.withdrawal_mode || "both");
        setNetworks(netRes?.data?.data || []);
      } catch (error) {
        setFeedback({ type: "error", message: getErrorMessage(error) || t('withdraw.err_general') });
        setWithdrawals([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [setUser]);

  const handleSubmitWithdraw = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const kycStatus = user?.kyc_status;
    if (!kycStatus || kycStatus !== "approved") {
      setFeedback({ type: "error", message: "KYC verification required. Please complete KYC verification before withdrawing." });
      return;
    }
    const nextFieldErrors = {};
    const normalizedAmount = amount.trim();
    const parsedAmount = Number(normalizedAmount);

    if (!selectedWalletKey) nextFieldErrors.wallet = t('withdraw.err_field');
    if (!normalizedAmount) {
      nextFieldErrors.amount = t('withdraw.err_field');
    } else if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      nextFieldErrors.amount = t('withdraw.err_validAmount');
    } else if (parsedAmount < MIN_WITHDRAW_AMOUNT) {
      nextFieldErrors.amount = t('withdraw.err_min', { min: MIN_WITHDRAW_AMOUNT });
    } else if (parsedAmount > MAX_WITHDRAW_AMOUNT) {
      nextFieldErrors.amount = t('withdraw.err_max', { max: MAX_WITHDRAW_AMOUNT });
    } else if (selectedWallet && parsedAmount > selectedWallet.balance) {
      nextFieldErrors.amount = t('withdraw.err_balance', { wallet: selectedWallet.label, balance: selectedWallet.balance.toFixed(7) });
    } else if (!hasEnoughMainWalletBalance) {
      nextFieldErrors.amount = t('withdraw.err_mainBalance', { required: requiredMainWalletBalance.toFixed(7), available: mainWalletBalance.toFixed(7) });
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors(INITIAL_FIELD_ERRORS);
    setIsSubmitting(true);

    try {
      const payload = {
        source_wallet: selectedWallet.key,
        amount: normalizedAmount,
        note: note.trim(),
        use_bank_info: canUseBank,
        network_name: canUseBank ? undefined : selectedNetwork || undefined,
        destination_address: canUseBank || isBankingMode ? undefined : "Network Withdrawal",
      };

      if (isBankingMode && !hasApprovedBank) {
        setFeedback({ type: "error", message: "Please complete your Banking Setup before requesting a withdrawal." });
        setIsSubmitting(false);
        return;
      }
      if (!canUseBank && !selectedNetwork) {
        setFieldErrors((p) => ({ ...p, network: t('withdraw.err_field') }));
        setIsSubmitting(false);
        return;
      }

      const response = await createWithdrawalRequest(payload);
      const created = response?.data?.data;
      if (created) {
        setWithdrawals((prev) => [created, ...prev]);
      } else {
        const wRes = await getMyWithdrawals();
        setWithdrawals(wRes?.data?.data || []);
      }
      setFeedback({ type: "success", message: t('withdraw.success') });
      setFieldErrors(INITIAL_FIELD_ERRORS);
      setAmount("");
      setNote("");
    } catch (error) {
      const apiFieldErrors = getApiFieldErrors(error);
      if (apiFieldErrors) { setFieldErrors(apiFieldErrors); return; }
      setFeedback({ type: "error", message: getErrorMessage(error) || t('withdraw.err_general') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAddress = (value) => navigator.clipboard.writeText(value);

  return (
    <div className="space-y-6 p-6">
      <KycWarningBanner />
      <div>
        <h1 className="text-3xl font-bold">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t('withdraw.title')}
          </span>
        </h1>
        <p className="text-sm text-gray-400">{t('withdraw.subtitle')}</p>
      </div>

      {/* Mode Banner */}
      {isBankingMode && !hasApprovedBank && (
        <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200/80">
            <p className="font-semibold text-yellow-300">{t('withdraw.mode_banking')}</p>
            <p>Please complete your Banking Setup before requesting a withdrawal.</p>
          </div>
        </div>
      )}
      {isNetworkMode && (
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 p-5 flex items-start gap-4">
          <Network className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200/80">
            <p className="font-semibold text-blue-300">{t('withdraw.mode_network')}</p>
            <p>Withdraw using available network methods.</p>
          </div>
        </div>
      )}
      {isBothMode && (
        <div className="rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-500/5 to-emerald-500/5 p-5 flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-200/80">
            <p className="font-semibold text-green-300">{t('withdraw.mode_both')}</p>
            <p>You can withdraw via bank transfer or network method.</p>
          </div>
        </div>
      )}

      {/* Bank Info Card (if approved and mode allows) */}
      {canUseBank && (
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 p-5 flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-cyan-200/80">
            <p className="font-semibold text-cyan-300">Bank Transfer Withdrawal</p>
            <p>Funds will be sent to your registered bank account: <strong>{bankInfo.bank_name}</strong> ({bankInfo.account_number}).</p>
          </div>
        </div>
      )}

      {/* Wallet Selection */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-semibold">{t('withdraw.selectWallet')}</h3>
        <div className="relative">
          <select
            value={selectedWalletKey}
            onChange={(e) => { setSelectedWalletKey(e.target.value); setFieldErrors((p) => ({ ...p, wallet: "" })); }}
            className={`w-full appearance-none rounded-xl border bg-[#0A122C] px-4 py-3 text-white ${fieldErrors.wallet ? "border-red-500/60" : "border-white/10"}`}
          >
            <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t('withdraw.selectWallet_plh')}</option>
            {walletOptions.map((w) => (
              <option key={w.key} value={w.key} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                {w.label} ({w.balance.toFixed(7)})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {fieldErrors.wallet && <p className="mt-2 text-xs text-red-300">{fieldErrors.wallet}</p>}

        {selectedWallet && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm text-gray-400">{t('withdraw.availableBalance')}</p>
              <p className="text-lg font-semibold text-cyan-400">{t('withdraw.balance', { balance: selectedWallet.balance.toFixed(7) })}</p>
            </div>
            <div className="flex gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <p className="text-sm text-yellow-200">{t('withdraw.info', { min: MIN_WITHDRAW_AMOUNT, max: MAX_WITHDRAW_AMOUNT })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Form */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-semibold">{t('withdraw.submit')}</h3>
        <form className="space-y-4" onSubmit={handleSubmitWithdraw}>
          <input
            type="number"
            step="any"
            min={MIN_WITHDRAW_AMOUNT}
            max={MAX_WITHDRAW_AMOUNT}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setFieldErrors((p) => ({ ...p, amount: "" })); }}
            className={`w-full rounded-xl border bg-white/5 px-4 py-3 ${fieldErrors.amount ? "border-red-500/60" : "border-white/10"}`}
            placeholder={t('withdraw.amount_plh', { min: MIN_WITHDRAW_AMOUNT, max: MAX_WITHDRAW_AMOUNT })}
          />
          {fieldErrors.amount && <p className="-mt-2 text-xs text-red-300">{fieldErrors.amount}</p>}

          {amountNumber > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex justify-between text-sm text-gray-400">
                <span>{t('withdraw.requestedAmount')}</span>
                <span className="text-white">${Number(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400 mt-1">
                <span>{t('withdraw.charge')}</span>
                <span className="text-amber-400">-${(Number(amount) * 0.05).toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-sm">
                <span className="text-gray-300 font-semibold">{t('withdraw.netReceivable')}</span>
                <span className="text-green-400 font-bold">${(Number(amount) * 0.95).toFixed(2)}</span>
              </div>
            </div>
          )}

          {amountNumber > 0 && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${hasEnoughMainWalletBalance ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
              <p>{t('withdraw.mainRequired', { amount: requiredMainWalletBalance.toFixed(7) })}</p>
              <p>{t('withdraw.mainAvailable', { balance: mainWalletBalance.toFixed(7) })}</p>
              {!hasEnoughMainWalletBalance && <p>{t('withdraw.needExtra', { shortfall: mainWalletShortfall.toFixed(7) })}</p>}
            </div>
          )}

          {/* Network Selection (network_only or both when no bank) */}
          {canUseNetwork && networks.length > 0 && (
            <div className="space-y-3">
              <div className="relative">
                <select
                  value={selectedNetwork}
                  onChange={(e) => { setSelectedNetwork(e.target.value); setFieldErrors((p) => ({ ...p, network: "" })); }}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                >
                  <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{t('withdraw.selectNetwork_plh')}</option>
                  {networks.map((n) => (
                    <option key={n.id} value={n.network_name} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                      {n.display_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              {fieldErrors.network && <p className="mt-1 text-xs text-red-300">{fieldErrors.network}</p>}
              {networks.length > 0 && selectedNetwork && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
                  <p>Destination: <span className="text-white font-mono break-all">{networks.find((n) => n.network_name === selectedNetwork)?.wallet_address}</span></p>
                </div>
              )}
            </div>
          )}

          {/* Bank Info Summary (read-only) */}
          {canUseBank && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300 font-semibold">
                <Building2 className="w-4 h-4 text-cyan-400" /> Destination Bank Account
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Bank:</span><span className="text-white">{bankInfo.bank_name}</span>
                <span className="text-gray-500">Account:</span><span className="text-white">{bankInfo.account_number}</span>
                <span className="text-gray-500">Holder:</span><span className="text-white">{bankInfo.account_holder_name}</span>
                <span className="text-gray-500">SWIFT:</span><span className="text-white">{bankInfo.swift_code}</span>
              </div>
            </div>
          )}

          {isBankingMode && !hasApprovedBank && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              <p className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Please complete your <strong>Banking Setup</strong> before requesting a withdrawal.</p>
            </div>
          )}
          {isNetworkMode && networks.length === 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {t('withdraw.noNetwork')}</p>
            </div>
          )}

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            placeholder={t('withdraw.note_plh')}
          />

          <button
            type="submit"
            disabled={isSubmitting || isLoading || !hasEnoughMainWalletBalance || (isBankingMode && !hasApprovedBank) || (canUseNetwork && !selectedNetwork)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={18} />
            {isSubmitting ? t('withdraw.submitting') : t('withdraw.submitRequest')}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl">
        <div className="border-b border-white/10 p-6">
          <h3 className="text-lg font-semibold">{t('withdraw.history')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-left text-sm text-gray-400">{t('withdraw.date')}</th>
                <th className="p-4 text-left text-sm text-gray-400">{t('withdraw.amount')}</th>
                <th className="p-4 text-left text-sm text-gray-400">{t('withdraw.wallet')}</th>
                <th className="p-4 text-left text-sm text-gray-400">{t('withdraw.network')}</th>
                <th className="p-4 text-left text-sm text-gray-400">{t('withdraw.address')}</th>
                <th className="p-4 text-left text-sm text-gray-400">{t('withdraw.status')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan="6" className="p-6 text-center text-gray-400">{t('withdraw.loadingHistory')}</td></tr>}
              {!isLoading && withdrawals.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">{t('withdraw.noHistory')}</td></tr>}
              {withdrawals.map((w) => {
                const address = w.destination_address || "-";
                const isLong = address.length > 20;
                const label = isLong ? `${address.slice(0, 10)}...${address.slice(-6)}` : address;
                return (
                  <tr key={w.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-gray-400">{formatDate(w.created_at)}</td>
                    <td className="p-4 font-semibold">{formatAmount(w.amount)} USDT</td>
                    <td className="p-4 text-gray-400">{walletLabelMap.get(w.source_wallet) || w.source_wallet}</td>
                    <td className="p-4 text-gray-400">{w.network_name || "-"}</td>
                    <td className="p-4">
                      <button onClick={() => copyAddress(address)} className="flex items-center gap-2 font-mono text-blue-400" type="button">
                        {label} <Copy size={14} />
                      </button>
                    </td>
                    <td className="p-4"><span className={`rounded-full border px-2 py-1 text-xs ${getStatusColor(w.status)}`}>{w.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <StatusFeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
