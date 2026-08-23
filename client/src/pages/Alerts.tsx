import React, { useState, useEffect } from 'react';
import type { OperationalAlert, EnvironmentalStation } from '../types/environmental';
import { EnvironmentalDataService } from '../services/environmentalData';
import { Bell, AlertOctagon, MapPin, ExternalLink } from 'lucide-react';

interface AlertsProps {
  onPageChange: (page: string) => void;
  setSelectedStationGlobal: (st: EnvironmentalStation | null) => void;
}

export const Alerts: React.FC<AlertsProps> = ({ onPageChange, setSelectedStationGlobal }) => {
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    EnvironmentalDataService.getAlerts()
      .then(data => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleInspectAlert = (location: string) => {
    // Find matching station based on location name keyword
    EnvironmentalDataService.getStations()
      .then(stList => {
        const keyword = location.split(',')[0].toLowerCase();
        const match = stList.find(s => s.station.toLowerCase().includes(keyword) || (s.city && s.city.toLowerCase().includes(keyword)));
        if (match) {
          setSelectedStationGlobal(match);
          onPageChange('dashboard');
        }
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="font-display" style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--color-text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Bell size={18} className="text-primary" />
          Active Incident Operations Center
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
          The alerts below are generated dynamically. When specific pollutants or AQI readings exceed threshold standards, high-priority notifications alert municipal safety officers to verify conditions.
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--color-text-dark)', fontSize: '0.85rem' }}>Querying active incidents...</div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-dark)' }}>
          No active operational alerts. Grid is running within healthy thresholds.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map((al) => {
            const isCritical = al.severity === 'critical';
            const color = isCritical ? 'var(--color-very-poor)' : 'var(--color-poor)';
            const borderCol = isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)';
            
            return (
              <div 
                key={al.id}
                className="glass-panel"
                style={{
                  padding: '16px',
                  borderLeft: `4px solid ${color}`,
                  borderColor: borderCol,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    backgroundColor: `${color}10`,
                    border: `1px solid ${color}30`,
                    padding: '8px',
                    borderRadius: '50%',
                    color
                  }}>
                    <AlertOctagon size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{al.title}</h4>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                        color,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        textTransform: 'uppercase'
                      }}>
                        {al.severity}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <MapPin size={12} className="text-primary" />
                      <span style={{ fontWeight: 600 }}>{al.location}</span>
                      <span style={{ color: 'var(--color-text-dark)', marginLeft: '6px' }}>&bull; {al.timestamp}</span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                      {al.message}
                    </p>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => handleInspectAlert(al.location)}
                  style={{ fontSize: '0.75rem', padding: '8px 14px', flexShrink: 0 }}
                >
                  Inspect Node
                  <ExternalLink size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
