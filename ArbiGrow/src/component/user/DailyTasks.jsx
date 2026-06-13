import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Target,
  ChevronRight,
  Zap,
  RotateCcw,
  Lock,
} from "lucide-react";
import { getTodayTasks, completeTask, getTaskHistory } from "../../api/user.api.js";

const difficultyColors = {
  easy: "text-green-400 bg-green-500/10 border-green-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  hard: "text-red-400 bg-red-500/10 border-red-500/30",
};

const statusColors = {
  pending: "border-white/10 hover:border-cyan-500/50",
  completed: "border-green-500/30 bg-green-500/5",
};

export default function DailyTasks() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTodayTasks();
      const data = res.data || res;
      setTasks(data.tasks || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    let interval;
    if (timerActive) {
      interval = setInterval(() => setTimeSpent((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const startTask = (task) => {
    setCurrentTask(task);
    setUserAnswer("");
    setResult(null);
    setTimeSpent(0);
    setTimerActive(true);
  };

  const submitAnswer = async () => {
    if (!currentTask || userAnswer.trim() === "") return;
    setSubmitting(currentTask.id);
    setTimerActive(false);
    try {
      const res = await completeTask(currentTask.id, {
        user_answer: userAnswer.trim(),
        time_spent_seconds: timeSpent,
      });
      const data = res.data || res;
      setResult(data);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === currentTask.id
            ? { ...t, status: "completed", is_correct: data.is_correct, user_answer: userAnswer.trim() }
            : t
        )
      );
      setSummary((prev) => (prev ? { ...prev, ...data.daily_progress } : prev));
    } catch (err) {
      console.error("Failed to submit:", err);
    } finally {
      setSubmitting(null);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await getTaskHistory(7);
      setHistory(res.data || res);
      setShowHistory(true);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center">
        <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Tasks Available</h3>
        <p className="text-gray-400">
          You need an active investment package to receive daily tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-cyan-400" />
            Daily Tasks
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Complete all tasks to unlock today's earning
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/50 transition-all text-sm"
        >
          <Clock className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Progress</div>
            <div className="text-2xl font-bold text-white">
              {summary.completed_tasks}/{summary.total_tasks}
            </div>
            <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${summary.progress_percent}%` }}
              />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Points</div>
            <div className="text-2xl font-bold text-cyan-400">
              {summary.earned_points}/{summary.total_points}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Remaining</div>
            <div className="text-2xl font-bold text-white">{summary.remaining_tasks}</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Earning</div>
            <div className="flex items-center gap-2">
              {summary.is_eligible_for_earning ? (
                <span className="text-green-400 font-bold flex items-center gap-1">
                  <Zap className="w-4 h-4" /> Unlocked
                </span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <Lock className="w-4 h-4" /> Locked
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Grid */}
      {!currentTask && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.map((task) => (
            <motion.button
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => task.status !== "completed" && startTask(task)}
              disabled={task.status === "completed"}
              className={`p-4 rounded-xl border text-left transition-all duration-300 ${
                statusColors[task.status]
              } ${task.status !== "completed" ? "cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{task.task_type_icon || "📝"}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      difficultyColors[task.difficulty]
                    }`}
                  >
                    {task.difficulty}
                  </span>
                  <span className="text-[10px] text-gray-400">+{task.points}pts</span>
                </div>
              </div>
              <div className="text-sm font-medium text-white mb-1">
                {task.task_type_name || "Task"}
              </div>
              <div className="text-xs text-gray-400 line-clamp-2">
                {task.payload?.question || "Complete this task"}
              </div>
              {task.status === "completed" && (
                <div className="mt-2 flex items-center gap-1">
                  {task.is_correct ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span
                    className={`text-xs ${task.is_correct ? "text-green-400" : "text-red-400"}`}
                  >
                    {task.is_correct ? "Correct" : "Wrong"}
                  </span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Active Task Modal */}
      <AnimatePresence>
        {currentTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => {
              if (!submitting) {
                setCurrentTask(null);
                setTimerActive(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-[#151d45] to-[#10183a] border border-white/10 p-6"
            >
              {/* Task Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{currentTask.task_type_icon || "📝"}</span>
                  <div>
                    <div className="font-bold text-white">
                      {currentTask.task_type_name || "Task"}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        difficultyColors[currentTask.difficulty]
                      }`}
                    >
                      {currentTask.difficulty} +{currentTask.points}pts
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Time</div>
                  <div className="font-mono text-white font-bold">{formatTime(timeSpent)}</div>
                </div>
              </div>

              {/* Question */}
              <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-sm text-gray-300 mb-2">
                  {currentTask.payload?.question}
                </div>
                {currentTask.payload?.display_content && (
                  <div className="font-mono text-lg text-cyan-400 bg-black/30 rounded-lg p-3 select-all break-all">
                    {currentTask.payload.display_content}
                  </div>
                )}
              </div>

              {/* Result */}
              {result && (
                <div
                  className={`mb-4 p-4 rounded-xl border ${
                    result.is_correct
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {result.is_correct ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span
                      className={`font-bold ${
                        result.is_correct ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {result.is_correct ? "Correct!" : "Wrong"}
                    </span>
                  </div>
                  {!result.is_correct && (
                    <div className="text-sm text-gray-300">
                      Answer: <span className="text-white font-mono">{currentTask.answer}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    +{result.points_earned || 0} points
                  </div>
                </div>
              )}

              {/* Input */}
              {!result && (
                <>
                  {currentTask.payload?.input_type === "multiple_choice" ? (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {(currentTask.payload?.options || []).map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => setUserAnswer(opt)}
                          disabled={submitting !== null}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            userAnswer === opt
                              ? "border-cyan-500 bg-cyan-500/10 text-white"
                              : "border-white/10 text-gray-300 hover:border-white/30"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !result && submitAnswer()}
                        disabled={submitting !== null}
                        placeholder="Type your answer..."
                        autoFocus
                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 font-mono"
                      />
                      {currentTask.payload?.case_sensitive === false && (
                        <div className="text-xs text-gray-500 mt-1">Case-insensitive</div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {!result ? (
                  <>
                    <button
                      onClick={() => {
                        setCurrentTask(null);
                        setTimerActive(false);
                      }}
                      disabled={submitting !== null}
                      className="flex-1 p-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      Close
                    </button>
                    <button
                      onClick={submitAnswer}
                      disabled={submitting !== null || userAnswer.trim() === ""}
                      className="flex-1 p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setCurrentTask(null);
                      setResult(null);
                    }}
                    className="flex-1 p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold"
                  >
                    {currentTask.id === tasks[tasks.length - 1]?.id ? "View Results" : "Next Task"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && history && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-[#151d45] to-[#10183a] border border-white/10 p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Task History (7 days)
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-xs text-gray-400">Generated</div>
                  <div className="text-lg font-bold text-white">{history.total_tasks}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-xs text-gray-400">Completed</div>
                  <div className="text-lg font-bold text-cyan-400">{history.total_completed}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-xs text-gray-400">Correct</div>
                  <div className="text-lg font-bold text-green-400">{history.total_correct}</div>
                </div>
              </div>

              <div className="space-y-2">
                {(history.daily_stats || []).map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="text-sm text-white">{day.date}</div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-400">
                        {day.completed}/{day.total} done
                      </span>
                      <span className="text-green-400">{day.correct} correct</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
