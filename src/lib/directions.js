/**
 * Google Maps Directions API — fetch travel times between consecutive activity stops.
 */

function waitForMaps(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.__mapsPromise) {
        window.__mapsPromise.then(resolve).catch(reject);
      } else if (Date.now() - start > timeout) {
        reject(new Error('Maps not loaded'));
      } else {
        setTimeout(check, 150);
      }
    };
    check();
  });
}

function getRoute(origin, destination, mode = 'WALKING') {
  return new Promise((resolve) => {
    try {
      const service = new window.google.maps.DirectionsService();
      service.route(
        {
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(destination.lat, destination.lng),
          travelMode: window.google.maps.TravelMode[mode],
        },
        (result, status) => {
          if (status === 'OK') {
            const leg = result.routes[0].legs[0];
            resolve({ duration: leg.duration.text, distance: leg.distance.text, mode });
          } else {
            resolve(null);
          }
        }
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Fetch travel times between all consecutive activity pairs.
 * Returns { "day-actIdx": { duration, distance, mode }, ... }
 * Key "day-N" means travel FROM activity[N] TO activity[N+1] on that day.
 */
export async function fetchTravelTimes(itinerary) {
  if (!itinerary?.days) return {};
  try {
    await waitForMaps();
    if (!window.google?.maps) return {};
  } catch {
    return {};
  }

  const times = {};
  const tasks = [];

  itinerary.days.forEach((day) => {
    day.activities.forEach((activity, idx) => {
      const next = day.activities[idx + 1];
      if (!activity.lat || !activity.lng || !next?.lat || !next?.lng) return;
      const key = `${day.day}-${idx}`;
      tasks.push(
        getRoute(activity, next, 'WALKING').then((result) => {
          if (result) times[key] = result;
        })
      );
    });
  });

  await Promise.all(tasks);
  return times;
}
