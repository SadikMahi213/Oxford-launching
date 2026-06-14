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
} from "lucide-react";
import { startAd, completeAd, getAdStats } from "../../api/user.api.js";
import useUserStore from "../../store/userStore.js";

export default function AdsView() {
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

  const loadYouTubeAPI = useCallback(() => {
    if (window.YT) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(tag, first);
  }, []);

  useEffect(() => {
    loadYouTubeAPI();
  }, [loadYouTubeAPI]);

  const initPlayer = useCallback((videoId) => {
    if (!window.YT || !window.YT.Player) {
      window.onYouTubeIframeAPIReady = () => initPlayer(videoId);
      return;
    }
    if (playerRef.current) return;
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      height: "100%",
      width: "100%",
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
      },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            setCanComplete(true);
          }
        },
        onError: () => {
          setError("Failed to load video. Please try another ad.");
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
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to start ad");
    }
  };

  useEffect(() => {
    if (!watching || !adSession?.video_id) return;
    const timer = setTimeout(() => initPlayer(adSession.video_id), 100);
    window.onYouTubeIframeAPIReady = () => initPlayer(adSession.video_id);
    return () => {
      clearTimeout(timer);
      if (window.onYouTubeIframeAPIReady === undefined) return;
      window.onYouTubeIframeAPIReady = null;
    };
  }, [watching, adSession?.video_id, initPlayer]);

  useEffect(() => {
    if (!watching || !playerReady || !playerRef.current) return;

    const checkProgress = setInterval(() => {
      try {
        const currentTime = playerRef.current.getCurrentTime();
        if (currentTime >= (adSession?.required_watch_seconds || 30)) {
          setCanComplete(true);
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
    try {
      const res = await completeAd(adSession.ad_view_id);
      const data = res.data || res;
      setResult(data);
      setWatching(false);
      if (playerRef.current) {
        playerRef.current.stopVideo();
      }
      if (data.success) {
        setUser({ main_wallet: data.new_balance });
        await fetchStats();
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Completion failed");
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
            Ad View Tasks
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Watch YouTube ads to earn USDT based on your package
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Earn Per Ad</div>
            <div className="text-2xl font-bold text-purple-400">
              ${Number(stats.earn_per_captcha || 0).toFixed(4)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Today's Progress</div>
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
            <div className="text-xs text-gray-400 mb-1">Remaining Today</div>
            <div className="text-2xl font-bold text-purple-400">{stats.remaining}</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Total Earned (All)</div>
            <div className="text-2xl font-bold text-green-400">
              ${Number(stats.total_earned_all || 0).toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {stats && stats.daily_limit === 0 && (
        <div className="p-6 text-center">
          <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Ad View Package</h3>
          <p className="text-gray-400">
            Purchase an "Ad View" package to start earning by watching YouTube ads.
          </p>
        </div>
      )}

      {stats && stats.daily_limit > 0 && (
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-[#1a1545] to-[#12103a] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Resets in {resetTime()}
              </span>
              <span className="text-gray-400">
                Today: <span className="text-white font-bold">{stats.typed_today}</span> / {stats.daily_limit}
              </span>
            </div>

            {!watching && !result && stats.remaining > 0 && (
              <div className="text-center space-y-4">
                <div className="p-8 rounded-xl bg-black/40 border border-white/10">
                  <Youtube className="w-16 h-16 text-red-400/50 mx-auto" />
                  <p className="text-gray-400 mt-4 text-sm">Click below to watch a YouTube ad and earn</p>
                </div>
                <button
                  onClick={handleStart}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Play className="w-5 h-5" />
                  Watch Ad
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
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading player...
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400 mb-1">{timer}s</div>
                  <p className="text-gray-400 text-sm">
                    {canComplete ? "Watched! Click complete to earn." : "Watching... please wait"}
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
                    <><CheckCircle2 className="w-5 h-5" /> Complete & Earn</>
                  ) : (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Watching... {timer}s</>
                  )}
                </button>
              </div>
            )}

            {result && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="font-bold text-green-400">Ad Completed!</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-green-300">+{Number(result.earned).toFixed(4)} USDT earned</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {result.remaining_today} ads remaining today
                </div>
                <button
                  onClick={() => { setResult(null); }}
                  className="mt-3 w-full p-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold"
                >
                  Watch Next Ad
                </button>
              </div>
            )}

            {stats.remaining <= 0 && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                <div className="text-yellow-400 font-bold mb-1">Daily Limit Reached</div>
                <div className="text-yellow-300/70 text-sm">Come back tomorrow! Resets in {resetTime()}</div>
              </div>
            )}
          </div>

          {stats && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Today's Earnings</span>
                <span className="text-green-400 font-bold">
                  +${Number(stats.total_earned_today || 0).toFixed(4)} USDT
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-400 text-sm">Lifetime Earnings</span>
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
