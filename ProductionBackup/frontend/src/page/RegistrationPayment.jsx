import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import useUserStore from "../store/userStore";
import api from "../api/axiosInstance.js";
import Navbar from "../component/Navbar";
import Button from "../component/Button";
import {
  createDepositRequest,
  getActiveDepositNetworks,
} from "../api/user.api.js";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Send,
  Clock,
} from "lucide-react";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message;

export default function RegistrationPayment() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [pkg, setPkg] = useState(null);
  const [networks, setNetworks] = useState([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [amount, setAmount] = useState("");
  const [txid, setTxid] = useState("");
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.account_status !== "pending_payment") {
      navigate("/dashboard");
      return;
    }
    const load = async () => {
      try {
        const [pkgRes, netRes] = await Promise.all([
          api.get("v1/investments/packages"),
          getActiveDepositNetworks(),
        ]);
        const packages = pkgRes.data?.packages || [];
        const found = packages.find((p) => p.id === user.pending_package_id);
        setPkg(found || null);
        setNetworks(netRes.data?.data || []);
      } catch {
        setError("Failed to load package details");
      } finally {
        setLoadingPkg(false);
      }
    };
    load();
  }, [user, navigate]);

  const network = useMemo(
    () => networks.find((n) => String(n.id) === selectedNetworkId),
    [networks, selectedNetworkId],
  );

  const copyAddress = () => {
    if (!network) return;
    navigator.clipboard.writeText(network.wallet_address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!network || !amount.trim() || !txid.trim()) {
      setError("Please fill all fields");
      return;
    }
    try {
      setSubmitting(true);
      await createDepositRequest({
        network_name: network.network_name,
        amount: amount.trim(),
        txid: txid.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err) || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.account_status !== "pending_payment") {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0A122C] px-4 pt-[120px] pb-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 backdrop-blur-xl">
            {submitted ? (
              <div className="text-center py-8">
                <Check className="mx-auto h-16 w-16 text-green-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Deposit Submitted
                </h2>
                <p className="text-gray-400">
                  Your deposit is pending admin approval. Once approved, your
                  account will be activated and you can access the dashboard.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="h-8 w-8 text-yellow-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Complete Your Payment
                    </h1>
                    <p className="text-sm text-gray-400">
                      Your account is pending payment activation
                    </p>
                  </div>
                </div>

                {loadingPkg ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                  </div>
                ) : pkg ? (
                  <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                    <p className="text-sm text-gray-400">Selected Package</p>
                    <p className="text-lg font-bold text-white">{pkg.name}</p>
                    <p className="mt-1 text-sm text-gray-400">
                      Investment Amount:{" "}
                      <span className="font-semibold text-cyan-300">
                        ${Number(pkg.investment_amount).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Daily:{" "}
                      <span className="font-semibold text-green-300">
                        ${Number(pkg.daily_payment).toFixed(2)}
                      </span>
                      {" | "}Duration:{" "}
                      <span className="font-semibold">{pkg.duration_days} days</span>
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
                    Package details not found. Please contact support.
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">
                      Select Network
                    </label>
                    <div className="relative mt-1">
                      <select
                        value={selectedNetworkId}
                        onChange={(e) => setSelectedNetworkId(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-white/10 bg-[#0A122C] px-4 py-3 text-white"
                      >
                        <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                          Select a network
                        </option>
                        {networks.map((n) => (
                          <option
                            key={n.id}
                            value={String(n.id)}
                            style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                          >
                            {n.display_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {network && (
                    <div>
                      <label className="text-sm text-gray-400">
                        Deposit Address
                      </label>
                      <div className="mt-1 flex gap-2">
                        <div className="flex-1 break-all rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm">
                          {network.wallet_address}
                        </div>
                        <button
                          onClick={copyAddress}
                          type="button"
                          className="rounded-xl border border-blue-500/30 bg-blue-600/20 px-4 py-3 text-blue-400"
                        >
                          {copiedAddress ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-400" />
                        <p className="text-sm text-yellow-200">
                          Send exactly{" "}
                          <strong>${Number(pkg?.investment_amount || 0).toLocaleString()} USDT</strong>{" "}
                          to the address above. Only send USDT on the{" "}
                          {network.display_name} network.
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError(""); }}
                      placeholder="Amount (USDT)"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    />
                    <input
                      value={txid}
                      onChange={(e) => { setTxid(e.target.value); setError(""); }}
                      placeholder="Transaction ID (TXID)"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    />

                    {error && (
                      <p className="text-sm text-red-400">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting || !network}
                      variant="gradient"
                      fullWidth
                    >
                      {submitting ? "Submitting..." : "Submit Payment"}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
