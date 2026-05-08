import { useState } from 'react';
import PropTypes from 'prop-types';
import { sanitizeInput } from '../lib/gemini';
import { MIN_DAYS, MAX_DAYS } from '../lib/constants';

const STYLES = ['Adventure', 'Relaxed', 'Cultural', 'Foodie'];

/**
 * PlanForm — collects trip parameters and submits to parent.
 * @param {Object} props
 * @param {function} props.onSubmit - Called with form data object
 * @param {boolean} props.isLoading - Disables form while AI is generating
 */
export default function PlanForm({ onSubmit, isLoading }) {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState('');
  const [style, setStyle] = useState('Cultural');
  const [dietary, setDietary] = useState('All');
  const [travellerType, setTravellerType] = useState('Solo');
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    if (!sanitizeInput(destination)) newErrors.destination = 'Please enter a destination city.';
    const b = Number(budget);
    if (!budget || b <= 0 || isNaN(b)) newErrors.budget = 'Please enter a valid positive budget in INR.';
    if (days < MIN_DAYS || days > MAX_DAYS) newErrors.days = 'Duration must be between 1 and 7 days.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ destination: sanitizeInput(destination), days: Number(days), budget: Number(budget), style, dietary, travellerType });
  }

  return (
    <section className="plan-form-card" aria-label="Trip planning form">
      <h1 className="plan-form-title serif">Where to?</h1>
      <p className="plan-form-subtitle">Tell us about your trip</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="destination">Destination City</label>
            <input id="destination" className={`form-input${errors.destination?' error':''}`} type="text"
              placeholder="e.g. Jaipur, Goa, Manali" aria-label="Destination city"
              aria-describedby="destination-hint" value={destination}
              onChange={(e)=>setDestination(e.target.value)} disabled={isLoading} />
            <span id="destination-hint" className="form-hint">Enter an Indian city or region</span>
            {errors.destination && <span className="form-error" role="alert">{errors.destination}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="days">Duration (days)</label>
            <input id="days" className={`form-input${errors.days?' error':''}`} type="number"
              min="1" max="7" aria-label="Number of days" aria-describedby="days-hint"
              value={days} onChange={(e)=>setDays(e.target.value)} disabled={isLoading} />
            <span id="days-hint" className="form-hint">1 to 7 days</span>
            {errors.days && <span className="form-error" role="alert">{errors.days}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="budget">Budget (₹ INR)</label>
            <input id="budget" className={`form-input${errors.budget?' error':''}`} type="number"
              min="1" placeholder="e.g. 15000" aria-label="Total budget in INR"
              aria-describedby="budget-hint" value={budget}
              onChange={(e)=>setBudget(e.target.value)} disabled={isLoading} />
            <span id="budget-hint" className="form-hint">Total trip budget in Indian Rupees</span>
            {errors.budget && <span className="form-error" role="alert">{errors.budget}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="style">Travel Style</label>
            <select id="style" className="form-select" aria-label="Travel style"
              value={style} onChange={(e)=>setStyle(e.target.value)} disabled={isLoading}>
              {STYLES.map((s)=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dietary Preference</label>
            <div className="toggle-group" role="radiogroup" aria-label="Dietary preference">
              {['Veg Only','All'].map((d)=>(
                <button key={d} type="button" className={`toggle-btn${dietary===d?' active':''}`}
                  onClick={()=>setDietary(d)} aria-label={d} aria-pressed={dietary===d} disabled={isLoading}>
                  {d==='Veg Only'?'🥬 Veg Only':'🍗 All'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Traveller Type</label>
            <div className="toggle-group" role="radiogroup" aria-label="Traveller type">
              {['Solo','Couple','Family'].map((t)=>(
                <button key={t} type="button" className={`toggle-btn${travellerType===t?' active':''}`}
                  onClick={()=>setTravellerType(t)} aria-label={`${t} traveller`} aria-pressed={travellerType===t} disabled={isLoading}>
                  {t==='Solo'?'🧑':t==='Couple'?'👫':'👨‍👩‍👧‍👦'} {t}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="submit-btn" aria-label="Generate itinerary" disabled={isLoading}>
            {isLoading ? (<><span className="spinner" style={{width:20,height:20,borderWidth:2}}></span>Generating…</>) : <>🗺️ Generate Itinerary</>}
          </button>
        </div>
      </form>
    </section>
  );
}

PlanForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};
