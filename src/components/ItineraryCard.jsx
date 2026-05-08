/**
 * ItineraryCard — renders a single day's activities.
 * @param {object} props
 * @param {object} props.dayData - { day, activities: [...] }
 * @param {Set<string>} props.doneActivities - Set of "day-index" keys marked done
 * @param {function} props.onToggleDone - Called with "day-index" key
 * @param {Set<string>} props.replannedActivities - Set of "day-index" keys that were replanned
 */
export default function ItineraryCard({ dayData, doneActivities, onToggleDone, replannedActivities }) {
  const dayCost = dayData.activities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);

  function getTypeBadgeClass(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('food')) return 'food';
    if (t.includes('sightseeing') || t.includes('sight')) return 'sightseeing';
    if (t.includes('transport')) return 'transport';
    if (t.includes('stay') || t.includes('hotel') || t.includes('accommodation')) return 'stay';
    return 'sightseeing';
  }

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

          return (
            <div
              key={key}
              className={`activity-row${isDone ? ' done' : ''}${isReplanned ? ' replanned' : ''}`}
            >
              <input
                type="checkbox"
                className="activity-checkbox"
                checked={isDone}
                onChange={() => onToggleDone(key)}
                aria-label={`Mark "${activity.name}" as done`}
              />
              <span className="activity-time">{activity.time}</span>
              <div className="activity-details">
                <div className={`activity-name${isDone ? ' done-text' : ''}`}>
                  {activity.name}
                </div>
                <div className="activity-desc">{activity.description}</div>
              </div>
              <div className="activity-meta">
                <span className={`type-badge ${getTypeBadgeClass(activity.type)}`}>
                  {activity.type}
                </span>
                <span className="activity-cost">₹{(activity.estimatedCost || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
