import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../component/Navbar";
import { Hero } from "../component/Hero";
import ExecutiveSummary from "../component/ExecutiveSummary";
import Footer from "../component/Footer";
import { SecurityCompliance } from "../component/SecurityCompliance";
import { GlobalCertifications } from "../component/GlobalCertifications";
import { SecurityStandards } from "../component/SecurityStandards";
import { CorporateIntegrity } from "../component/CorporateIntegrity";
import Founders from "../component/Founder";
import { PrivacySecurity } from "../component/PrivacySecurity";
import { WhyChooseUs } from "../component/WhyChooseUs";
import { MemberBenefits } from "../component/MemberBenefits";
import { PlatformStatistics } from "../component/PlatformStatistics.jsx";
import { getPlatformStats } from "../api/admin.api.js";

const Home = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getPlatformStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load platform stats", error);
      }
    };

    fetchStats();
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <Navbar />
      <div id="home">
        <Hero />
      </div>
      <ExecutiveSummary />
      <div className="flex justify-center my-8 md:my-12">
        <img
          src="/WhatsApp%20Image%202026-06-24%20at%2021.12.20%20(1).jpeg"
          alt={t("homePage.imageAlt")}
          className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl h-auto object-contain rounded-2xl"
        />
      </div>
      <div id="services">
        <WhyChooseUs />
      </div>
      <MemberBenefits />
            {stats && <PlatformStatistics stats={stats} />}
      <div id="founders">
        <Founders />
      </div>
      <div id="commitment">
        <SecurityCompliance />
      </div>
      <div id="certifications">
        <GlobalCertifications />
      </div>
      <div id="security">
        <SecurityStandards />
      </div>
      <div id="corporate">
        <CorporateIntegrity />
      </div>
      <div id="privacy">
        <PrivacySecurity />
      </div>
      <Footer />
    </div>
  );
};

export default Home;
