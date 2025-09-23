import React from 'react'
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import DiscoverSection from './DiscoverSection';
import CallToActionSection from './CallToAction';
import FooterSection from './FooterSection';
import CategoriesSection from './CategoriesSection';

const Landing = () => {
  return (
    <div>
        <HeroSection />
        <CategoriesSection />
        <FeaturesSection />
        <DiscoverSection />
        <CallToActionSection />
        <FooterSection />
    </div>
  );
};

export default Landing;