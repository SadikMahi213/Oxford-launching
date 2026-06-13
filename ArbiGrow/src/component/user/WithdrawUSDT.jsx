import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Copy, Send } from "lucide-react";
import useUserStore from "../../store/userStore.js";
import {
  createWithdrawalRequest,
  getActiveDepositNetworks,
  getMyWithdrawals,
  refreshUserStore,
} from "../../api/user.api.js";
import StatusFeedbackModal from "../StatusFeedbackModal.jsx";

const MIN_WITHDRAW_AMOUNT = 10;
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
  error?.message ||
  "Something went wrong";

const INITIAL_FIELD_ERRORS = {
  wallet: "",
  network: "",
  amount: "",
  destinationAddress: "",
};

const getApiFieldErrors = (error) => {
  const details = error?.response?.data?.detail;
  if (!Array.isArray(details)) return null;

  const mapped = { ...INITIAL_FIELD_ERRORS };
  let hasMappedError = false;

  details.forEach((item) => {
    const field = item?.loc?.[item.loc.length - 1];
    const message = typeof item?.msg === "string" ? item.msg : "Invalid value";

    switch (field) {
      case "source_wallet":
        mapped.wallet = message;
        hasMappedError = true;
        break;
      case "network_name":
        mapped.network = message;
        hasMappedError = true;
        break;
      case "amount":
        mapped.amount = message;
        hasMappedError = true;
        break;
      case "destination_address":
        mapped.destinationAddress = message;
        hasMappedError = true;
        break;
      default:
        break;
    }
  });

  return hasMappedError ? mapped : null;
};

