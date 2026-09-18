import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu,
  X,
  Zap,
  LogIn,
  UserPlus,
  ChevronDown,
  LayoutDashboard,
  Shield,
  Facebook,
  Twitter,
  Send,
  Youtube,
  Mail,
  MessageCircle,
} from "lucide-react";
import Button from "./Button";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";
import LanguageSwitcher from "./LanguageSwitcher";
import logo from "../assets/oxford.png";
import { useLocation } from "react-router";

export default function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const token = useUserStore((state) => state.token);
  const logout = useUserStore((state) => state.logout);
  const isLoggedIn = !!token;

  const is_admin = useUserStore.getState().user?.is_admin;

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

 useEffect(() => {
  if (location.state?.scrollTo) {
    const el = document.querySelector(location.state.scrollTo);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }
}, [location]);

  const navLinks = [
    { label: t("nav.home"), href: "#home" },
    { label: t("nav.commitment"), href: "#commitment" },
    { label: t("nav.packages"), action: () => navigate("/packages") },
    { label: t("nav.services"), href: "#services" },
  ];

  const scrollToSection = useCallback((href) => {
    setIsMobileMenuOpen(false);
    if (!href) return;
    const element = document.querySelector(href);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleNavLinkClick = (link) => {
  setIsMobileMenuOpen(false);

  if (link.action) {
    link.action();
    return;
  }

  if (!link.href) return;

  if (window.location.pathname !== "/") {
    navigate("/", { state: { scrollTo: link.href } });
  } else {
    const el = document.querySelector(link.href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
};

  return (
    <>
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? "py-2" : "py-3"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div
            className={`relative rounded-2xl transition-all duration-500 ${
              isScrolled
                ? "bg-[#0a0e27]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-blue-500/10"
                : "bg-gradient-to-r from-[#0a0e27]/40 via-[#0a0e27]/60 to-[#0a0e27]/40 backdrop-blur-md border border-white/5"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3">
              {/* Logo */}
                <a
                href="#home"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/");
                  scrollToSection("#home");
                }}
                className="flex items-center gap-1.5 md:gap-2 group relative z-10 min-w-0"
              >
                <img
                  src={logo}
                  alt={t("nav.logoAlt")}
                  className="w-8 h-8 md:w-12 md:h-12 object-contain flex-shrink-0"
                />
                <div>
                  <div
                    className="text-sm md:text-lg font-bold cursor-pointer whitespace-nowrap"
                    onClick={() => navigate("/")}
                  >
                    <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                      {t("nav.brandName")}
                    </span>
                  </div>
                  <div className="text-[9px] text-cyan-400/80 uppercase tracking-[0.2em] font-semibold -mt-1">
                    {t("nav.tagline")}
                  </div>
                </div>
              </a>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-4">
                {navLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href || "#"}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavLinkClick(link);
                    }}
                    className="relative px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 group"
                  >
                    <span className="relative z-10">{link.label}</span>
                  </a>
                ))}
              </div>

              {/* Language Switcher + Auth + Mobile Hamburger */}
              <div className="flex items-center gap-1 sm:gap-2">
                <LanguageSwitcher />
                <div className="hidden lg:flex items-center gap-2">
                  {!isLoggedIn ? (
                  <>
                    <Button
                      variant="frosted"
                      icon={<LogIn />}
                      onClick={() => navigate("/login")}
                    >
                      {t("nav.login")}
                    </Button>
                    <Button
                      variant="gradient"
                      icon={<Zap />}
                      onClick={() => navigate("/register")}
                    >
                      {t("nav.register")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      icon={<LayoutDashboard />}
                      variant="frosted"
                      onClick={() => navigate("/dashboard")}
                    >
                      {t("nav.dashboard")}
                    </Button>

                    {is_admin && (
                      <Button
                        icon={<Shield />}
                        variant="frosted"
                        onClick={() => navigate("/admin-dashboard")}
                      >
                        {t("nav.admin")}
                      </Button>
                    )}

                    <Button variant="gradient" onClick={handleLogout}>
                      {t("nav.logout")}
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/20 flex items-center justify-center hover:border-cyan-400/40 transition-all duration-300 group"
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-5 h-5 relative z-10" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-5 h-5 relative z-10" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />

            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full bg-gradient-to-br from-[#0a0e27] via-[#0d1137] to-[#0a0e27] border-l border-white/10 z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-6">
                {/* Mobile Header */}
                <div className="flex items-center justify-between mb-8">
                  <div
                    className="flex items-center gap-3"
                    onClick={() => navigate("/")}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/50">
                      <img
                        src={logo}
                        alt={t("nav.logoAltMobile")}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">
                        {t("nav.brandName")}
                      </div>
                      <div className="text-[8px] text-cyan-400/80 uppercase tracking-wider">
                        {t("nav.tagline")}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Action Buttons */}
                {!isLoggedIn ? (
                  <div className="flex flex-col gap-2 mb-6">
                    <Button
                      variant="frosted"
                      icon={<LogIn />}
                      onClick={() => navigate("/login")}
                    >
                      {t("nav.login")}
                    </Button>
                    <Button
                      variant="frosted"
                      icon={<UserPlus />}
                      onClick={() => navigate("/register")}
                    >
                      {t("nav.register")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mb-6">
                    <Button
                      variant="frosted"
                      icon={<LayoutDashboard />}
                      onClick={() => {
                        navigate("/dashboard");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {t("nav.dashboard")}
                    </Button>
                    {is_admin && (
                      <Button
                        variant="frosted"
                        icon={<Shield />}
                        onClick={() => {
                          navigate("/admin-dashboard");
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        {t("nav.admin")}
                      </Button>
                    )}
                    <Button
                      variant="gradient"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {t("nav.logout")}
                    </Button>
                  </div>
                )}

                {/* Mobile Navigation */}
                <div className="space-y-1 mb-6">
                  {navLinks.map((link, idx) => (
                    <motion.a
                      key={idx}
                      href={link.href || "#"}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavLinkClick(link);
                      }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="block px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{link.label}</span>
                        <ChevronDown className="w-4 h-4 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.a>
                  ))}
                </div>
                  {/* Chat With Us */}
<div className="mb-6">
     <a
    href="https://t.me/+aIajLcllDPBlOTE0"
    target="_blank"
    rel="noopener noreferrer"
    className="block"
  >

  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
    <MessageCircle className="w-5 h-5 text-cyan-400" />
    <span className="text-sm text-gray-300">
      {t("nav.chat")} <span className="text-green-400">{t("nav.online")}</span>
    </span>
  </button>
  </a>
</div>
<div className="mb-6 flex justify-center">
  <LanguageSwitcher position="top" />
</div>
   {/* Footer Section */}
<div className="mt-10 pt-6 border-t border-white/10">

  {/* Follow Text */}
  <p className="text-xs text-gray-400 mb-4">
    {t("nav.followUs")}
  </p>

  {/* Social Icons */}
 {/* Social Icons */}
<div className="flex gap-4 justify-center mt-6 mb-6">

  {/* Facebook */}
  <a
    href="https://www.facebook.com/share/1EMeQasFKm/"
    target="_blank"
    rel="noopener noreferrer"
    className="w-10 h-10 rounded-full bg-[#1877F2] 
               flex items-center justify-center 
               text-white
               hover:scale-110 hover:shadow-lg 
               hover:shadow-blue-500/40
               transition-all duration-300"
  >
    <Facebook className="w-5 h-5" />
  </a>

  {/* Telegram */}
  <a
    href="https://t.me/+aIajLcllDPBlOTE0"
    target="_blank"
    rel="noopener noreferrer"
    className="w-10 h-10 rounded-full bg-[#229ED9] 
               flex items-center justify-center 
               text-white
               hover:scale-110 hover:shadow-lg 
               hover:shadow-cyan-500/40
               transition-all duration-300"
  >
    <Send className="w-5 h-5" />
  </a>

  {/* YouTube */}
  <a
    href="https://youtube.com/@oxfordfinancialads?si=d2gVVW5NJBZyGbZF"
    target="_blank"
    rel="noopener noreferrer"
    className="w-10 h-10 rounded-full bg-[#FF0000] 
               flex items-center justify-center 
               text-white
               hover:scale-110 hover:shadow-lg 
               hover:shadow-red-500/40
               transition-all duration-300"
  >
    <Youtube className="w-5 h-5" />
  </a>

  {/* Twitter (X) — Coming Soon */}
  <div
    className="w-10 h-10 rounded-full bg-black 
               flex items-center justify-center 
               text-white opacity-50 cursor-not-allowed
               group relative"
    title={t("nav.comingSoon")}
  >
    <Twitter className="w-5 h-5" />
    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{t("nav.comingSoon")}</span>
  </div>

  {/* Mail */}
  <a
    href="mailto:support.oxfordfinancialads@gmail.com"
    className="w-10 h-10 rounded-full bg-blue-600 
               flex items-center justify-center 
               text-white
               hover:scale-110 hover:shadow-lg 
               hover:shadow-blue-500/40
               transition-all duration-300"
  >
    <Mail className="w-5 h-5" />
  </a>

</div>

  {/* Copyright */}
  <div className="text-[11px] text-gray-100 mb-4">
    {t("nav.copyright", { year: new Date().getFullYear() })}
  </div>

  {/* Footer Links */}
<div className="flex justify-center items-center gap-4 text-[11px] text-gray-100 mt-4 mb-4">

  <span
    onClick={() => navigate("/terms-conditions")}
    className="cursor-pointer  hover:text-cyan-400 transition"
  >
    {t("nav.terms")}
  </span>

  <span className="text-gray-600">|</span>

  <span
    onClick={() => navigate("/privacy-policy")}
    className="cursor-pointer  hover:text-cyan-400 transition"
  >
    {t("nav.privacy")}
  </span>

  <span className="text-gray-600">|</span>

  <span
    onClick={() => navigate("/legal-information")}
    className="cursor-pointer hover:text-cyan-400 transition"
  >
   {t("nav.legal")}
  </span>

</div>
</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
