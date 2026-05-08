/**
 * FeatureShowcaseSection — full-bleed video section demonstrating the
 * Detour re-planning experience with an overlaid glass card and CTA.
 */
export default function FeatureShowcaseSection() {
  return (
    <section id="features" className="fss-section" aria-label="Detour showcase">
      <div className="fss-inner">
        <div className="fss-video-wrap">
          <video
            className="fss-video"
            src="https://videos.pexels.com/video-files/4763824/4763824-uhd_3840_2160_25fps.mp4"
            muted
            autoPlay
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          />
          <div className="fss-overlay" aria-hidden="true" />

          {/* Bottom-left info card */}
          <div className="fss-card liquid-glass">
            <p className="fss-label">The Detour Difference</p>
            <p className="fss-body">
              When your 2 PM train is missed and the museum just closed,
              Detour rebuilds the rest of your day in seconds — keeping what
              worked, replacing what didn't.
            </p>
          </div>

          {/* Bottom-right CTA */}
          <a
            href="#/app"
            className="fss-cta liquid-glass"
            aria-label="Try Detour now"
          >
            Try it now →
          </a>
        </div>
      </div>
    </section>
  );
}
