import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
import FeaturesSection from './FeaturesSection';
import BenefitsSection from './BenefitsSection';
import HowItWorksSection from './HowItWorksSection';
import TestimonialsSection from './TestimonialsSection';
import DiscoverSection from './DiscoverSection';
import FAQSection from './FAQSection';
import CallToAction from './CallToAction';
import Footer from './Footer';

const Landing = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsSection />
      <DiscoverSection />
      <FeaturesSection />
      <BenefitsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <FAQSection />
      <CallToAction />  
      <Footer />
    </div>
  );
};

export default Landing;