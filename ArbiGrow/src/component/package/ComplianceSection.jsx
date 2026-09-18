import { useTranslation } from "react-i18next";
import { AlertTriangle, Shield, Cpu, CheckCircle2 } from "lucide-react";

export default function ComplianceSection() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-white/5 bg-[#070b1f] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 backdrop-blur-sm">
            <AlertTriangle className="size-4 text-red-300" />
            <span className="text-sm text-red-300">{t("complianceSection.badge")}</span>
          </div>
          <h2 className="mb-4 text-3xl font-semibold text-white">
            {t("complianceSection.title")}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card p-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <Shield className="size-6 text-cyan-400" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              {t("complianceSection.card1Title")}
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {t("complianceSection.card1Desc")}
            </p>
          </div>

          <div className="glass-card p-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10">
              <Cpu className="size-6 text-blue-400" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              {t("complianceSection.card2Title")}
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {t("complianceSection.card2Desc")}
            </p>
          </div>

          <div className="glass-card p-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="size-6 text-green-400" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              {t("complianceSection.card3Title")}
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {t("complianceSection.card3Desc")}
            </p>
          </div>

          <div className="glass-card p-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
              <AlertTriangle className="size-6 text-red-400" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              {t("complianceSection.card4Title")}
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {t("complianceSection.card4Desc")}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-6">
          <h3 className="mb-2 text-lg font-semibold text-indigo-400">
            {t("complianceSection.additionalTitle")}
          </h3>
          <ul className="ml-4 list-disc text-sm text-gray-400 space-y-1">
            <li>{t("complianceSection.feature1")}</li>
            <li>{t("complianceSection.feature2")}</li>
            <li>{t("complianceSection.feature3")}</li>
            <li>{t("complianceSection.feature4")}</li>
          </ul>
        </div>

        <div className="mt-8 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-6">
          <p className="text-xs leading-relaxed text-gray-400">
            <strong className="text-yellow-400">{t("complianceSection.legalNotice")}</strong> {t("complianceSection.legalText")}
          </p>
        </div>
      </div>
    </section>
  );
}
