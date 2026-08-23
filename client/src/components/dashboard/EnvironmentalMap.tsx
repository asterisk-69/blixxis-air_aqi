import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EnvironmentalStation } from '../../types/environmental';
import { getAQISeverity, getSeverityColor, getStationSeverityColor } from '../../services/environmentalData';
import { Compass } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, CircleF, InfoWindowF } from '@react-google-maps/api';

interface EnvironmentalMapProps {
  stations: EnvironmentalStation[];
  selectedCountry: string;
  selectedStation: EnvironmentalStation | null;
  onStationSelect: (station: EnvironmentalStation) => void;
}

// Premium dark map styling theme.
// Optimized so that geographic features, coastlines, water, and borders remain clearly visible.
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      { "color": "#0d1527" } // Dark navy land geometry
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#7ba4c7" } // Soft blue-gray text
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      { "color": "#06090e" } // Black outline for legible text
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#00d2ff" }, // Glowing cyan borders for countries
      { "weight": 1.8 }
    ]
  },
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#1e293b" }, // Muted province borders
      { "weight": 0.8 }
    ]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [
      { "color": "#090f1d" } // Slightly darker natural landscape
    ]
  },
  {
    "featureType": "poi",
    "stylers": [
      { "visibility": "off" } // Hide POI markers to keep map clean
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      { "color": "#121d33" } // Dark blue roads
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [
      { "color": "#1e293b" }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      { "color": "#02050b" } // Almost black water to contrast with land coastlines
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#1e3a8a" }
    ]
  }
];

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px'
};

const defaultMapOptions: google.maps.MapOptions = {
  styles: darkMapStyle,
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
};

// Center and zoom definitions for countries
const getMapPosition = (country: string) => {
  switch (country) {
    case 'India':
      return {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5
      };
    case 'Saudi Arabia':
      return {
        center: { lat: 23.8859, lng: 45.0792 },
        zoom: 5
      };
    case 'UAE':
      return {
        center: { lat: 23.4241, lng: 53.8478 },
        zoom: 8
      };
    default: // All Countries
      // Centered between Saudi Arabia/UAE and India, showing the entire region
      return {
        center: { lat: 20.0, lng: 60.0 },
        zoom: 4
      };
  }
};

const MapErrorState: React.FC<{ message: string; details?: string }> = ({ message, details }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      minHeight: '400px',
      padding: '24px',
      backgroundColor: '#06090e',
      border: '1px dashed var(--color-very-poor)',
      borderRadius: '8px',
      color: 'var(--color-text-main)',
      textAlign: 'center',
      backdropFilter: 'blur(8px)',
      boxSizing: 'border-box'
    }}>
      <div style={{
        fontSize: '2rem',
        color: 'var(--color-very-poor)',
        marginBottom: '12px'
      }}>
        ⚠️
      </div>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--color-text-main)',
        marginBottom: '8px',
        fontFamily: 'var(--font-display)'
      }}>
        {message}
      </h3>
      <p style={{
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
        maxWidth: '400px',
        lineHeight: '1.4',
        marginBottom: '16px'
      }}>
        {details || "Please ensure the Google Maps Platform API key is correctly configured."}
      </p>
      <div style={{
        fontSize: '0.7rem',
        backgroundColor: '#0c1527',
        border: '1px solid var(--border-light)',
        padding: '10px 14px',
        borderRadius: '6px',
        fontFamily: 'monospace',
        color: 'var(--color-primary)',
        width: '100%',
        maxWidth: '450px',
        wordBreak: 'break-all',
        textAlign: 'left',
        boxSizing: 'border-box'
      }}>
        <div style={{ color: 'var(--color-text-dark)', marginBottom: '4px' }}># Required setup instructions:</div>
        1. Create a <span style={{ color: '#fff' }}>.env</span> file in the <span style={{ color: '#fff' }}>client</span> directory.<br />
        2. Set: <span style={{ color: '#00d2ff' }}>VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourKeyHere</span>
      </div>
    </div>
  );
};

