import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Package } from "lucide-react";
import Logo from "../assets/oxford.png";
import api from "../api/axiosInstance.js";

export default function PackagesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("v1/investments/packages").then((res) => {
      setPackages(res.data?.packages || []);
    }).catch(() => {
      setPackages([]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  if (packages.length === 0) return null;

  return (
    <section className="relative py-20 px-6" id="packages">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 mb-6">
            <Package className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              {t("packagesSection.badge")}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("packagesSection.title")}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t("packagesSection.subtitle")}
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg, idx) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0d1428] to-[#0a0e27] p-6 transition-all hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="absolute inset-0 opacity-5">
                <svg className="size-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id={`home-circuit-${pkg.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="5" cy="5" r="1" fill="#00d4ff" />
                      <circle cx="35" cy="35" r="1" fill="#00d4ff" />
                      <path d="M5 5 L35 5 L35 35" stroke="#00d4ff" strokeWidth="0.5" fill="none" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#home-circuit-${pkg.id})`} />
                </svg>
              </div>

              <div className="relative">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br">
                    <img src={Logo} alt="Logo" className="w-12 h-12 object-contain" />
                  </div>
                  <div className="size-10 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 p-1">
                    <div className="size-full rounded-sm bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-80" />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-1 text-xs text-gray-400 tracking-widest">
                    {pkg.task_type === "ad_view" ? t("packagesSection.adViewPackage") : t("packagesSection.captchaPackage")}
                  </p>
                  <h3 className="text-xl font-semibold text-white">{pkg.name}</h3>
                </div>

                <div className="mb-6">
                  <p className="text-4xl font-bold tracking-tight text-white">
                    ${Number(pkg.investment_amount).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">{t("packagesSection.investmentAmount")}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{pkg.task_type === "ad_view" ? t("packagesSection.dailyAds") : t("packagesSection.dailyCaptcha")}</span>
                    <span className="text-cyan-300 font-medium">{pkg.captcha_required_per_day} {pkg.task_type === "ad_view" ? t("packagesSection.ads") : t("packagesSection.tasks")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t("packagesSection.duration")}</span>
                    <span className="text-cyan-300 font-medium">{pkg.duration_days} {t("packagesSection.days")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t("packagesSection.dailyPayment")}</span>
                    <span className="text-green-300 font-medium">${Number(pkg.daily_payment).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t("packagesSection.totalReturn")}</span>
                    <span className="text-yellow-300 font-medium">${Number(pkg.total_return).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="rounded-md bg-cyan-500/10 px-3 py-1">
                    <p className="text-xs font-medium text-cyan-300">
                      {pkg.task_type === "ad_view"
                        ? t("packagesSection.perAd", { seconds: pkg.ad_duration_seconds || 30 })
                        : t("packagesSection.perCaptcha", { seconds: pkg.captcha_task_duration_seconds || 30 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1">
                    <div className="size-2 rounded-full bg-blue-400" />
                    <span className="text-xs text-blue-300">{pkg.duration_days} {t("packagesSection.days")}</span>
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <button
            onClick={() => navigate("/register")}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300"
          >
            {t("packagesSection.getStarted")}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
