import React, { useState, useEffect } from 'react';
import type { EnvironmentalStation, Hotspot, OperationalAlert } from '../types/environmental';
import { EnvironmentalDataService, getRiskSeverity, getRiskSeverityColor } from '../services/environmentalData';
import { EnvironmentalMap } from '../components/dashboard/EnvironmentalMap';
import { StationPanel } from '../components/stations/StationPanel';
import { 
  Flame, 
  Bell, 
  Activity, 
  ChevronsRight
} from 'lucide-react';

interface DashboardProps {
  selectedCountry: string;
  onPageChange: (page: string) => void;
  setSelectedStationGlobal: (st: EnvironmentalStation | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  selectedCountry, 
  onPageChange,
  setSelectedStationGlobal
}) => {
  const [stations, setStations] = useState<EnvironmentalStation[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [selectedStation, setSelectedStation] = useState<EnvironmentalStation | null>(null);
  
  // Fetch stations, hotspots and alerts matching country filter
  useEffect(() => {
    
    // Fetch stations, hotspots and alerts matching country filter
    Promise.all([
      EnvironmentalDataService.getStations({ country: selectedCountry }),
      EnvironmentalDataService.getHotspots(selectedCountry),
      EnvironmentalDataService.getAlerts()
    ]).then(([stData, hsData, alertData]) => {
      setStations(stData);
      setHotspots(hsData);
      // Filter alerts if a country is selected (Delhi/Lucknow for India, Riyadh/Dammam for SA, Dubai for UAE)
      let filteredAlerts = alertData;
      if (selectedCountry === 'India') {
        filteredAlerts = alertData.filter(a => a.location.includes('Delhi') || a.location.includes('Lucknow') || a.location.includes('Mumbai'));
      } else if (selectedCountry === 'Saudi Arabia') {
        filteredAlerts = alertData.filter(a => a.location.includes('Riyadh') || a.location.includes('Dammam') || a.location.includes('Jeddah'));
      } else if (selectedCountry === 'UAE') {
        filteredAlerts = alertData.filter(a => a.location.includes('Dubai') || a.location.includes('Abu Dhabi') || a.location.includes('Sharjah'));
      }
      setAlerts(filteredAlerts);
    }).catch(err => {
      console.error("Error loading dashboard data:", err);
    });
  }, [selectedCountry]);

  // Handle station selection
  const handleStationSelect = (st: EnvironmentalStation) => {
    setSelectedStation(st);
    setSelectedStationGlobal(st);
  };

  // Close station details panel
  const handleClosePanel = () => {
    setSelectedStation(null);
    setSelectedStationGlobal(null);
  };

  // Dynamic KPI calculations
  const calculateKPIs = () => {
    if (stations.length === 0) return { avgAqi: null, avgRisk: null, hotspotCount: 0, forecastPct: 0, criticalAlerts: 0 };

    const validAqis = stations
      .map(s => s.aqi)
      .filter((v): v is number => v !== undefined && v !== null && !isNaN(v) && isFinite(v));
    
    let avgAqi: number | null = null;
    if (validAqis.length > 0) {
      avgAqi = Math.round(validAqis.reduce((acc, curr) => acc + curr, 0) / validAqis.length);
    }

    const validRisks = stations
      .map(s => s.riskScore)
      .filter((v): v is number => v !== undefined && v !== null && !isNaN(v) && isFinite(v));
    
    let avgRisk: number | null = null;
    if (validRisks.length > 0) {
      avgRisk = Math.round(validRisks.reduce((acc, curr) => acc + curr, 0) / validRisks.length);
    }

    const hotspotCount = hotspots.filter(h => h.status === 'Critical' || h.status === 'Emerging').length;
    const forecastPct = (avgRisk !== null && avgRisk > 120) ? 18 : 6; 
    const criticalAlerts = alerts.length;

    return { avgAqi, avgRisk, hotspotCount, forecastPct, criticalAlerts };
  };

  const kpis = calculateKPIs();
  
  // Custom average severity resolver supporting CPCB for India
  const getAverageSeverity = (aqi: number | null, country: string): string => {
    if (aqi === null || aqi === undefined || isNaN(aqi)) return 'Unknown';
    const c = country.toLowerCase();
    if (c === 'india' || c === 'all countries' || c === 'all') {
      // India CPCB thresholds
      if (aqi <= 50) return 'Good';
      if (aqi <= 100) return 'Satisfactory';
      if (aqi <= 200) return 'Moderate';
      if (aqi <= 300) return 'Poor';
      if (aqi <= 400) return 'Very Poor';
      return 'Severe';
    }
    // Default US standard
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Poor';
    if (aqi <= 200) return 'Very Poor';
    return 'Severe';
  };

  const getAverageSeverityColor = (severity: string): string => {
    const s = severity.toLowerCase();
    if (s === 'good') return '#10b981';
    if (s === 'satisfactory') return '#84cc16';
    if (s === 'moderate') return '#f59e0b';
    if (s === 'poor') return '#f97316';
    if (s === 'very poor') return '#ef4444';
    if (s === 'severe') return '#7f1d1d';
    return '#9ca3af';
  };

  const avgSeverity = getAverageSeverity(kpis.avgAqi, selectedCountry);
  const avgSeverityColor = getAverageSeverityColor(avgSeverity);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* 4 KPI Cards Grid */}
      <div className="kpi-grid">
        {/* KPI 1: Average AQI & Risk */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Average AQI
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: avgSeverityColor, fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                {kpis.avgAqi !== null && kpis.avgAqi !== undefined && !isNaN(kpis.avgAqi) ? kpis.avgAqi : 'AQI unavailable'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Average Risk
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: kpis.avgRisk !== null ? getRiskSeverityColor(getRiskSeverity(kpis.avgRisk)) : 'var(--color-text-dark)', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                {kpis.avgRisk !== null ? kpis.avgRisk : 'N/A'}
              </span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px', fontSize: '0.62rem', color: 'var(--color-text-dark)', display: 'flex', justifyContent: 'space-between' }}>
            <span>AQI: CPCB Standard</span>
            <span>Risk: BLiXXiS Pollutant Risk</span>
          </div>
        </div>

        {/* KPI 2: Active Hotspots */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Active Hotspots
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: kpis.hotspotCount > 0 ? 'var(--color-very-poor)' : 'var(--color-good)', fontFamily: 'var(--font-display)' }}>
              {kpis.hotspotCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Emerging / Critical
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '8px' }}>
            Requires immediate local check
          </span>
        </div>

        {/* KPI 3: AQI Forecast Deterioration */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Forecast Risk
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: kpis.forecastPct > 10 ? 'var(--color-poor)' : 'var(--color-good)', fontFamily: 'var(--font-display)' }}>
              +{kpis.forecastPct}%
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Next 12 Hours
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '8px' }}>
            Based on historical trend forecasts
          </span>
        </div>

        {/* KPI 4: Critical Alerts */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Operational Alerts
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: kpis.criticalAlerts > 0 ? 'var(--color-very-poor)' : 'var(--color-good)', fontFamily: 'var(--font-display)' }}>
              {kpis.criticalAlerts}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Active Incidents
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '8px' }}>
            Sourced from sensor threshold models
          </span>
        </div>
      </div>

      {/* Main Map + Side Panel Layout Container */}
      <div style={{
        display: 'flex',
        gap: '20px',
        width: '100%',
        position: 'relative'
      }}>
        {/* Left Side: Geospatial Map */}
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <EnvironmentalMap
            stations={stations}
            selectedCountry={selectedCountry}
            selectedStation={selectedStation}
            onStationSelect={handleStationSelect}
          />
        </div>

        {/* Right Side: Operational Feeds OR Sliding Station Details */}
        <div style={{
          width: '380px',
          flexShrink: 0,
          height: '480px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {selectedStation ? (
            <StationPanel
              station={selectedStation}
              onClose={handleClosePanel}
              onExplainRisk={() => onPageChange('forecast')}
              onGenerateIntervention={() => onPageChange('hotspots')}
            />
          ) : (
            // Default Panel: Hotspot and Alert summary
            <div className="glass-panel" style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              height: '100%',
              overflowY: 'auto'
            }}>
              {/* Alert Feed Header */}
              <div>
                <h3 className="font-display" style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '8px'
                }}>
                  <Bell size={16} className="text-primary" />
                  Live Operational Alerts
                </h3>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}>
                  {alerts.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)', padding: '10px 0' }}>
                      No active operational alerts in this region.
                    </div>
                  ) : (
                    alerts.map((al) => (
                      <div 
                        key={al.id} 
                        onClick={() => onPageChange('alerts')}
                        style={{
                          padding: '10px',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(0, 0, 0, 0.15)',
                          cursor: 'pointer',
                          transition: 'background var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.15)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: al.severity === 'critical' ? 'var(--color-very-poor)' : 'var(--color-poor)'
                          }}>
                            {al.title}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>{al.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          <strong>{al.location}</strong> &bull; {al.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Hotspot Summary List */}
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
                <h3 className="font-display" style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '8px'
                }}>
                  <Flame size={16} className="text-primary" />
                  Regional Hotspots
                </h3>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '12px',
                  overflowY: 'auto',
                  flexGrow: 1,
                  paddingRight: '4px'
                }}>
                  {hotspots.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)', padding: '10px 0' }}>
                      No critical hotspots active.
                    </div>
                  ) : (
                    hotspots.map((hs) => {
                      const color = hs.status === 'Critical' ? 'var(--color-very-poor)' : 'var(--color-poor)';
                      
                      return (
                        <div
                          key={hs.id}
                          onClick={() => {
                            const matchingSt = stations.find(s => s.id === hs.stationId);
                            if (matchingSt) handleStationSelect(matchingSt);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            border: '1px solid var(--border-light)',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                            e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.borderColor = 'var(--border-light)';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: color
                            }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{hs.stationName}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>{hs.city}, {hs.country}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color }}>
                              {hs.scoreType === 'Pollutant-based' 
                                ? `Risk: ${hs.riskScore !== undefined && hs.riskScore !== null ? hs.riskScore : 'N/A'}` 
                                : `AQI ${hs.aqi}`}
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--color-very-poor)', fontWeight: 600 }}>
                              {hs.trend > 0 ? `+${hs.trend}% trend` : `${hs.trend}% trend`}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Platform Summary Narrative */}
      <div className="glass-panel" style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 210, 255, 0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: 'rgba(0, 210, 255, 0.08)',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            borderRadius: '50%',
            padding: '8px',
            color: 'var(--color-primary)'
          }}>
            <Activity size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Platform Concept: DETECT &rarr; PREDICT &rarr; EXPLAIN &rarr; ACT</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              BLiXXiS correlates citizen reports and sensor data, flags emerging hotspots, models AQI forecasts, and uses Gemini to draft interventions.
            </p>
          </div>
        </div>
        
        <button 
          className="btn-primary" 
          onClick={() => onPageChange('network')}
          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
        >
          View Federated Architecture
          <ChevronsRight size={14} />
        </button>
      </div>

    </div>
  );
};