export default function WithdrawPage() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [selectedWalletKey, setSelectedWalletKey] = useState("");
  const [selectedNetworkId, setSelectedNetworkId] = useState("");
  const [networks, setNetworks] = useState([]);
  const [amount, setAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(INITIAL_FIELD_ERRORS);
  const [feedback, setFeedback] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    if (!feedback) return undefined;

    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [feedback]);

  const walletOptions = useMemo(
    () => [
      {
        key: "main_wallet",
        label: "Main Wallet",
        balance: toNumber(user?.main_wallet),
      },
      {
        key: "arbx_wallet",
        label: "OFA token Wallet",
        balance: toNumber(user?.arbx_wallet),
        disabled: true,
      },
      // {
      //   key: "deposit_wallet",
      //   label: "Deposit Wallet",
      //   balance: toNumber(user?.deposit_wallet),
      // },
      // {
      //   key: "withdraw_wallet",
      //   label: "Withdraw Wallet",
      //   balance: toNumber(user?.withdraw_wallet),
      // },
      {
        key: "referral_wallet",
        label: "Referral Wallet",
        balance: toNumber(user?.referral_wallet),
      },
      {
        key: "generation_wallet",
        label: "Generation Wallet",
        balance: toNumber(user?.generation_wallet),
      },
    ],
    [user],
  );

  const selectedWallet = useMemo(
    () => walletOptions.find((wallet) => wallet.key === selectedWalletKey),
    [walletOptions, selectedWalletKey],
  );

  const selectedNetwork = useMemo(
    () => networks.find((network) => String(network.id) === selectedNetworkId),
    [networks, selectedNetworkId],
  );

  const walletLabelMap = useMemo(
    () => new Map(walletOptions.map((wallet) => [wallet.key, wallet.label])),
    [walletOptions],
  );

  const networkDisplayMap = useMemo(
    () =>
      new Map(
        networks.map((network) => [network.network_name, network.display_name]),
      ),
    [networks],
  );

  const amountNumber = useMemo(() => {
    const parsedAmount = Number(amount.trim());
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return 0;
    return parsedAmount;
  }, [amount]);

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
    amountNumber <= 0 || mainWalletShortfall === 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [userResponse, withdrawalsResponse, networksResponse] =
          await Promise.all([
            refreshUserStore(),
            getMyWithdrawals(),
            getActiveDepositNetworks(),
          ]);

        if (userResponse?.data?.user) {
          setUser(userResponse.data.user);
        }

        setWithdrawals(withdrawalsResponse?.data?.data || []);
        setNetworks(networksResponse?.data?.data || []);
      } catch (error) {
        setFeedback({
          type: "error",
          message: getErrorMessage(error),
        });
        setWithdrawals([]);
        setNetworks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [setUser]);

  const handleSubmitWithdraw = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const nextFieldErrors = { ...INITIAL_FIELD_ERRORS };
    const normalizedAmount = amount.trim();
    const parsedAmount = Number(normalizedAmount);
    const normalizedAddress = destinationAddress.trim();

    if (!selectedWalletKey) {
      nextFieldErrors.wallet = "Field required";
    }

    if (!selectedNetworkId) {
      nextFieldErrors.network = "Field required";
    }

    if (!normalizedAmount) {
      nextFieldErrors.amount = "Field required";
    } else if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      nextFieldErrors.amount = "Please enter a valid amount.";
    } else if (parsedAmount < MIN_WITHDRAW_AMOUNT) {
      nextFieldErrors.amount = `Minimum withdrawal amount is ${MIN_WITHDRAW_AMOUNT} USDT.`;
    } else if (selectedWallet && parsedAmount > selectedWallet.balance) {
      nextFieldErrors.amount = `Insufficient balance in ${selectedWallet.label}. Available: ${selectedWallet.balance.toFixed(7)}.`;
    } else if (!hasEnoughMainWalletBalance) {
      nextFieldErrors.amount = `Insufficient Main Wallet balance. Required: ${requiredMainWalletBalance.toFixed(7)} USDT (Amount + 1%), Available: ${mainWalletBalance.toFixed(7)} USDT.`;
    }

    if (!normalizedAddress) {
      nextFieldErrors.destinationAddress = "Field required";
    } else if (normalizedAddress.length < 5) {
      nextFieldErrors.destinationAddress = "Must be at least 5 characters.";
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors(INITIAL_FIELD_ERRORS);
    setIsSubmitting(true);

    try {
      const response = await createWithdrawalRequest({
        source_wallet: selectedWallet.key,
        network_name: selectedNetwork.network_name,
        amount: normalizedAmount,
        destination_address: normalizedAddress,
        note: note.trim(),
      });

      const created = response?.data?.data;
      if (created) {
        setWithdrawals((prev) => [created, ...prev]);
      } else {
        const withdrawalsResponse = await getMyWithdrawals();
        setWithdrawals(withdrawalsResponse?.data?.data || []);
      }

      setFeedback({
        type: "success",
        message:
          "Withdrawal request submitted. It is now pending admin review.",
      });
      setFieldErrors(INITIAL_FIELD_ERRORS);
      setAmount("");
      setDestinationAddress("");
      setNote("");
    } catch (error) {
      const apiFieldErrors = getApiFieldErrors(error);
      if (apiFieldErrors) {
        setFieldErrors(apiFieldErrors);
        return;
      }

      setFeedback({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAddress = (value) => navigator.clipboard.writeText(value);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Withdraw Funds
          </span>
        </h1>
        <p className="text-sm text-gray-400">
          Submit a withdrawal request from your wallet balances
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-semibold">Select Wallet</h3>

        <div className="relative">
          <select
            value={selectedWalletKey}
            onChange={(event) => {
              setSelectedWalletKey(event.target.value);
              setFieldErrors((prev) => ({ ...prev, wallet: "" }));
            }}
            className={`w-full appearance-none rounded-xl border bg-[#0A122C] px-4 py-3 text-white ${
              fieldErrors.wallet ? "border-red-500/60" : "border-white/10"
            }`}
          >
            <option
              value=""
              style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
            >
              Select wallet
            </option>
            {walletOptions.map((wallet) => (
              <option
                key={wallet.key}
                value={wallet.key}
                disabled={wallet.disabled}
                style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
              >
                {wallet.label} ({wallet.balance.toFixed(7)}
                {wallet.disabled ? " (Coming Soon)" : ""})
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {fieldErrors.wallet && (
          <p className="mt-2 text-xs text-red-300">{fieldErrors.wallet}</p>
        )}

        {selectedWallet && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm text-gray-400">Available Balance</p>
              <p className="text-lg font-semibold text-cyan-400">
                {selectedWallet.balance.toFixed(7)} USDT
              </p>
            </div>

            <div className="flex gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <p className="text-sm text-yellow-200">
                Minimum withdrawal amount is {MIN_WITHDRAW_AMOUNT} USDT. The
                standard processing time for withdrawals is 4–6 hours.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-semibold">Select Network</h3>

        <div className="relative">
          <select
            value={selectedNetworkId}
            onChange={(event) => {
              setSelectedNetworkId(event.target.value);
              setFieldErrors((prev) => ({ ...prev, network: "" }));
            }}
            disabled={isLoading || networks.length === 0}
            className={`w-full appearance-none rounded-xl border bg-[#0A122C] px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              fieldErrors.network ? "border-red-500/60" : "border-white/10"
            }`}
          >
            <option
              value=""
              style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
            >
              {isLoading ? "Loading networks..." : "Select network"}
            </option>
            {networks.map((network) => (
              <option
                key={network.id}
                value={String(network.id)}
                style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
              >
                {network.display_name}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {fieldErrors.network && (
          <p className="mt-2 text-xs text-red-300">{fieldErrors.network}</p>
        )}

        {!isLoading && networks.length === 0 && (
          <p className="mt-3 text-sm text-yellow-300">
            No active withdrawal network found. Please contact support.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-semibold">Submit Withdrawal</h3>

        <form className="space-y-4" onSubmit={handleSubmitWithdraw}>
          <input
            type="number"
            step="any"
            min={MIN_WITHDRAW_AMOUNT}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setFieldErrors((prev) => ({ ...prev, amount: "" }));
            }}
            className={`w-full rounded-xl border bg-white/5 px-4 py-3 ${
              fieldErrors.amount ? "border-red-500/60" : "border-white/10"
            }`}
            placeholder={`Amount (min ${MIN_WITHDRAW_AMOUNT} USDT)`}
          />
          {fieldErrors.amount && (
            <p className="-mt-2 text-xs text-red-300">{fieldErrors.amount}</p>
          )}

          {amountNumber > 0 && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                hasEnoughMainWalletBalance
                  ? "border-green-500/30 bg-green-500/10 text-green-200"
                  : "border-red-500/30 bg-red-500/10 text-red-200"
              }`}
            >
              <p>
                Required Main Wallet (Amount + 1%):{" "}
                {requiredMainWalletBalance.toFixed(7)} USDT
              </p>
              <p>Main Wallet Available: {mainWalletBalance.toFixed(7)} USDT</p>
              {!hasEnoughMainWalletBalance && (
                <p>Need extra: {mainWalletShortfall.toFixed(7)} USDT</p>
              )}
            </div>
          )}

          <input
            value={destinationAddress}
            onChange={(event) => {
              setDestinationAddress(event.target.value);
              setFieldErrors((prev) => ({ ...prev, destinationAddress: "" }));
            }}
            className={`w-full rounded-xl border bg-white/5 px-4 py-3 ${
              fieldErrors.destinationAddress
                ? "border-red-500/60"
                : "border-white/10"
            }`}
            placeholder="Destination wallet address"
          />
          {fieldErrors.destinationAddress && (
            <p className="-mt-2 text-xs text-red-300">
              {fieldErrors.destinationAddress}
            </p>
          )}

          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            placeholder="Note (optional)"
          />

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isLoading ||
              networks.length === 0 ||
              !hasEnoughMainWalletBalance
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={18} />
            {isSubmitting ? "Submitting..." : "Submit Withdrawal Request"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl">
        <div className="border-b border-white/10 p-6">
          <h3 className="text-lg font-semibold">Withdrawal History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-left text-sm text-gray-400">Date</th>
                <th className="p-4 text-left text-sm text-gray-400">Amount</th>
                <th className="p-4 text-left text-sm text-gray-400">Wallet</th>
                <th className="p-4 text-left text-sm text-gray-400">Network</th>
                <th className="p-4 text-left text-sm text-gray-400">Address</th>
                <th className="p-4 text-left text-sm text-gray-400">Status</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-400">
                    Loading withdrawal history...
                  </td>
                </tr>
              )}

              {!isLoading && withdrawals.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-400">
                    No withdrawal history found.
                  </td>
                </tr>
              )}

              {withdrawals.map((withdrawal) => {
                const address = withdrawal.destination_address || "-";
                const isLongAddress = address.length > 20;
                const label = isLongAddress
                  ? `${address.slice(0, 10)}...${address.slice(-6)}`
                  : address;
                const networkLabel = withdrawal.network_name
                  ? networkDisplayMap.get(withdrawal.network_name) ||
                    withdrawal.network_name
                  : "-";

                return (
                  <tr
                    key={withdrawal.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="p-4 text-gray-400">
                      {formatDate(withdrawal.created_at)}
                    </td>
                    <td className="p-4 font-semibold">
                      {formatAmount(withdrawal.amount)} USDT
                    </td>
                    <td className="p-4 text-gray-400">
                      {walletLabelMap.get(withdrawal.source_wallet) ||
                        withdrawal.source_wallet}
                    </td>
                    <td className="p-4 text-gray-400">{networkLabel}</td>
                    <td className="p-4">
                      <button
                        onClick={() => copyAddress(address)}
                        className="flex items-center gap-2 font-mono text-blue-400"
                        type="button"
                      >
                        {label}
                        <Copy size={14} />
                      </button>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${getStatusColor(withdrawal.status)}`}
                      >
                        {withdrawal.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <StatusFeedbackModal
        feedback={feedback}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}
