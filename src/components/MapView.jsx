import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY;

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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Filter activities that have valid lat/lng
  const pinnable = (activities || []).filter(
    (a) => a.lat && a.lng && !isNaN(a.lat) && !isNaN(a.lng)
  );

  // Load Google Maps
  useEffect(() => {
    if (!MAPS_API_KEY) {
      setMapError('Google Maps API key not set. Add VITE_MAPS_API_KEY to your .env file.');
      return;
    }

    const loader = new Loader({
      apiKey: MAPS_API_KEY,
      version: 'weekly',
      libraries: ['marker'],
    });

    loader
      .importLibrary('maps')
      .then(() => {
        setMapLoaded(true);
      })
      .catch((err) => {
        setMapError('Failed to load Google Maps. Check your API key.');
        console.error('Maps load error:', err.message);
      });
  }, []);

  // Render markers and polyline whenever activities or map change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    if (!window.google || !window.google.maps) return;

    const google = window.google;

    // Create or reuse map instance
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 20.5937, lng: 78.9629 }, // Default: India center
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Clear old polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (pinnable.length === 0) return;

    // Bounds for auto-fit
    const bounds = new google.maps.LatLngBounds();
    const path = [];

    pinnable.forEach((activity, index) => {
      const position = { lat: activity.lat, lng: activity.lng };
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
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <strong style="color: #1E293B;">${activity.name}</strong><br/>
            <span style="color: #64748B; font-size: 13px;">₹${(activity.estimatedCost || 0).toLocaleString('en-IN')}</span>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Draw polyline
    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#4F46E5',
      strokeOpacity: 0.6,
      strokeWeight: 3,
    });
    polylineRef.current.setMap(map);

    // Fit bounds
    if (pinnable.length === 1) {
      map.setCenter(path[0]);
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 50);
    }
  }, [mapLoaded, pinnable.length, JSON.stringify(pinnable.map((a) => [a.lat, a.lng, a.name]))]);

  if (mapError) {
    return (
      <div className="map-container">
        <div className="map-header">
          <span>🗺️</span>
          <h2>Route Map</h2>
        </div>
        <div className="map-placeholder">
          <span className="map-placeholder-icon">⚠️</span>
          <span>{mapError}</span>
        </div>
      </div>
    );
  }

  if (!MAPS_API_KEY) {
    return (
      <div className="map-container">
        <div className="map-header">
          <span>🗺️</span>
          <h2>Route Map</h2>
        </div>
        <div className="map-placeholder">
          <span className="map-placeholder-icon">🗺️</span>
          <span>Add VITE_MAPS_API_KEY to enable the map</span>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-header">
        <span>🗺️</span>
        <h2>Route Map</h2>
        {pinnable.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748B' }}>
            {pinnable.length} stops
          </span>
        )}
      </div>
      <div ref={mapRef} className="map-embed" aria-label="Trip route map" />
    </div>
  );
}
