import { useState } from "react";

import Navbar from "../component/Navbar";
import Footer from "../component/Footer";
import HeroSection from "../component/package/HeroSection.jsx";
import TierSection from "../component/package/TierSection.jsx";
import ComplianceSection from "../component/package/ComplianceSection.jsx";
import PackageModal from "../component/package/PackageModal.jsx";

export default function StrategyTiersPage() {
  const [selectedPackage, setSelectedPackage] = useState(null);

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      <Navbar />
      <main className="pt-20 pb-20 md:pb-32 px-6 max-w-7xl mx-auto">
        <HeroSection />
        <TierSection onSelect={setSelectedPackage} />
        <ComplianceSection />
      </main>
      <Footer />
      <PackageModal
        selectedPackage={selectedPackage}
        setSelectedPackage={setSelectedPackage}
      />
    </div>
  );
}
