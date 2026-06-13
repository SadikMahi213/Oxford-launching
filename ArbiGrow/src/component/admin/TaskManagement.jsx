import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  Users,
  Target,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react";
import {
  getAdminTaskTypes,
  createAdminTaskType,
  updateAdminTaskType,
  toggleAdminTaskType,
  deleteAdminTaskType,
  getAdminTaskStats,
  getAdminUserTasks,
} from "../../api/admin.api.js";
import useUserStore from "../../store/userStore.js";

export default function TaskManagement() {
  const token = useUserStore((state) => state.token);
  const [taskTypes, setTaskTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [generators, setGenerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("types");
  const [showCreate, setShowCreate] = useState(false);
  const [editType, setEditType] = useState(null);
  const [statsDays, setStatsDays] = useState(7);
  const [userSearch, setUserSearch] = useState("");
  const [userTasks, setUserTasks] = useState(null);
  const [expandedType, setExpandedType] = useState(null);

  const [form, setForm] = useState({
    name: "",
    display_name: "",
    description: "",
    icon: "📝",
    generator_key: "",
    difficulty_levels: ["easy", "medium", "hard"],
    default_difficulty: "medium",
    time_limit_seconds: 30,
    points_config: { easy: 1, medium: 2, hard: 3 },
    is_active: true,
    sort_order: 0,
  });

  const fetchTypes = useCallback(async () => {
    try {
      const res = await getAdminTaskTypes(token);
      const data = res.data || res;
      setTaskTypes(data.task_types || []);
      setGenerators(data.available_generators || []);
    } catch (err) {
      console.error("Failed to load task types:", err);
    }
  }, [token]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdminTaskStats(token, statsDays);
      setStats(res.data || res);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, [token, statsDays]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTypes(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchTypes, fetchStats]);

  const handleCreate = async () => {
    try {
      await createAdminTaskType(token, form);
      setShowCreate(false);
      setForm({
        name: "", display_name: "", description: "", icon: "📝",
        generator_key: "", difficulty_levels: ["easy", "medium", "hard"],
        default_difficulty: "medium", time_limit_seconds: 30,
        points_config: { easy: 1, medium: 2, hard: 3 }, is_active: true, sort_order: 0,
      });
      fetchTypes();
    } catch (err) {
      console.error("Failed to create:", err);
    }
  };

  const handleUpdate = async () => {
    if (!editType) return;
    try {
      await updateAdminTaskType(token, editType.id, form);
      setEditType(null);
      fetchTypes();
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleAdminTaskType(token, id);
      fetchTypes();
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this task type?")) return;
    try {
      await deleteAdminTaskType(token, id);
      fetchTypes();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const startEdit = (tt) => {
    setForm({
      name: tt.name,
      display_name: tt.display_name,
      description: tt.description || "",
      icon: tt.icon || "📝",
      generator_key: tt.generator_key,
      difficulty_levels: tt.difficulty_levels || ["easy", "medium", "hard"],
      default_difficulty: tt.default_difficulty || "medium",
      time_limit_seconds: tt.time_limit_seconds || 30,
      points_config: tt.points_config || { easy: 1, medium: 2, hard: 3 },
      is_active: tt.is_active,
      sort_order: tt.sort_order || 0,
    });
    setEditType(tt);
    setShowCreate(true);
  };

  const searchUserTasks = async () => {
    if (!userSearch.trim()) return;
    try {
      const res = await getAdminUserTasks(token, userSearch);
      setUserTasks(res.data || res);
    } catch (err) {
      console.error("Failed to search:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          Task Management
        </h2>
        <button
          onClick={() => { setEditType(null); setShowCreate(true); setForm({
            name: "", display_name: "", description: "", icon: "📝",
            generator_key: generators[0] || "", difficulty_levels: ["easy", "medium", "hard"],
            default_difficulty: "medium", time_limit_seconds: 30,
            points_config: { easy: 1, medium: 2, hard: 3 }, is_active: true, sort_order: 0,
          }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm"
        >
          <Plus className="w-4 h-4" /> New Type
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {[
          { id: "types", label: "Task Types", icon: Target },
          { id: "stats", label: "Statistics", icon: BarChart3 },
          { id: "users", label: "User Tasks", icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab.id
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task Types Tab */}
      {activeTab === "types" && (
        <div className="space-y-3">
          {taskTypes.map((tt) => (
            <div
              key={tt.id}
              className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tt.icon}</span>
                  <div>
                    <div className="font-bold text-white">{tt.display_name}</div>
                    <div className="text-xs text-gray-400">
                      {tt.generator_key} · {tt.time_limit_seconds}s · {tt.difficulty_levels?.join(", ")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      tt.is_active
                        ? "bg-green-500/10 text-green-400 border border-green-500/30"
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                    }`}
                  >
                    {tt.is_active ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => setExpandedType(expandedType === tt.id ? null : tt.id)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    {expandedType === tt.id ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  <button
                    onClick={() => handleToggle(tt.id)}
                    className="p-1"
                  >
                    {tt.is_active ? (
                      <ToggleRight className="w-6 h-6 text-green-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(tt)}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tt.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedType === tt.id && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-400 text-xs">Description</div>
                      <div className="text-white">{tt.description || "—"}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Points</div>
                      <div className="text-white">
                        {Object.entries(tt.points_config || {}).map(([k, v]) => `${k}:${v}`).join(", ")}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Sort Order</div>
                      <div className="text-white">{tt.sort_order}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Created</div>
                      <div className="text-white">
                        {tt.created_at ? new Date(tt.created_at).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === "stats" && stats && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Period:</span>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setStatsDays(d)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  statsDays === d
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-gray-400">Users with Tasks</div>
              <div className="text-2xl font-bold text-white">{stats.total_users_with_tasks}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-gray-400">Generated</div>
              <div className="text-2xl font-bold text-white">{stats.total_tasks_generated}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-gray-400">Completion Rate</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.overall_completion_rate}%</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-gray-400">Accuracy Rate</div>
              <div className="text-2xl font-bold text-green-400">{stats.overall_accuracy_rate}%</div>
            </div>
          </div>

          {stats.tasks_by_type?.length > 0 && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="text-sm font-semibold text-white mb-3">By Task Type</h4>
              <div className="space-y-2">
                {stats.tasks_by_type.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white">
                      {t.icon} {t.name}
                    </span>
                    <div className="flex items-center gap-4 text-gray-400">
                      <span>{t.total} total</span>
                      <span className="text-cyan-400">{t.completed} done</span>
                      <span className="text-green-400">{t.correct} correct</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Tasks Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUserTasks()}
              placeholder="Enter User ID..."
              className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={searchUserTasks}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold"
            >
              Search
            </button>
          </div>

          {userTasks && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-sm text-gray-400 mb-3">
                User {userTasks.user_id} — {userTasks.date} — {userTasks.tasks?.length || 0} tasks
              </div>
              <div className="space-y-2">
                {(userTasks.tasks || []).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">#{t.sort_order + 1}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          t.difficulty === "easy"
                            ? "text-green-400 border-green-500/30"
                            : t.difficulty === "hard"
                            ? "text-red-400 border-red-500/30"
                            : "text-yellow-400 border-yellow-500/30"
                        }`}
                      >
                        {t.difficulty}
                      </span>
                      <span className="text-xs text-gray-400">{t.points}pts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === "completed" ? (
                        t.is_correct ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )
                      ) : (
                        <Activity className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-xs text-gray-400">{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-[#151d45] to-[#10183a] border border-white/10 p-6 max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-white mb-4">
                {editType ? "Edit Task Type" : "Create Task Type"}
              </h3>
              <div className="space-y-3">
                {[
                  { key: "name", label: "Internal Name", placeholder: "e.g. math_challenge" },
                  { key: "display_name", label: "Display Name", placeholder: "e.g. Math Challenge" },
                  { key: "description", label: "Description", placeholder: "Short description" },
                  { key: "icon", label: "Icon (emoji)", placeholder: "📝" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-gray-400 mb-1 block">{field.label}</label>
                    <input
                      type="text"
                      value={form[field.key] || ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      disabled={editType && field.key === "name"}
                      className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                    />
                  </div>
                ))}

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Generator</label>
                  <select
                    value={form.generator_key}
                    onChange={(e) => setForm({ ...form, generator_key: e.target.value })}
                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="">Select generator...</option>
                    {generators.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={form.time_limit_seconds}
                    onChange={(e) => setForm({ ...form, time_limit_seconds: parseInt(e.target.value) || 30 })}
                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 p-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editType ? handleUpdate : handleCreate}
                    className="flex-1 p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold"
                  >
                    {editType ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
