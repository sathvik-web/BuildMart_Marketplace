import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Categories from "@/components/Categories";
import HowItWorks from "@/components/HowItWorks";
import CTAEstimate from "@/components/CTAEstimate";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">

      <Navbar />

      <HeroSection />

      <Categories />

      <HowItWorks />

      <CTAEstimate />

      <Footer />

    </main>
  );
}