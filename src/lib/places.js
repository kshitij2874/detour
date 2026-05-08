/**
 * Google Places API — enrich activities with real names, ratings, photos, hours.
 * Uses Maps JS PlacesService (client-side, no CORS issues).
 */

function waitForMaps(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.__mapsPromise) {
        window.__mapsPromise.then(resolve).catch(reject);
      } else if (Date.now() - start > timeout) {
        reject(new Error('Maps not loaded in time'));
      } else {
        setTimeout(check, 150);
      }
    };
    check();
  });
}

let _placesService = null;
function getPlacesService() {
  if (!_placesService) {
    const div = document.createElement('div');
    _placesService = new window.google.maps.places.PlacesService(div);
  }
  return _placesService;
}

/** Search Places for one activity, return enriched data or null. */
function searchPlace(activityName, destination, lat, lng) {
  return new Promise((resolve) => {
    try {
      const service = getPlacesService();
      service.textSearch(
        {
          query: `${activityName} ${destination}`,
          location: new window.google.maps.LatLng(lat, lng),
          radius: 2000,
        },
        (results, status) => {
          const OK = window.google.maps.places.PlacesServiceStatus.OK;
          if (status === OK && results?.length > 0) {
            const p = results[0];
            resolve({
              realName: p.name || activityName,
              rating: p.rating || null,
              photoUrl: p.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 240 }) || null,
              openNow: p.opening_hours?.isOpen?.() ?? null,
              address: p.formatted_address || null,
            });
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
 * Enrich all activities in an itinerary.
 * Returns { "day-idx": placeData, ... }
 */
export async function enrichItinerary(itinerary, destination) {
  if (!itinerary?.days) return {};
  try {
    await waitForMaps();
    if (!window.google?.maps?.places) return {};
  } catch {
    return {};
  }

  const enriched = {};
  const tasks = [];

  itinerary.days.forEach((day) => {
    day.activities.forEach((activity, idx) => {
      if (!activity.lat || !activity.lng) return;
      const key = `${day.day}-${idx}`;
      tasks.push(
        searchPlace(activity.name, destination, activity.lat, activity.lng)
          .then((data) => { if (data) enriched[key] = data; })
      );
    });
  });

  // Batch in groups of 4 to respect rate limits
  for (let i = 0; i < tasks.length; i += 4) {
    await Promise.all(tasks.slice(i, i + 4));
  }

  return enriched;
}