export const EnvironmentalMap: React.FC<EnvironmentalMapProps> = ({
  stations,
  selectedCountry,
  selectedStation,
  onStationSelect
}) => {
  const [mapMode, setMapMode] = useState<'geospatial' | 'satellite' | 'heatmap'>('geospatial');
  // (Unused hoveredStation state commented out to resolve TS errors)
  // const [hoveredStation, setHoveredStation] = useState<EnvironmentalStation | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    const savedLabels = localStorage.getItem('blixxis_map_labels');
    if (savedLabels !== null) {
      setShowLabels(savedLabels === 'true');
    }
  }, [selectedStation]);

  const getMappedStations = useCallback(() => {
    const uaeStations = stations.filter(s => s.country.toLowerCase() === 'united arab emirates' || s.country.toLowerCase() === 'uae');
    const otherStations = stations.filter(s => s.country.toLowerCase() !== 'united arab emirates' && s.country.toLowerCase() !== 'uae');
    
    const validUaeStations = uaeStations
      .filter(s => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .sort((a, b) => {
        const scoreA = a.riskScore ?? 0;
        const scoreB = b.riskScore ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.station.localeCompare(b.station);
      });
      
    const selectedUaeStations = validUaeStations.slice(0, 5);
    const validOtherStations = otherStations.filter(s => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
    
    return [...selectedUaeStations, ...validOtherStations];
  }, [stations]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isKeyMissingOrPlaceholder = !apiKey || apiKey === '' || apiKey.includes('your_google_maps_api_key_here');

  // Load the Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: isKeyMissingOrPlaceholder ? '' : apiKey
  });

  const position = getMapPosition(selectedCountry);

  // Sync zoom and center on selectedCountry changes
  useEffect(() => {
    if (mapRef.current && window.google) {
      const countryStations = getMappedStations().filter(s => {
        const matchCountry = selectedCountry === 'All Countries' || selectedCountry === 'All' ||
                             s.country.toLowerCase() === selectedCountry.toLowerCase() ||
                             (selectedCountry === 'UAE' && s.country.toLowerCase() === 'united arab emirates');
        return matchCountry && Number.isFinite(s.latitude) && Number.isFinite(s.longitude);
      });

      if (selectedCountry !== 'All Countries' && selectedCountry !== 'All' && countryStations.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        countryStations.forEach(s => {
          bounds.extend({ lat: s.latitude, lng: s.longitude });
        });
        mapRef.current.fitBounds(bounds);
        
        // Add a listener to set a sensible maximum zoom so it doesn't zoom in too close
        const listener = mapRef.current.addListener('zoom_changed', () => {
          if (mapRef.current && mapRef.current.getZoom()! > 9) {
            mapRef.current.setZoom(9);
          }
          google.maps.event.removeListener(listener);
        });
      } else {
        const pos = getMapPosition(selectedCountry);
        mapRef.current.panTo(pos.center);
        mapRef.current.setZoom(pos.zoom);
      }
    }
  }, [selectedCountry, stations]);

  // Sync center when a station is selected
  useEffect(() => {
    if (mapRef.current && selectedStation && Number.isFinite(selectedStation.latitude) && Number.isFinite(selectedStation.longitude)) {
      mapRef.current.panTo({ lat: selectedStation.latitude, lng: selectedStation.longitude });
    }
  }, [selectedStation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Standard marker circle/square styling
  const getMarkerIcon = useCallback((color: string, isSelected: boolean, isAqi: boolean) => {
    return {
      path: isAqi 
        ? 'M 0, 0 m -7, 0 a 7,7 0 1,0 14,0 a 7,7 0 1,0 -14,0' // Circle for AQI
        : 'M -6,-6 L 6,-6 L 6,6 L -6,6 Z',                    // Square for Risk Score
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: isSelected ? '#ffffff' : '#06090e',
      strokeWeight: isSelected ? 2.5 : 1.5,
      scale: isSelected ? 1.4 : 1.0
    };
  }, []);

  // Render the inner content of the map area
  const renderMapContent = () => {
    if (isKeyMissingOrPlaceholder) {
      return (
        <MapErrorState 
          message="Google Maps API Key Missing or Unconfigured"
          details="Vite frontend requires a valid VITE_GOOGLE_MAPS_API_KEY environment variable. We detect either no key or a default placeholder."
        />
      );
    }

    if (loadError) {
      return (
        <MapErrorState 
          message="Failed to Load Google Maps"
          details={loadError.message || "An error occurred while loading the Google Maps Platform JavaScript API. Please check your credentials and network connectivity."}
        />
      );
    }

    if (!isLoaded) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          minHeight: '400px',
          backgroundColor: '#06090e',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem'
        }}>
          <div className="pulse-critical" style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginRight: '10px' }} />
          <span>LOADING GEOSPATIAL DATABASE...</span>
        </div>
      );
    }

    return (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={position.center}
        zoom={position.zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        mapTypeId={mapMode === 'satellite' ? 'hybrid' : 'roadmap'}
        options={mapMode === 'satellite' ? { disableDefaultUI: false } : defaultMapOptions}
      >
        {/* Render AQI Heatmap circles when mode is set to 'heatmap' */}
        {mapMode === 'heatmap' && getMappedStations().map((st) => {
          const displayScore = st.aqi !== undefined && st.aqi !== null && !isNaN(st.aqi) ? st.aqi : st.riskScore;
          if (displayScore === undefined || displayScore === null || isNaN(displayScore)) return null;
          const color = getSeverityColor(getAQISeverity(displayScore));
          return (
            <CircleF
              key={`heatmap-circle-${st.id}`}
              center={{ lat: st.latitude, lng: st.longitude }}
              radius={displayScore * 1200} // radius proportional to AQI/risk
              options={{
                fillColor: color,
                fillOpacity: 0.22,
                strokeColor: color,
                strokeOpacity: 0.35,
                strokeWeight: 1,
                clickable: false
              }}
            />
          );
        })}

        {/* Render markers at their real coordinates */}
        {getMappedStations().map((st) => {
          const hasAqi = st.aqi !== undefined && st.aqi !== null && !isNaN(st.aqi);
          const displayScore = hasAqi ? st.aqi : st.riskScore;
          // (Unused severity variable commented out to resolve TS errors)
          // const severity = getStationSeverity(st);
          const color = getStationSeverityColor(st);
          const isSelected = selectedStation?.id === st.id;

          const titleScore = displayScore !== undefined && displayScore !== null && !isNaN(displayScore) ? displayScore : 'Unavailable';

          return (
            <MarkerF
              key={st.id}
              position={{ lat: st.latitude, lng: st.longitude }}
              onClick={() => onStationSelect(st)}
              title={showLabels ? (hasAqi ? `${st.station} — AQI: ${titleScore}` : `${st.station} — BLiXXiS Risk Score: ${titleScore}`) : st.station}
              icon={getMarkerIcon(color, isSelected, hasAqi)}
            />
          );
        })}

        {/* InfoWindow for Selected Station */}
        {selectedStation && Number.isFinite(selectedStation.latitude) && Number.isFinite(selectedStation.longitude) && isLoaded && (
          <InfoWindowF
            position={{ lat: selectedStation.latitude, lng: selectedStation.longitude }}
            options={{
              pixelOffset: new window.google.maps.Size(0, -5)
            }}
          >
            <div style={{
              color: '#06090e',
              padding: '4px',
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '150px'
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '2px' }}>
                {selectedStation.station}
              </span>
              <span style={{ color: '#475569', fontSize: '0.65rem' }}>
                {selectedStation.city || 'N/A'}, {selectedStation.country}
              </span>
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: selectedStation.aqi !== undefined && selectedStation.aqi !== null && !isNaN(selectedStation.aqi) ? '50%' : '0%',
                  backgroundColor: getStationSeverityColor(selectedStation),
                  display: 'inline-block'
                }} />
                <span>
                  {selectedStation.aqi !== undefined && selectedStation.aqi !== null && !isNaN(selectedStation.aqi)
                    ? <>AQI: <strong>{selectedStation.aqi}</strong> ({selectedStation.aqiCategory})</>
                    : <>Risk Score: <strong>{selectedStation.riskScore !== undefined && selectedStation.riskScore !== null && !isNaN(selectedStation.riskScore) ? selectedStation.riskScore : 'Unavailable'}</strong></>
                  }
                </span>
              </div>
              <span style={{ color: '#64748b', fontSize: '0.6rem', marginTop: '2px' }}>
                {selectedStation.aqi !== undefined && selectedStation.aqi !== null && !isNaN(selectedStation.aqi)
                  ? `Source: ${selectedStation.aqiSource === 'calculated' ? 'Calculated' : 'Dataset'}`
                  : `Method: Pollutant-based Risk`}
              </span>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    );
  };

  return (
    <div className="glass-panel" style={{
      position: 'relative',
      height: '480px',
      overflow: 'hidden',
      border: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Map Control Bar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 5,
        display: 'flex',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(6, 9, 14, 0.85)',
          border: '1px solid var(--border-light)',
          padding: '2px',
          borderRadius: '6px',
          backdropFilter: 'blur(8px)'
        }}>
          {(['geospatial', 'satellite', 'heatmap'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMapMode(mode)}
              style={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '4px',
                color: mapMode === mode ? 'var(--color-primary)' : 'var(--color-text-dark)',
                backgroundColor: mapMode === mode ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Map Information overlay */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 5,
        backgroundColor: 'rgba(6, 9, 14, 0.85)',
        border: '1px solid var(--border-light)',
        padding: '6px 12px',
        borderRadius: '6px',
        backdropFilter: 'blur(8px)',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Compass size={14} className="text-primary" />
        <span style={{ fontWeight: 600, letterSpacing: '0.02em', color: 'var(--color-text-main)' }}>
          {selectedCountry === 'All Countries' ? 'Transnational Common Data Network' : `${selectedCountry} Monitor Network`}
        </span>
      </div>

      {/* Dynamic Load/Mapped Status Overlay for countries with unmapped stations */}
      {selectedCountry && selectedCountry !== 'All Countries' && selectedCountry !== 'All' && (() => {
        const loaded = stations.filter(s => s.country.toLowerCase() === selectedCountry.toLowerCase() || (selectedCountry === 'UAE' && s.country.toLowerCase() === 'united arab emirates')).length;
        const mapped = getMappedStations().filter(s => s.country.toLowerCase() === selectedCountry.toLowerCase() || (selectedCountry === 'UAE' && s.country.toLowerCase() === 'united arab emirates')).length;
        
        if (loaded > mapped) {
          return (
            <div style={{
              position: 'absolute',
              top: '56px',
              right: '16px',
              zIndex: 5,
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '6px 12px',
              borderRadius: '6px',
              backdropFilter: 'blur(8px)',
              fontSize: '0.7rem',
              color: 'var(--color-moderate)',
              fontWeight: 600
            }}>
              {loaded} stations loaded &bull; {mapped} mapped
            </div>
          );
        }
        return null;
      })()}

      {/* Map Content Area */}
      <div style={{ flexGrow: 1, position: 'relative', width: '100%', height: '100%' }}>
        {renderMapContent()}
      </div>

      {/* Map Legend Overlay */}
      {isLoaded && !isKeyMissingOrPlaceholder && !loadError && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 5,
          backgroundColor: 'rgba(6, 9, 14, 0.9)',
          border: '1px solid var(--border-light)',
          padding: '12px 16px',
          borderRadius: '8px',
          backdropFilter: 'blur(8px)',
          fontSize: '0.7rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '280px'
        }}>
          {/* AQI Legend Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-text-light)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              ● AQI
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.65rem' }}>
              <span style={{ color: '#10b981' }}>Good</span>
              <span style={{ color: '#84cc16' }}>Satisfactory</span>
              <span style={{ color: '#f59e0b' }}>Moderate</span>
              <span style={{ color: '#f97316' }}>Poor</span>
              <span style={{ color: '#ef4444' }}>V. Poor</span>
              <span style={{ color: '#7f1d1d' }}>Severe</span>
            </div>
          </div>

          {/* BLiXXiS Risk Legend Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-text-light)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#06b6d4', display: 'inline-block' }} />
              ■ BLiXXiS Risk
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.65rem' }}>
              <span style={{ color: '#06b6d4' }}>Low</span>
              <span style={{ color: '#eab308' }}>Moderate</span>
              <span style={{ color: '#f97316' }}>High</span>
              <span style={{ color: '#ef4444' }}>Critical</span>
            </div>
          </div>
        </div>
      )}

      {selectedStation && (!Number.isFinite(selectedStation.latitude) || !Number.isFinite(selectedStation.longitude)) && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          right: '16px',
          zIndex: 5,
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          padding: '8px 12px',
          borderRadius: '6px',
          backdropFilter: 'blur(8px)',
          fontSize: '0.75rem',
          color: 'var(--color-very-poor)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Compass size={14} className="animate-pulse" />
          <span>Location unavailable for {selectedStation.station}</span>
        </div>
      )}

      {/* Lat/Long Coordinate Grid Display Footer */}
      <div style={{
        backgroundColor: 'rgba(6, 9, 14, 0.9)',
        borderTop: '1px solid var(--border-light)',
        padding: '6px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.65rem',
        color: 'var(--color-text-dark)',
        fontFamily: 'monospace'
      }}>
        <span>SYSTEM COORDINATE MONITOR ACTIVE</span>
        <span>MAPPED TARGET: {selectedCountry === 'All Countries' ? 'ALL REGIONS' : selectedCountry.toUpperCase()}</span>
      </div>
    </div>
  );
};
