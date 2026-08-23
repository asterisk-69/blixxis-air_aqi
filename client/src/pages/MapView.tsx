import React, { useState, useEffect } from 'react';
import type { EnvironmentalStation } from '../types/environmental';
import { EnvironmentalDataService } from '../services/environmentalData';
import { EnvironmentalMap } from '../components/dashboard/EnvironmentalMap';
import { StationPanel } from '../components/stations/StationPanel';
import { Search, MapPin } from 'lucide-react';

interface MapViewProps {
  selectedCountry: string;
  setSelectedStationGlobal: (st: EnvironmentalStation | null) => void;
}

export const MapView: React.FC<MapViewProps> = ({ selectedCountry, setSelectedStationGlobal }) => {
  const [stations, setStations] = useState<EnvironmentalStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<EnvironmentalStation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    EnvironmentalDataService.getStations({ country: selectedCountry })
      .then(setStations)
      .catch(console.error);
  }, [selectedCountry]);

  const handleStationSelect = (st: EnvironmentalStation) => {
    setSelectedStation(st);
    setSelectedStationGlobal(st);
  };

  const filteredStations = stations.filter(s => 
    s.station.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.city && s.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', width: '100%' }}>
      {/* Sidebar search / list */}
      <div className="glass-panel" style={{
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '16px',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border-light)',
          padding: '6px 12px',
          borderRadius: '6px'
        }}>
          <Search size={16} className="text-dark" />
          <input 
            type="text" 
            placeholder="Search stations or cities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '0.8rem',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>

        <div style={{
          flexGrow: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Station List ({filteredStations.length})
          </span>
          {filteredStations.map(st => (
            <button
              key={st.id}
              onClick={() => handleStationSelect(st)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                border: '1px solid',
                borderColor: selectedStation?.id === st.id ? 'rgba(0, 210, 255, 0.3)' : 'var(--border-light)',
                borderRadius: '6px',
                backgroundColor: selectedStation?.id === st.id ? 'rgba(0, 210, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={14} className="text-primary" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{st.station}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{st.city || 'N/A'}, {st.country}</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: selectedStation?.id === st.id ? 'var(--color-primary)' : 'var(--color-text-main)'
              }}>
                {st.aqi !== null && st.aqi !== undefined && !isNaN(st.aqi)
                  ? st.aqi
                  : st.riskScore !== null && st.riskScore !== undefined && !isNaN(st.riskScore)
                    ? st.riskScore
                    : 'N/A'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Box */}
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <EnvironmentalMap
          stations={stations}
          selectedCountry={selectedCountry}
          selectedStation={selectedStation}
          onStationSelect={handleStationSelect}
        />
      </div>

      {/* Slide-out Panel Overlay */}
      {selectedStation && (
        <StationPanel
          station={selectedStation}
          onClose={() => {
            setSelectedStation(null);
            setSelectedStationGlobal(null);
          }}
        />
      )}
    </div>
  );
};
