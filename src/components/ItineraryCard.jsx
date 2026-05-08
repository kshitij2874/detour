import PropTypes from 'prop-types';

/**
 * Build a Google Calendar event URL (no OAuth needed).
 * Opens a pre-filled event creation page.
 *
 * @param {Object} activity - Activity object with name, time, description fields
 * @param {number} dayNumber - Trip day number (1-based), used to calculate event date
 * @returns {string} Google Calendar render URL
 */
function buildCalendarUrl(activity, dayNumber) {
  const tripDate = new Date();
  tripDate.setDate(tripDate.getDate() + dayNumber - 1);

  const dateStr = tripDate.toISOString().split('T')[0].replace(/-/g, '');

  let hours = 9, minutes = 0;
  const match = (activity.time || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (match) {
    hours = parseInt(match[1]);
    minutes = parseInt(match[2]);
    if (match[3]?.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (match[3]?.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const startTime = `${pad(hours)}${pad(minutes)}00`;
  const endTime = `${pad(Math.min(hours + 1, 23))}${pad(minutes)}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: activity.name,
    dates: `${dateStr}T${startTime}/${dateStr}T${endTime}`,
    details: activity.description || '',
    location: activity.name,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getTypeBadgeClass(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('food')) return 'food';
  if (t.includes('sight')) return 'sightseeing';
  if (t.includes('transport')) return 'transport';
  if (t.includes('stay') || t.includes('hotel')) return 'stay';
  return 'sightseeing';
}

/**
 * ItineraryCard — renders a single day's activities with Places enrichment,
 * travel times, Google Calendar buttons.
 */
export default function ItineraryCard({
  dayData,
  doneActivities,
  onToggleDone,
  replannedActivities,
  placeData = {},
  travelTimes = {},
}) {
  const dayCost = dayData.activities.reduce((s, a) => s + (a.estimatedCost || 0), 0);

  return (
    <article className="day-card" aria-label={`Day ${dayData.day} itinerary`}>
      <div className="day-card-header">
        <span className="day-number">📅 Day {dayData.day}</span>
        <span className="day-cost">₹{dayCost.toLocaleString('en-IN')}</span>
      </div>

      <div>
        {dayData.activities.map((activity, idx) => {
          const key = `${dayData.day}-${idx}`;
          const isDone = doneActivities.has(key);
          const isReplanned = replannedActivities.has(key);
          const place = placeData[key];
          const travel = travelTimes[`${dayData.day}-${idx}`];
          const calUrl = buildCalendarUrl(activity, dayData.day);

          return (
            <div key={key}>
              <div
                className={`activity-row${isDone ? ' done' : ''}${isReplanned ? ' replanned' : ''}`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  className="activity-checkbox"
                  checked={isDone}
                  onChange={() => onToggleDone(key)}
                  aria-label={`Mark "${activity.name}" as done`}
                />

                {/* Place photo thumbnail */}
                {place?.photoUrl && (
                  <img
                    src={place.photoUrl}
                    alt={place.realName || activity.name}
                    className="activity-photo"
                    loading="lazy"
                  />
                )}

                {/* Time */}
                <span className="activity-time">{activity.time}</span>

                {/* Details */}
                <div className="activity-details">
                  <div className={`activity-name${isDone ? ' done-text' : ''}`}>
                    {place?.realName || activity.name}
                    {place?.rating && (
                      <span className="activity-rating">⭐ {place.rating.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="activity-desc">{activity.description}</div>
                  {place?.openNow !== null && place?.openNow !== undefined && (
                    <span className={`open-status ${place.openNow ? 'open' : 'closed'}`}>
                      {place.openNow ? '● Open now' : '● Closed'}
                    </span>
                  )}
                </div>

                {/* Meta: badge + cost + calendar */}
                <div className="activity-meta">
                  <span className={`type-badge ${getTypeBadgeClass(activity.type)}`}>
                    {activity.type}
                  </span>
                  <span className="activity-cost">
                    {(activity.estimatedCost || 0) === 0
                      ? 'Free'
                      : `₹${(activity.estimatedCost).toLocaleString('en-IN')}`}
                  </span>
                  <a
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cal-btn"
                    aria-label={`Add "${activity.name}" to Google Calendar`}
                    title="Add to Google Calendar"
                  >
                    📅
                  </a>
                </div>
              </div>

              {/* Travel time to next stop */}
              {travel && (
                <div className="travel-time-row" aria-label={`Travel to next stop: ${travel.duration}`}>
                  <span className="travel-time-line"></span>
                  <span className="travel-time-badge">
                    🚶 {travel.duration} · {travel.distance}
                  </span>
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

/** @type {PropTypes.shape} Shared activity shape used across propTypes. */
const activityShape = PropTypes.shape({
  time: PropTypes.string,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  type: PropTypes.string,
  estimatedCost: PropTypes.number,
  lat: PropTypes.number,
  lng: PropTypes.number,
});

ItineraryCard.propTypes = {
  /** Day data object from the itinerary. */
  dayData: PropTypes.shape({
    day: PropTypes.number.isRequired,
    activities: PropTypes.arrayOf(activityShape).isRequired,
  }).isRequired,
  /** Set of activity keys ("day-idx") marked as done. */
  doneActivities: PropTypes.instanceOf(Set).isRequired,
  /** Callback to toggle done state for a given activity key. */
  onToggleDone: PropTypes.func.isRequired,
  /** Set of activity keys that were modified by the last re-plan. */
  replannedActivities: PropTypes.instanceOf(Set).isRequired,
  /** Map of "day-idx" → Places enrichment data (optional). */
  placeData: PropTypes.objectOf(
    PropTypes.shape({
      realName: PropTypes.string,
      rating: PropTypes.number,
      photoUrl: PropTypes.string,
      openNow: PropTypes.bool,
      address: PropTypes.string,
    })
  ),
  /** Map of "day-idx" → Directions travel time (optional). */
  travelTimes: PropTypes.objectOf(
    PropTypes.shape({
      duration: PropTypes.string,
      distance: PropTypes.string,
      mode: PropTypes.string,
    })
  ),
};

ItineraryCard.defaultProps = {
  placeData: {},
  travelTimes: {},
};
