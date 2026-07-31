import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft } from "lucide-react";


export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#0a0e27]">
     

      <main className="flex min-h-screen items-center justify-center px-6 pt-20">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

        <div className="relative w-full max-w-md text-center">
          <div className="mb-8">
            <h1 className="mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-8xl font-bold text-transparent">
              404
            </h1>
            <h2 className="mb-4 text-2xl font-semibold text-white">
              {t("notFound.title")}
            </h2>
            <p className="text-gray-400">
              {t("notFound.description")}
            </p>
          </div>

          <div className="space-y-3">
            <Link to="/">
              <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-medium text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40">
                <Home className="size-5" />
                {t("notFound.home")}
              </button>
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              <ArrowLeft className="size-5" />
              {t("notFound.goBack")}
            </button>
          </div>
        </div>
      </main>

      
    </div>
  );
}
export default NotFoundPage;
