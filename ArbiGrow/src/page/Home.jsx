import React, { useEffect, useState } from "react";
import Navbar from "../component/Navbar";
import { Hero } from "../component/Hero";
import ExecutiveSummary from "../component/ExecutiveSummary";
import TechnicalArchitecture from "../component/TechnicalArchitecture";
import CoreFeatures from "../component/CoreFeatures";
import SecurityAudit from "../component/SecurityAudit";
import Roadmap from "./Roadmap.jsx";
import Legal from "../component/Legal";
import Founders from "../component/Founder";
import Privacy from "../component/Privachy";
import FAQ from "../component/FAQ";
import Footer from "../component/Footer";
import { SecurityCompliance } from "../component/SecurityCompliance";
import { TradingAnalytics } from "../component/TradingAnalytics";
import { WhyChooseUs } from "../component/WhyChooseUs";
import { MemberBenefits } from "../component/MemberBenefits";
import { OurInvestors } from "../component/OurInvestors";
import { PlatformStatistics } from "../component/PlatformStatistics.jsx";
import { getPlatformStats } from "../api/admin.api.js";


const Home = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getPlatformStats();
        setStats(data);
        // console.log("Static Data", data)
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
      <SecurityCompliance />
      {/* <TradingAnalytics /> */}
      {stats && <PlatformStatistics stats={stats} />}
      <WhyChooseUs />
      <MemberBenefits />

      <div id="architecture">
        <TechnicalArchitecture />
      </div>
      <div id="features">
        <CoreFeatures />
      </div>
      <div id="security">
        <SecurityAudit />
      </div>
      <div id="roadmap">
        <Roadmap />
      </div>
      <Legal />
      <div id="about">
        <Founders />
        <OurInvestors />
      </div>
      <Privacy />
      <div id="faq">
        <FAQ />
      </div>

      <Footer />
    </div>
  );
};

export default Home;
