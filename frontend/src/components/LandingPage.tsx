import React from 'react';
import Hero from './Hero';
import StatsTicker from './StatsTicker';
import Benefits from './Benefits';
import HowItWorksSection from './HowItWorksSection';
import WhyChooseSection from './WhyChooseSection';
import Plans from './Plans';
import MatrixVisualizer from './MatrixVisualizer';
import WalletPreviewSection from './WalletPreviewSection';
import ReferralSection from './ReferralSection';
import Simulator from './Simulator';
import Roadmap from './Roadmap';
import FaqSection from './FaqSection';
import TestimonialsSection from './TestimonialsSection';
import SecuritySection from './SecuritySection';
import CtaSection from './CtaSection';
import { useWeb3Store } from '../store/useWeb3Store';
import { useAppKit } from '@reown/appkit/react';

interface LandingPageProps {
  onNavigateTab: (tabId: string) => void;
}

export default function LandingPage({ onNavigateTab }: LandingPageProps) {
  const { open } = useAppKit();

  return (
    <div id="landing-page-wrapper" className="space-y-12 sm:space-y-16">
      
      {/* 1. Hero Section with Large Illustration */}
      <Hero 
        onCtaClick={onNavigateTab} 
        onConnectWallet={() => open()} 
      />

      {/* 2. Live Interactive Statistics Ticker */}
      <StatsTicker />

      {/* 3. Key System Benefits */}
      <Benefits />

      {/* 4. How Booster Works (4-Step Workflow) */}
      <HowItWorksSection />

      {/* 5. Why Choose SimpleOn (Comparison Table vs Legacy MLMs) */}
      <WhyChooseSection />

      {/* 6. Booster Plans Breakdown */}
      <div id="landing-plans-wrapper">
        <Plans />
      </div>

      {/* 7. Interactive Matrix Preview Visualizer */}
      <div id="landing-matrix-wrapper" className="py-8">
        <MatrixVisualizer />
      </div>

      {/* 8. Wallet Connection Preview */}
      <WalletPreviewSection />

      {/* 9. Referral Program & Direct Commission Split */}
      <ReferralSection />

      {/* 10. Income Simulation Calculator */}
      <div id="landing-simulator-wrapper" className="py-8">
        <Simulator />
      </div>

      {/* 11. Project Roadmap */}
      <Roadmap />

      {/* 12. FAQ Accordion */}
      <FaqSection />

      {/* 13. Testimonials & Community Feedback */}
      <TestimonialsSection />

      {/* 14. Smart Contract Security & Audit Verification */}
      <SecuritySection />

      {/* 15. Final Conversion CTA Section */}
      <CtaSection 
        onConnectWallet={() => open()}
        onOpenSimulator={() => onNavigateTab('calculator')}
      />

    </div>
  );
}
