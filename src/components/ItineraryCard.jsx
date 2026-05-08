import PropTypes from 'prop-types';

/**
 * Build a Google Calendar event URL (no OAuth needed).
 * @param {Object} activity - Activity with name, time, description
 * @param {number} dayNumber - 1-based trip day
 * @returns {string} Google Calendar render URL
 */
function buildCalendarUrl(activity, dayNumber) {
  const tripDate = new Date();
  tripDate.setDate(tripDate.getDate() + dayNumber - 1);
  const dateStr = tripDate.toISOString().split('T')[0].replace(/-/g, '');
  let hours = 9, minutes = 0;
  const match = (activity.time || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (match) {
    hours = parseInt(match[1]); minutes = parseInt(match[2]);
    if (match[3]?.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (match[3]?.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const s = `${pad(hours)}${pad(minutes)}00`;
  const e = `${pad(Math.min(hours+1,23))}${pad(minutes)}00`;
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action:'TEMPLATE', text:activity.name,
    dates:`${dateStr}T${s}/${dateStr}T${e}`,
    details:activity.description||'', location:activity.name,
  })}`;
}

function getTypeBadgeClass(type) {
  const t = (type||'').toLowerCase();
  if (t.includes('food')) return 'food';
  if (t.includes('sight')) return 'sightseeing';
  if (t.includes('transport')) return 'transport';
  return 'stay';
}

/**
 * ItineraryCard — renders one day's activities with Places enrichment,
 * travel times, Calendar buttons, and re-planned badges.
 */
export default function ItineraryCard({ dayData, doneActivities, onToggleDone, replannedActivities, placeData={}, travelTimes={} }) {
  const dayCost = dayData.activities.reduce((s,a)=>s+(a.estimatedCost||0),0);

  return (
    <article className="day-card" aria-label={`Day ${dayData.day} itinerary`}>
      <div className="day-card-header">
        <span className="day-number serif">Day {dayData.day}</span>
        <span className="day-cost">₹{dayCost.toLocaleString('en-IN')}</span>
      </div>

      <div>
        {dayData.activities.map((activity, idx) => {
          const key = `${dayData.day}-${idx}`;
          const isDone = doneActivities.has(key);
          const isReplanned = replannedActivities.has(key);
          const place = placeData[key];
          const travel = travelTimes[key];
          const calUrl = buildCalendarUrl(activity, dayData.day);

          return (
            <div key={key}>
              <div className={`activity-row${isDone?' done':''}${isReplanned?' replanned':''}`}>
                <input type="checkbox" className="activity-checkbox" checked={isDone}
                  onChange={()=>onToggleDone(key)} aria-label={`Mark "${activity.name}" as done`} />

                {place?.photoUrl && (
                  <img src={place.photoUrl} alt={place.realName||activity.name}
                    className="activity-photo" loading="lazy" />
                )}

                <span className="activity-time">{activity.time}</span>

                <div className="activity-details">
                  <div className={`activity-name${isDone?' done-text':''}`}>
                    {place?.realName||activity.name}
                    {place?.rating && <span className="activity-rating">⭐ {place.rating.toFixed(1)}</span>}
                    {isReplanned && <span className="replanned-badge" aria-label="Re-planned activity">Re-planned</span>}
                  </div>
                  <div className="activity-desc">{activity.description}</div>
                  {place?.openNow != null && (
                    <span className={`open-status ${place.openNow?'open':'closed'}`}>
                      ● {place.openNow?'Open now':'Closed'}
                    </span>
                  )}
                </div>

                <div className="activity-meta">
                  <span className={`type-badge ${getTypeBadgeClass(activity.type)}`}>{activity.type}</span>
                  <span className="activity-cost">
                    {(activity.estimatedCost||0)===0?'Free':`₹${activity.estimatedCost.toLocaleString('en-IN')}`}
                  </span>
                  <a href={calUrl} target="_blank" rel="noopener noreferrer" className="cal-btn"
                    aria-label={`Add "${activity.name}" to Google Calendar`} title="Add to Google Calendar">📅</a>
                </div>
              </div>

              {travel && (
                <div className="travel-time-row" aria-label={`Travel to next stop: ${travel.duration}`}>
                  <span className="travel-time-line"></span>
                  <span className="travel-time-badge">🚶 {travel.duration} · {travel.distance}</span>
                  <span className="travel-time-line"></span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

const activityShape = PropTypes.shape({
  time:PropTypes.string, name:PropTypes.string.isRequired, description:PropTypes.string,
  type:PropTypes.string, estimatedCost:PropTypes.number, lat:PropTypes.number, lng:PropTypes.number,
});

ItineraryCard.propTypes = {
  dayData: PropTypes.shape({ day:PropTypes.number.isRequired, activities:PropTypes.arrayOf(activityShape).isRequired }).isRequired,
  doneActivities: PropTypes.instanceOf(Set).isRequired,
  onToggleDone: PropTypes.func.isRequired,
  replannedActivities: PropTypes.instanceOf(Set).isRequired,
  placeData: PropTypes.object,
  travelTimes: PropTypes.object,
};
