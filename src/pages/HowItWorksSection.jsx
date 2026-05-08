import PropTypes from 'prop-types';

/**
 * HowItWorksSection — three-step cards explaining the Detour workflow.
 * Used inside LandingPage.
 */
export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Tell us your vibe',
      body: 'Destination, budget, mood. Plain English. No forms with 47 fields.',
    },
    {
      num: '02',
      title: 'Get your itinerary',
      body: 'Day-wise plans with real places, real costs, real Google Maps routes.',
    },
    {
      num: '03',
      title: 'Detour when needed',
      body: 'Missed a train? Sudden rain? Tap one button. We re-plan instantly.',
    },
  ];

  return (
    <section id="how-it-works" className="hiw-section" aria-label="How Detour works">
      <div className="hiw-inner">
        <h2 className="hiw-heading serif">
          Three steps. Then <em className="hiw-chaos">chaos</em>.
        </h2>
        <div className="hiw-grid">
          {steps.map((step) => (
            <div key={step.num} className="hiw-card liquid-glass">
              <span className="hiw-num serif" aria-hidden="true">{step.num}</span>
              <h3 className="hiw-title">{step.title}</h3>
              <p className="hiw-body">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

HowItWorksSection.propTypes = {};
