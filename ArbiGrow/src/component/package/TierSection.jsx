import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { getPackages } from "../../api/user.api";
import Logo from "../../assets/oxford.png";

export default function TierSection({ onSelect }) {
  const { t } = useTranslation();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const res = await getPackages();
        setPackages(res.data?.packages || []);
      } catch (error) {
        console.error("Failed to load packages:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPackages();
  }, []);

  if (loading) {
    return (
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">{t("tierSection.loading")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 pb-20">
      <div className="mx-auto max-w-7xl space-y-16">
        <div>
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                {t("tierSection.title")}
              </h2>
            </div>
            <p className="text-gray-400">
              {t("tierSection.subtitle")}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {packages.map((pkg, pkgIndex) => (
              <motion.button
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pkgIndex * 0.05 }}
                onClick={() => onSelect(pkg)}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0d1428] to-[#0a0e27] p-6 text-left transition-all hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="absolute inset-0 opacity-5">
                  <svg className="size-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id={`circuit-${pkg.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="5" cy="5" r="1" fill="#00d4ff" />
                        <circle cx="35" cy="35" r="1" fill="#00d4ff" />
                        <path d="M5 5 L35 5 L35 35" stroke="#00d4ff" strokeWidth="0.5" fill="none" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#circuit-${pkg.id})`} />
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
                      {pkg.task_type === "ad_view" ? t("tierSection.adViewPackage") : t("tierSection.captchaPackage")}
                    </p>
                    <h3 className="text-xl font-semibold text-white">
                      {pkg.name}
                    </h3>
                  </div>

                  <div className="mb-6">
                    <p className="text-4xl font-bold tracking-tight text-white">
                      ${Number(pkg.investment_amount).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      {t("tierSection.investmentAmount")}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{pkg.task_type === "ad_view" ? t("tierSection.dailyAds") : t("tierSection.dailyCaptcha")}</span>
                      <span className="text-cyan-300 font-medium">{pkg.daily_captcha_limit} {pkg.task_type === "ad_view" ? t("tierSection.ads") : t("tierSection.tasks")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t("tierSection.duration")}</span>
                      <span className="text-cyan-300 font-medium">{pkg.duration_days} {t("tierSection.days")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t("tierSection.dailyPayment")}</span>
                      <span className="text-green-300 font-medium">${Number(pkg.daily_payment).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t("tierSection.totalReturn")}</span>
                      <span className="text-yellow-300 font-medium">${Number(pkg.total_return).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="rounded-md bg-cyan-500/10 px-3 py-1">
                      <p className="text-xs font-medium text-cyan-300">
                        {pkg.task_type === "ad_view"
                          ? t("tierSection.perAd", { seconds: pkg.ad_duration_seconds || 30 })
                          : t("tierSection.perCaptcha", { seconds: pkg.captcha_task_duration_seconds || 30 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1">
                      <div className="size-2 rounded-full bg-blue-400" />
                      <span className="text-xs text-blue-300">{pkg.duration_days} {t("tierSection.days")}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
