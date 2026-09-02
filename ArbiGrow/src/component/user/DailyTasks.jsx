import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  Keyboard,
  DollarSign,
  Clock,
  Zap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { getNextCaptcha, submitCaptcha, getCaptchaStats } from "../../api/user.api.js";
import api from "../../api/axiosInstance.js";
import useUserStore from "../../store/userStore.js";

export default function DailyTasks() {
  const { t } = useTranslation();
  const [captcha, setCaptcha] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [timer, setTimer] = useState(0);
  const [expired, setExpired] = useState(false);
  const [taskAccess, setTaskAccess] = useState(null);
  const { setUser } = useUserStore();

  const fetchTaskAccess = useCallback(async () => {
    try {
      const res = await api.get("v1/captcha/task-access", {
        headers: { Authorization: `Bearer ${useUserStore.getState().token}` },
      });
      setTaskAccess(res.data || res);
    } catch {
      setTaskAccess({ allowed: true });
    }
  }, []);

  useEffect(() => {
    fetchTaskAccess();
  }, [fetchTaskAccess]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getCaptchaStats();
      setStats(res.data || res);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCaptcha = useCallback(async () => {
    setError("");
    setResult(null);
    setUserInput("");
    setCaptcha(null);
    setLoading(true);
    try {
      const res = await getNextCaptcha();
      const data = res.data || res;
      setCaptcha(data);
      setTimer(data.timer_seconds || 60);
      setExpired(false);
      setCooldown(5);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || t('dailyTasks.loading');
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Captcha real-time countdown timer
  useEffect(() => {
    if (!captcha || result || timer <= 0 || expired) return;
    const t = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          handleExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [captcha, result, timer, expired]);

  const handleExpire = async () => {
    setExpired(true);
    try {
      await api.post("v1/captcha/expire", {}, {
        headers: { Authorization: `Bearer ${useUserStore.getState().token}` },
      });
      await fetchStats();
    } catch {}
  };

  const handleSubmit = async () => {
    if (!captcha || !userInput.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await submitCaptcha({ captcha_id: captcha.captcha_id, user_input: userInput.trim() });
      const data = res.data || res;
      setResult(data);
      if (data.success) {
        setUser({ captcha_wallet: data.new_balance });
        await fetchStats();
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || t('dailyTasks.verifying');
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const resetTime = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const diff = tomorrow - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Keyboard className="w-6 h-6 text-cyan-400" />
            {t('dailyTasks.title')}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {t('dailyTasks.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">{t('dailyTasks.earnPerCaptcha')}</div>
            <div className="text-2xl font-bold text-green-400">
              ${Number(stats.earn_per_captcha || 0).toFixed(4)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">{t('dailyTasks.todaysProgress')}</div>
            <div className="text-2xl font-bold text-white">
              {stats.typed_today}/{stats.daily_limit}
            </div>
            <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.daily_limit > 0 ? (stats.typed_today / stats.daily_limit) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">{t('dailyTasks.remainingToday')}</div>
            <div className="text-2xl font-bold text-cyan-400">{stats.remaining}</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">{t('dailyTasks.totalEarned')}</div>
            <div className="text-2xl font-bold text-green-400">
              ${Number(stats.total_earned_all || 0).toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {/* Task Access Blocked */}
      {taskAccess && !taskAccess.allowed && (
        <div className="max-w-lg mx-auto">
          <div className={`p-6 rounded-2xl border ${
            taskAccess.status === "suspended" 
              ? "bg-red-900/30 border-red-500/30" 
              : "bg-orange-900/30 border-orange-500/30"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {taskAccess.status === "suspended" ? (
                <AlertCircle className="w-8 h-8 text-red-400" />
              ) : (
                <AlertCircle className="w-8 h-8 text-orange-400" />
              )}
              <div>
                <h3 className={`text-lg font-bold ${
                  taskAccess.status === "suspended" ? "text-red-400" : "text-orange-400"
                }`}>
                  {taskAccess.status === "suspended" ? "Account Suspended" : "Task Access Restricted"}
                </h3>
                <p className="text-gray-400 text-sm">
                  {taskAccess.status === "suspended" 
                    ? "Your account has been temporarily suspended due to task violations."
                    : "Your daily task access has been restricted."}
                </p>
              </div>
            </div>
            <p className="text-gray-300 mb-4">{taskAccess.reason}</p>
            {taskAccess.expires_at && (
              <p className="text-sm text-gray-400">
                Expires: {new Date(taskAccess.expires_at).toLocaleString()}
              </p>
            )}
            {taskAccess.status === "warning" && (
              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  Warning: {taskAccess.warning}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No active package */}
      {stats && stats.daily_limit === 0 && (
        <div className="p-6 text-center">
          <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{t('dailyTasks.noPackageTitle')}</h3>
          <p className="text-gray-400">
            {t('dailyTasks.noPackageDesc')}
          </p>
        </div>
      )}

      {/* Main captcha area */}
      {stats && stats.daily_limit > 0 && (
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-[#151d45] to-[#10183a] border border-white/10 p-6 space-y-4">
            {/* Reset timer */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {t('dailyTasks.resetsIn', { time: resetTime() })}
              </span>
              {stats && (
                <span className="text-gray-400">
                    {t('dailyTasks.today')} <span className="text-white font-bold">{stats.typed_today}</span> / {stats.daily_limit}
                </span>
              )}
            </div>

            {/* Timer bar */}
            {captcha && !result && !expired && (
              <div className="space-y-2 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t('dailyTasks.timeRemaining')}
                  </span>
                  <span className={`font-mono font-bold ${timer <= 10 ? "text-red-400" : "text-cyan-400"}`}>
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      timer <= 10 ? "bg-red-500" : "bg-gradient-to-r from-cyan-500 to-blue-500"
                    }`}
                    style={{ width: `${captcha && captcha.timer_seconds ? ((captcha.timer_seconds - timer) / captcha.timer_seconds) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Expired state */}
            {expired && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-yellow-300 font-bold mb-1">{t('dailyTasks.expired')}</p>
                <p className="text-yellow-300/70 text-xs mb-3">{t('dailyTasks.expiredDesc')}</p>
                <button
                  onClick={() => { setCaptcha(null); setResult(null); setExpired(false); setUserInput(""); fetchCaptcha(); }}
                  className="w-full p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold"
                >
                  {t('dailyTasks.getNextCaptcha')}
                </button>
              </div>
            )}

            {/* Captcha display */}
            {captcha && !result && !expired && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center flex-1 max-w-[340px]">
                    <img
                      src={`data:image/png;base64,${captcha.captcha_image}`}
                      alt="captcha"
                      className="mx-auto rounded-lg select-none w-full"
                      style={{ maxWidth: "100%", height: "auto" }}
                      draggable={false}
                    />
                  </div>
                  <button
                    onClick={fetchCaptcha}
                    disabled={loading || submitting}
                    title={t('dailyTasks.getNewCaptcha')}
                    aria-label={t('dailyTasks.getNewCaptcha')}
                    className="shrink-0 p-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !submitting && handleSubmit()}
                  disabled={submitting}
                  placeholder={t('dailyTasks.captchaPlaceholder')}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 font-mono text-center text-xl tracking-widest uppercase"
                />

                <button
                  onClick={handleSubmit}
                  disabled={submitting || userInput.trim() === ""}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {submitting ? t('dailyTasks.verifying') : t('dailyTasks.submitAnswer')}
                </button>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`p-4 rounded-xl border ${result.success ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`font-bold ${result.success ? "text-green-400" : "text-red-400"}`}>
                    {result.success ? t('dailyTasks.correct') : t('dailyTasks.wrong')}
                  </span>
                </div>
                {result.success && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-green-300">{t('dailyTasks.earned', { amount: Number(result.earned).toFixed(4) })}</span>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {t('dailyTasks.remainingCaptchas', { count: result.remaining_today })}
                </div>
                <button
                  onClick={() => { setResult(null); setCaptcha(null); setUserInput(""); setTimer(0); setExpired(false); fetchCaptcha(); }}
                  className="mt-3 w-full p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold"
                >
                  {t('dailyTasks.getNextCaptcha')}
                </button>
              </div>
            )}

            {/* Error */}
            {error && !captcha && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Initial state / get new captcha */}
            {!captcha && !result && !error && stats.remaining > 0 && (
              <button
                onClick={fetchCaptcha}
                disabled={loading || cooldown > 0}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : cooldown > 0 ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Keyboard className="w-4 h-4" />
                )}
                {loading ? t('dailyTasks.loading') : cooldown > 0 ? t('dailyTasks.waitSeconds', { count: cooldown }) : t('dailyTasks.getNewCaptcha')}
              </button>
            )}

            {/* Daily limit reached */}
            {stats.remaining <= 0 && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                <div className="text-yellow-400 font-bold mb-1">{t('dailyTasks.dailyLimitReached')}</div>
                <div className="text-yellow-300/70 text-sm">{t('dailyTasks.comeBack', { time: resetTime() })}</div>
              </div>
            )}
          </div>

          {/* Today's earnings summary */}
          {stats && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{t('dailyTasks.todaysEarnings')}</span>
                <span className="text-green-400 font-bold">
                  +${Number(stats.total_earned_today || 0).toFixed(4)} USDT
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-400 text-sm">{t('dailyTasks.lifetimeEarnings')}</span>
                <span className="text-cyan-400 font-bold">
                  ${Number(stats.total_earned_all || 0).toFixed(4)} USDT
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {!stats && loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
