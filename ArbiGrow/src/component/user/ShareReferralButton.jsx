import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2, Check, Copy } from "lucide-react";
import useUserStore from "../../store/userStore";

export default function ShareReferralButton() {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const [copied, setCopied] = useState(false);

  const referralLink = user?.username
    ? `${window.location.origin}/register?ref_code=${user.username}`
    : "";

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("shareReferral.shareTitle"),
          text: t("shareReferral.shareText", { link: referralLink }),
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          {t("shareReferral.copied")}
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          {t("shareReferral.shareLink")}
        </>
      )}
    </button>
  );
}
