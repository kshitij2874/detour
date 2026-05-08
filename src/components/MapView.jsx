import { useEffect, useRef, useState } from 'react';

const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY;

/** Inject the Maps script once and resolve when ready. */
function loadMapsScript() {
  if (window.__mapsPromise) return window.__mapsPromise;

  window.__mapsPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }
    const callbackName = '__gm_cb_' + Date.now();
    window[callbackName] = () => resolve();

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
    document.head.appendChild(script);
  });

  return window.__mapsPromise;
}

/**
 * MapView — Google Maps embed with numbered markers and polyline.
 * @param {object} props
 * @param {Array} props.activities - Flat list of activities with lat/lng
 */
export default function MapView({ activities }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const pinnable = (activities || []).filter(
    (a) => a.lat && a.lng && !isNaN(Number(a.lat)) && !isNaN(Number(a.lng))
  );

  // Load script once
  useEffect(() => {
    if (!MAPS_API_KEY) {
      setMapError('Add VITE_MAPS_API_KEY to enable the map.');
      return;
    }
    loadMapsScript()
      .then(() => setMapReady(true))
      .catch((err) => setMapError(err.message));
  }, []);

  // Draw markers whenever map is ready or activities change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const google = window.google;

    // Create map instance once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 20.5937, lng: 78.9629 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    // Clear old markers & polyline
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (pinnable.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const path = [];

    pinnable.forEach((activity, index) => {
      const position = { lat: Number(activity.lat), lng: Number(activity.lng) };
      bounds.extend(position);
      path.push(position);

      const marker = new google.maps.Marker({
        position,
        map,
        label: {
          text: String(index + 1),
          color: '#FFFFFF',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#4F46E5',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        title: activity.name,
      });

      marker.addListener('click', () => {
        infoWindow.setContent(`
          <div style="font-family:Inter,sans-serif;padding:4px 2px">
            <strong style="color:#1E293B">${activity.name}</strong><br/>
            <span style="color:#64748B;font-size:13px">₹${(activity.estimatedCost || 0).toLocaleString('en-IN')}</span>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Polyline
    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#4F46E5',
      strokeOpacity: 0.6,
      strokeWeight: 3,
    });
    polylineRef.current.setMap(map);

    if (pinnable.length === 1) {
      map.setCenter(path[0]);
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, JSON.stringify(pinnable.map((a) => [a.lat, a.lng, a.name]))]);

  if (!MAPS_API_KEY || mapError) {
    return (
      <div className="map-outer">
        <div className="map-container">
          <div className="map-header"><span>🗺️</span><h2>Route Map</h2></div>
          <div className="map-placeholder">
            <span className="map-placeholder-icon">⚠️</span>
            <span>{mapError || 'Add VITE_MAPS_API_KEY to enable the map.'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-outer">
      <div className="map-container">
        <div className="map-header">
          <span>🗺️</span>
          <h2>Route Map</h2>
          {pinnable.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
              {pinnable.length} stops
            </span>
          )}
        </div>
        <div ref={mapRef} className="map-embed" aria-label="Trip route map" />
      </div>
    </div>
  );
}
