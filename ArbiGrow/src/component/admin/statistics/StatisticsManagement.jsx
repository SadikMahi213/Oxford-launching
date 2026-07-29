// Admin - Main Statistics Management Component

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

import { StatisticsHeader } from "./StatisticsHeader";
import { StatisticsForm } from "./StatisticsForm";

import {
  getPlatformStats,
  createPlatformStats,
  updatePlatformStats,
} from "../../../api/admin.api.js";

import useUserStore from "../../../store/userStore";

export function StatisticsManagement() {
  const token = useUserStore((state) => state.token);

  const [stats, setStats] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load stats from API
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getPlatformStats(token);
      setStats(data);
      // console.log("menesment Data", data);
    } catch (err) {
      console.error("Failed to fetch statistics", err);
    } finally {
      setLoading(false);
    }
  };

  // Save stats
  const handleSave = async (updatedStats) => {
    try {
      if (!stats?.id) {
        await createPlatformStats(token, updatedStats);
      } else {
        await updatePlatformStats(token, updatedStats);
      }

      await fetchStats();

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to update statistics", err);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading statistics...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <StatisticsHeader />

      {/* Statistics Form */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6">
        {<StatisticsForm initialStats={stats} onSave={handleSave} />}
      </div>
    </div>
  );
}
