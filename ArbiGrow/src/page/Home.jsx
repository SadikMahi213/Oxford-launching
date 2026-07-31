import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../component/Navbar";
import ScrollToTopButton from "../component/ScrollToTopButton";
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
import { ShowcaseSection } from "../component/ShowcaseSection";
import { getPlatformStats } from "../api/admin.api.js";
import { PartyPopper, Users, GraduationCap, Briefcase } from "lucide-react";
import eventsImg1 from "../assets/events.jpg";
import commitmentHeroImg from "../assets/commitment-hero.jpeg";
import eventsImg2 from "../assets/events .jpeg";
import eventsImg3 from "../assets/events2.jpeg";
import eventsImg4 from "../assets/events3.jpeg";
import eventsImg5 from "../assets/events4.jpeg";
import eventsImg6 from "../assets/events5.jpeg";
import eventsImg7 from "../assets/events6.jpeg";
import eventsImg8 from "../assets/events7.jpeg";
import eventsImg9 from "../assets/events8.jpeg";
import eventsImg10 from "../assets/events9.jpeg";

import com1 from "../assets/community and team/team.jpeg";
import com2 from "../assets/community and team/team2.jpeg";
import com3 from "../assets/community and team/team3.jpeg";
import com4 from "../assets/community and team/team4.jpeg";
import com5 from "../assets/community and team/team5.jpeg";
import com6 from "../assets/community and team/team6.jpeg";
import lifeImg from "../assets/life.jpg";

import train1 from "../assets/training and development/training.jpeg";
import train2 from "../assets/training and development/training2.jpeg";
import train3 from "../assets/training and development/training 3.jpeg";
import train4 from "../assets/training and development/training4.jpeg";
import train5 from "../assets/training and development/training5.jpeg";
import train6 from "../assets/training and development/training6.jpeg";

const eventImages = [
  eventsImg1, eventsImg2, eventsImg3, eventsImg4, eventsImg5,
  eventsImg6, eventsImg7, eventsImg8, eventsImg9, eventsImg10
];

const trainingImages = [
  train1, train2, train3, train4, train5, train6
];

const communityImages = [
  com1, com2, com3, com4, com5, com6
];

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
    <>
      <Navbar />
      <ScrollToTopButton />
      <div id="home">
        <Hero />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
      <PlatformStatistics />
      <div id="founders">
        <Founders />
      </div>
      <div id="commitment">
        <SecurityCompliance />
      </div>

      {/* Commitment Hero Image */}
      <div className="flex justify-center my-6 md:my-8 px-4 md:px-8">
        <div className="relative group max-w-6xl w-full">
          {/* Subtle glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-cyan-500/15 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-500"></div>
          
          <img
            src={commitmentHeroImg}
            alt={t("homePage.altGlobalCertifications")}
            className="relative w-full h-auto object-cover rounded-2xl border border-white/10 shadow-2xl shadow-black/50"
            loading="lazy"
          />
        </div>
      </div>

      <div id="certifications">
        <GlobalCertifications>
          <ShowcaseSection
            badge={t("showcase.events.badge")}
            badgeIcon={PartyPopper}
            title={t("showcase.events.title")}
            description={t("showcase.events.description")}
            images={eventImages}
            imageAlt={t("homePage.imageAlt")}
          />
        </GlobalCertifications>
      </div>
      <div id="security">
        <SecurityStandards />
      </div>

      <ShowcaseSection
        badge={t("showcase.training.badge")}
        badgeIcon={GraduationCap}
        title={t("showcase.training.title")}
        description={t("showcase.training.description")}
        images={trainingImages}
        imageAlt={t("homePage.imageAlt")}
      />
      <div id="corporate">
        <CorporateIntegrity />
      </div>

      <ShowcaseSection
        badge={t("showcase.community.badge")}
        badgeIcon={Users}
        title={t("showcase.community.title")}
        description={t("showcase.community.description")}
        images={communityImages}
        imageAlt={t("homePage.imageAlt")}
        reversed
      />
      <div id="privacy">
        <PrivacySecurity />
      </div>



      <ShowcaseSection
        badge={t("showcase.life.badge")}
        badgeIcon={Briefcase}
        title={t("showcase.life.title")}
        description={t("showcase.life.description")}
        image={lifeImg}
        imageAlt={t("homePage.imageAlt")}
        reversed
      />
      <Footer />
      </div>
    </>
  );
};

export default Home;
