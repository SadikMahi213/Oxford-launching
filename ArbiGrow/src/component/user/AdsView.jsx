import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import {
  Play,
  CheckCircle2,
  Clock,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Eye,
  Youtube,
  X,
} from "lucide-react";
import { startAd, completeAd, getAdStats } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";

export default function AdsView() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [adSession, setAdSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canComplete, setCanComplete] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [playerReady, setPlayerReady] = useState(false);
  const { setUser } = useUserStore();
  const timerRef = useRef(null);
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const openSessionRef = useRef(null);
  const completingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdStats();
      setStats(res.data || res);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Tracks the currently open (uncompleted, no-result) session id so that
  // leaving the page reports the abandon. Null-safe: cleared on completion.
  openSessionRef.current =
    watching && adSession && !result ? adSession.ad_view_id : null;

  const sendAbandon = useCallback((adViewId) => {
    if (!adViewId || completingRef.current) return;
    try {
      const token = useUserStore.getState().token;
      fetch(`/api/v1/ads/abandon?ad_view_id=${adViewId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    // SPA route navigation away from this page.
    // Page refresh / tab close.
    const onPageHide = () => {
      const vid = openSessionRef.current;
      if (vid) {
        openSessionRef.current = null;
        sendAbandon(vid);
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      const vid = openSessionRef.current;
      if (vid) {
        openSessionRef.current = null;
        sendAbandon(vid);
      }
    };
  }, [sendAbandon]);

  const initPlayer = useCallback((videoId) => {
    if (!window.YT || !window.YT.Player) {
      window.onYouTubeIframeAPIReady = () => initPlayer(videoId);
      return;
    }
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      height: "100%",
      width: "100%",
      playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1, enablejsapi: 1 },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: () => {},
        onError: () => {
          setError(t('adsView.failedLoadVideo'));
          setWatching(false);
          setAdSession(null);
        },
      },
    });
  }, []);

  const handleStart = async () => {
    setError("");
    setResult(null);
    setPlayerReady(false);
    try {
      const res = await startAd();
      const data = res.data || res;
      setAdSession(data);
      setWatching(true);
      setTimer(data.duration_seconds || 30);
      setCanComplete(false);
      // A start consumes one daily unit server-side: refresh the display.
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('adsView.failedStartAd'));
    }
  };

  useEffect(() => {
    if (!watching || !adSession?.video_id) return;
    initPlayer(adSession.video_id);
    window.onYouTubeIframeAPIReady = () => initPlayer(adSession.video_id);
    return () => {
      if (window.onYouTubeIframeAPIReady === undefined) return;
      window.onYouTubeIframeAPIReady = null;
    };
  }, [watching, adSession?.video_id, initPlayer]);

  useEffect(() => {
    if (!watching || !playerReady || !playerRef.current) return;

    const checkProgress = setInterval(() => {
      try {
        const currentTime = playerRef.current.getCurrentTime();
        const state = playerRef.current.getPlayerState();
        const required = adSession?.required_watch_seconds || 30;
        if (currentTime >= required) {
          setCanComplete(true);
        } else if (state === window.YT.PlayerState.ENDED && currentTime < required) {
          setError(t('adsView.videoShortError'));
        }
      } catch {}
    }, 1000);

    return () => clearInterval(checkProgress);
  }, [watching, playerReady, adSession?.required_watch_seconds]);

  useEffect(() => {
    if (!watching || !playerReady || canComplete) return;
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [watching, playerReady, canComplete]);

  const handleComplete = async () => {
    if (!adSession) return;
    setError("");
    completingRef.current = true;
    try {
      const res = await completeAd(adSession.ad_view_id);
      const data = res.data || res;
      setResult(data);
      setWatching(false);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (data.success) {
        setUser({ ad_view_wallet: data.new_balance });
      }
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('adsView.completionFailed'));
      // Refresh counts even on rejection: early exits still consume units.
      await fetchStats();
    } finally {
      completingRef.current = false;
    }
  };

  const stopWatching = () => {
    setWatching(false);
    setCanComplete(false);
    setPlayerReady(false);
    setTimer(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
  };

  // Deliberate early exit: ends the session through the existing complete
  // endpoint. The backend stays authoritative — an early session is rejected
  // (no reward, early-exit error per existing business rules), while a fully
  // watched session completes normally even via this button.
  const handleExitAd = async () => {
    if (!adSession || !watching) return;
    setError("");
    completingRef.current = true;
    try {
      const res = await completeAd(adSession.ad_view_id);
      const data = res.data || res;
      setResult(data);
      stopWatching();
      if (data.success) {
        setUser({ ad_view_wallet: data.new_balance });
      }
      await fetchStats();
    } catch (err) {
      stopWatching();
      setAdSession(null);
      setResult({ success: false, exited: true });
      setError(err.response?.data?.detail || err.message || t('adsView.completionFailed'));
      await fetchStats();
    } finally {
      completingRef.current = false;
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Eye className="w-6 h-6 text-purple-400" />
            {t('adsView.title')}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {t('adsView.subtitle')}
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">{t('adsView.earnPerAd')}</div>
            <div className="text-2xl font-bold text-purple-400">
              ${Number(stats.earn_per_captcha || 0).toFixed(4)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">{t('adsView.todaysProgress')}</div>
            <div className="text-2xl font-bold text-white">
              {stats.typed_today}/{stats.daily_limit}
            </div>
            <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.daily_limit > 0 ? (stats.typed_today / stats.daily_limit) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">{t('adsView.remainingToday')}</div>
            <div className="text-2xl font-bold text-purple-400">{stats.remaining}</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">{t('adsView.totalEarned')}</div>
            <div className="text-2xl font-bold text-green-400">
              ${Number(stats.total_earned_all || 0).toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {stats && stats.daily_limit === 0 && (
        <div className="p-6 text-center">
          <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{t('adsView.noPackageTitle')}</h3>
          <p className="text-gray-400">
            {t('adsView.noPackageDesc')}
          </p>
        </div>
      )}

      {stats && stats.daily_limit > 0 && (
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-[#1a1545] to-[#12103a] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {t('adsView.resetsIn', { time: resetTime() })}
              </span>
              <span className="text-gray-400">
                {t('adsView.today')} <span className="text-white font-bold">{stats.typed_today}</span> / {stats.daily_limit}
              </span>
            </div>

            {!watching && !result && stats.remaining > 0 && (
              <div className="text-center space-y-4">
                <div className="p-8 rounded-xl bg-black/40 border border-white/10">
                  <Youtube className="w-16 h-16 text-red-400/50 mx-auto" />
                  <p className="text-gray-400 mt-4 text-sm">{t('adsView.clickToWatch')}</p>
                </div>
                <button
                  onClick={handleStart}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Play className="w-5 h-5" />
                  {t('adsView.watchAd')}
                </button>
              </div>
            )}

            {watching && adSession && (
              <div className="text-center space-y-4">
                {adSession.title && (
                  <div className="text-white font-semibold text-sm truncate">{adSession.title}</div>
                )}
                <div className="rounded-xl overflow-hidden bg-black/60 border border-white/10" style={{ aspectRatio: "16/9" }}>
                  <div ref={playerContainerRef} className="w-full h-full" />
                  {!playerReady && (
                    <div className="w-full h-full flex items-center justify-center bg-black/80 text-gray-400 text-sm">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> {t('adsView.loadingPlayer')}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400 mb-1">{t('adsView.seconds', { count: timer })}</div>
                  <p className="text-gray-400 text-sm">
                    {canComplete ? t('adsView.watchedEarn') : error ? t('adsView.videoTooShort') : t('adsView.watchRequired', { seconds: adSession?.required_watch_seconds || 30 })}
                  </p>
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((adSession.duration_seconds - timer) / adSession.duration_seconds) * 100)}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleComplete}
                  disabled={!canComplete}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {canComplete ? (
                    <><CheckCircle2 className="w-5 h-5" /> {t('adsView.completeAndEarn')}</>
                  ) : (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> {t('adsView.watchingSeconds', { count: timer })}</>
                  )}
                </button>
                {!canComplete && (
                  <button
                    onClick={handleExitAd}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold hover:text-red-300 hover:border-red-500/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" /> Exit Ad
                  </button>
                )}
              </div>
            )}

            {result && result.exited && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <X className="w-5 h-5 text-yellow-400" />
                  <span className="font-bold text-yellow-400">Ad session ended</span>
                </div>
                <p className="text-yellow-300/70 text-xs mb-3">Exited before completion — no reward earned.</p>
                <button
                  onClick={handleStart}
                  className="mt-1 w-full p-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold"
                >
                  {t('adsView.watchNextAd')}
                </button>
              </div>
            )}

            {result && !result.exited && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="font-bold text-green-400">{t('adsView.adCompleted')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-green-300">{t('adsView.earned', { amount: Number(result.earned).toFixed(4) })}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {t('adsView.adsRemaining', { count: result.remaining_today })}
                </div>
                <button
                  onClick={handleStart}
                  className="mt-3 w-full p-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold"
                >
                  {t('adsView.watchNextAd')}
                </button>
              </div>
            )}

            {stats.remaining <= 0 && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                <div className="text-yellow-400 font-bold mb-1">{t('adsView.dailyLimitReached')}</div>
                <div className="text-yellow-300/70 text-sm">{t('adsView.comeBack', { time: resetTime() })}</div>
              </div>
            )}
          </div>

          {stats && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{t('adsView.todaysEarnings')}</span>
                <span className="text-green-400 font-bold">
                  +${Number(stats.total_earned_today || 0).toFixed(4)} USDT
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-400 text-sm">{t('adsView.lifetimeEarnings')}</span>
                <span className="text-purple-400 font-bold">
                  ${Number(stats.total_earned_all || 0).toFixed(4)} USDT
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!stats && loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
