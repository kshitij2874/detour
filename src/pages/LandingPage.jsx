import { Globe, Map, Sparkles, Zap, ArrowRight } from 'lucide-react';
import HowItWorksSection from './HowItWorksSection';
import FeatureShowcaseSection from './FeatureShowcaseSection';

/**
 * LandingPage — cinematic dark landing page for Detour.
 * Sections: Hero (full-viewport video), How It Works, Feature Showcase, Footer.
 * Uses HashRouter links (#/app) for GitHub Pages compatibility.
 */
export default function LandingPage() {
  return (
    <div className="landing-root">

      {/* ── HERO ────────────────────────────────────────────────── */}
      <main className="hero-section">
        {/* Background video */}
        <video
          className="hero-video"
          src="https://videos.pexels.com/video-files/2169880/2169880-uhd_3840_2160_30fps.mp4"
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-gradient" aria-hidden="true" />

        {/* Navbar */}
        <nav className="hero-nav" role="navigation" aria-label="Main navigation">
          <div className="hero-nav-inner liquid-glass">
            {/* Logo */}
            <a href="#/" className="hero-logo" aria-label="Detour home">
              <Globe size={18} aria-hidden="true" />
              <span className="serif" style={{ fontStyle: 'italic' }}>Detour</span>
            </a>

            {/* Centre links */}
            <div className="hero-nav-links" role="list">
              <a href="#how-it-works" className="hero-nav-link" role="listitem">How it works</a>
              <a href="#features" className="hero-nav-link" role="listitem">Features</a>
              <a href="#about" className="hero-nav-link" role="listitem">About</a>
            </div>

            {/* CTA */}
            <a
              href="#/app"
              className="hero-nav-cta liquid-glass"
              aria-label="Start planning your trip"
            >
              Plan a Trip
            </a>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="hero-content">
          {/* Metadata pill row */}
          <div className="hero-pills animate-blur-fade-up" style={{ animationDelay: '200ms' }}>
            <span className="hero-pill">
              <Sparkles size={14} aria-hidden="true" />
              Powered by Gemini 2.0
            </span>
            <span className="hero-pill">
              <Map size={14} aria-hidden="true" />
              Google Maps integrated
            </span>
            <span className="hero-pill">
              <Zap size={14} aria-hidden="true" />
              Real-time re-planning
            </span>
          </div>

          {/* Heading */}
          <h1 className="hero-heading serif animate-blur-fade-up" style={{ animationDelay: '0ms' }}>
            Plan it. Then <em className="hero-em">detour</em> it.
          </h1>

          {/* Subheading */}
          <p className="hero-sub animate-blur-fade-up" style={{ animationDelay: '400ms' }}>
            AI-powered travel planning that adapts when life doesn't go to plan.
            Built for the unpredictable journey.
          </p>

          {/* CTA */}
          <a
            href="#/app"
            className="hero-cta animate-blur-fade-up"
            style={{ animationDelay: '600ms' }}
            aria-label="Start planning your trip now"
          >
            Start Planning
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </main>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <HowItWorksSection />

      {/* ── FEATURE SHOWCASE ─────────────────────────────────────── */}
      <FeatureShowcaseSection />

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer id="about" className="landing-footer" role="contentinfo">
        <div className="landing-footer-inner">
          <div className="landing-footer-left">
            <span className="serif landing-footer-brand">Detour</span>
            <span className="landing-footer-sub">Built at PromptWars 2026 · Hyderabad</span>
          </div>
          <span className="landing-footer-right">Made with Google Antigravity + Gemini</span>
        </div>
      </footer>
    </div>
  );
}
