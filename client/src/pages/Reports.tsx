import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { EnvironmentalDataService } from '../services/environmentalData';
import type { EnvironmentalStation, Hotspot } from '../types/environmental';

interface ReportsProps {
  selectedCountry: string;
  setSelectedStationGlobal: (station: EnvironmentalStation | null) => void;
  onPageChange: (page: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ selectedCountry: initialCountry, setSelectedStationGlobal, onPageChange }) => {
  const [stations, setStations] = useState<EnvironmentalStation[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterCountry, setFilterCountry] = useState(initialCountry === 'All Countries' ? 'All' : initialCountry);
  const [filterStation, setFilterStation] = useState('All');
  const [filterMetric, setFilterMetric] = useState<'All' | 'AQI' | 'Risk'>('All');

  useEffect(() => {
    setFilterCountry(initialCountry === 'All Countries' ? 'All' : initialCountry);
  }, [initialCountry]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      EnvironmentalDataService.getStations(),
      EnvironmentalDataService.getHotspots(),
      EnvironmentalDataService.getDiagnostics()
    ]).then(([stationsData, hotspotsData, diagData]) => {
      setStations(stationsData);
      setHotspots(hotspotsData);
      setDiagnostics(diagData);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading reports data:", err);
      setLoading(false);
    });
  }, []);

  // Filter Logic
  const filteredStations = stations.filter(s => {
    const matchCountry = filterCountry === 'All' || s.country.toLowerCase() === filterCountry.toLowerCase() || (filterCountry === 'UAE' && s.country.toLowerCase() === 'united arab emirates');
    const matchStation = filterStation === 'All' || s.id === filterStation;
    
    const hasAqi = s.aqi !== null && s.aqi !== undefined && !isNaN(s.aqi);
    const matchMetric = filterMetric === 'All' || 
                        (filterMetric === 'AQI' && hasAqi) || 
                        (filterMetric === 'Risk' && !hasAqi);

    return matchCountry && matchStation && matchMetric;
  });

  const uniqueCountries = Array.from(new Set(stations.map(s => s.country)));

  // Executive summary statistics based on filtered data
  const totalFiltered = filteredStations.length;
  const mappedFiltered = filteredStations.filter(s => !isNaN(s.latitude) && !isNaN(s.longitude) && isFinite(s.latitude) && isFinite(s.longitude)).length;
  
  const stationsWithAqi = filteredStations.filter(s => s.aqi !== null && s.aqi !== undefined && !isNaN(s.aqi));
  const avgAqi = stationsWithAqi.length > 0 
    ? Math.round(stationsWithAqi.reduce((acc, curr) => acc + (curr.aqi || 0), 0) / stationsWithAqi.length)
    : null;

  const stationsWithRisk = filteredStations.filter(s => s.riskScore !== null && s.riskScore !== undefined && !isNaN(s.riskScore));
  const avgRisk = stationsWithRisk.length > 0 
    ? Math.round(stationsWithRisk.reduce((acc, curr) => acc + (curr.riskScore || 0), 0) / stationsWithRisk.length)
    : null;

  // (Unused highestRiskStation commented out to resolve TS errors)
  // const highestRiskStation = stationsWithRisk.length > 0
  //   ? [...stationsWithRisk].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0]
  //   : null;

  const highestAqiStation = stationsWithAqi.length > 0
    ? [...stationsWithAqi].sort((a, b) => (b.aqi || 0) - (a.aqi || 0))[0]
    : null;

  const activeHotspotsCount = hotspots.filter(h => {
    const s = stations.find(st => st.id === h.stationId);
    if (!s) return false;
    const matchCountry = filterCountry === 'All' || s.country.toLowerCase() === filterCountry.toLowerCase() || (filterCountry === 'UAE' && s.country.toLowerCase() === 'united arab emirates');
    return matchCountry;
  }).length;

  // Pollutant Summary calculations
  const calculatePollutantStats = (key: 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3') => {
    const vals = filteredStations
      .map(s => s[key])
      .filter((v): v is number => v !== undefined && v !== null && !isNaN(v));

    if (vals.length === 0) return { avg: 'Unavailable', min: 'Unavailable', max: 'Unavailable', count: 0 };
    const sum = vals.reduce((acc, curr) => acc + curr, 0);
    return {
      avg: (sum / vals.length).toFixed(1),
      min: Math.min(...vals).toFixed(1),
      max: Math.max(...vals).toFixed(1),
      count: vals.length
    };
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--color-primary)' }}>
        <RefreshCw className="animate-spin" size={24} style={{ marginRight: '10px' }} />
        Generating Environmental Analysis Report...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }} className="print-report-container">
      
      {/* Controls / Filter Bar */}
      <div className="glass-panel no-print" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-dark)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Country Filter</label>
            <select 
              value={filterCountry} 
              onChange={(e) => { setFilterCountry(e.target.value); setFilterStation('All'); }}
              style={{ backgroundColor: 'var(--bg-deep)', border: '1px solid var(--border-light)', color: 'var(--color-text-light)', padding: '8px 12px', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="All">All Countries</option>
              {uniqueCountries.map(c => (
                <option key={c} value={c}>{c === 'United Arab Emirates' ? 'UAE' : c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-dark)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Station Focus</label>
            <select 
              value={filterStation} 
              onChange={(e) => setFilterStation(e.target.value)}
              style={{ backgroundColor: 'var(--bg-deep)', border: '1px solid var(--border-light)', color: 'var(--color-text-light)', padding: '8px 12px', borderRadius: '4px', outline: 'none', fontSize: '0.85rem', maxWidth: '240px' }}
            >
              <option value="All">All Filtered Stations</option>
              {stations.filter(s => {
                const matchCountry = filterCountry === 'All' || s.country.toLowerCase() === filterCountry.toLowerCase() || (filterCountry === 'UAE' && s.country.toLowerCase() === 'united arab emirates');
                return matchCountry;
              }).map(s => (
                <option key={s.id} value={s.id}>{s.station}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-dark)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Metric Scope</label>
            <select 
              value={filterMetric} 
              onChange={(e) => setFilterMetric(e.target.value as any)}
              style={{ backgroundColor: 'var(--bg-deep)', border: '1px solid var(--border-light)', color: 'var(--color-text-light)', padding: '8px 12px', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="All">All Metrics (AQI & Risk)</option>
              <option value="AQI">Calculated AQI Only</option>
              <option value="Risk">BLiXXiS Risk Fallbacks Only</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0, 210, 255, 0.1)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
          className="btn-hover-glow"
        >
          <Download size={16} />
          Print / Download PDF
        </button>
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid var(--color-primary)', paddingLeft: '16px' }}>
        <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Environmental Intelligence Summary
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Regional Analysis Report generated deterministically from the normalized climate intelligence registry.
        </p>
      </div>

      {/* SECTION 2: EXECUTIVE SUMMARY */}
      <div className="kpi-grid">
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg CPCB AQI</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: avgAqi ? 'var(--color-primary)' : 'var(--color-text-dark)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            {avgAqi ? avgAqi : 'Unavailable'}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '4px' }}>
            Calculable stations: {stationsWithAqi.length}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Pollutant Risk</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: avgRisk ? 'var(--color-accent)' : 'var(--color-text-dark)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            {avgRisk ? avgRisk : 'Unavailable'}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '4px' }}>
            Risk-active stations: {stationsWithRisk.length}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Highest AQI Focus</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-very-poor)', marginTop: '4px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {highestAqiStation ? `${highestAqiStation.station} (${highestAqiStation.aqi})` : 'None'}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '6px' }}>
            Dominant: {highestAqiStation?.dominantPollutant || 'N/A'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Hotspots</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: activeHotspotsCount > 0 ? 'var(--color-very-poor)' : 'var(--color-text-dark)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            {activeHotspotsCount}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '4px' }}>
            Across filtered domain
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="report-grid-half">
        {/* Monitored Registry Statistics Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', marginBottom: '16px' }}>
            <ShieldCheck size={16} className="text-primary" />
            Registry Coverage Metrics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>Total Registry Stations</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>{totalFiltered}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>Geographically Mapped</span>
              <span style={{ fontWeight: 600, color: 'var(--color-good)' }}>{mappedFiltered}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>Unmapped (Missing Coords)</span>
              <span style={{ fontWeight: 600, color: totalFiltered - mappedFiltered > 0 ? 'var(--color-very-poor)' : 'var(--color-text-muted)' }}>
                {totalFiltered - mappedFiltered}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>Calculable AQI Stations</span>
              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{stationsWithAqi.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>AQI Unavailable Stations</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{totalFiltered - stationsWithAqi.length}</span>
            </div>
          </div>
        </div>

        {/* SECTION 6: DATA QUALITY STATISTICS */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', marginBottom: '16px' }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-moderate)' }} />
            Data Quality & Integrity Audits
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>AQI Ingest Coverage</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>
                {totalFiltered > 0 ? `${((stationsWithAqi.length / totalFiltered) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>Risk Model Coverage</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>
                {totalFiltered > 0 ? `${((stationsWithRisk.length / totalFiltered) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>Missing Coords Count</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>{diagnostics?.unmapped || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>Annual Granularity Stations</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>{diagnostics?.uaeCount || 57}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-text-dark)' }}>Unverified Unit Indicators</span>
              <span style={{ fontWeight: 600, color: 'var(--color-moderate)' }}>Yes (India CO)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: POLLUTANT SUMMARY */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', marginBottom: '16px' }}>
          Pollutant Diagnostics Breakdown
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="hotspots-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Pollutant</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Std Reference</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Average Value</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Minimum Value</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Maximum Value</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Reporting Observations</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'PM2.5', key: 'pm25' as const, std: '60 µg/m³' },
                { label: 'PM10', key: 'pm10' as const, std: '100 µg/m³' },
                { label: 'NO2', key: 'no2' as const, std: '80 µg/m³' },
                { label: 'SO2', key: 'so2' as const, std: '80 µg/m³' },
                { label: 'CO', key: 'co' as const, std: '2.0 mg/m³' },
                { label: 'O3', key: 'o3' as const, std: '100 µg/m³' }
              ].map(p => {
                const stats = calculatePollutantStats(p.key);
                return (
                  <tr key={p.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-light)' }}>{p.label}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{p.std}</td>
                    <td style={{ padding: '10px 12px', color: stats.avg !== 'Unavailable' ? 'var(--color-primary)' : 'var(--color-text-dark)' }}>
                      {stats.avg}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{stats.min}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{stats.max}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-dark)' }}>{stats.count} stations</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: HOTSPOTS */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>
          Regional Active Hotspots
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="hotspots-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Station</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Location</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>hotspot Score</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Score Type</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Status</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {hotspots.filter(h => {
                const s = stations.find(st => st.id === h.stationId);
                if (!s) return false;
                const matchCountry = filterCountry === 'All' || s.country.toLowerCase() === filterCountry.toLowerCase() || (filterCountry === 'UAE' && s.country.toLowerCase() === 'united arab emirates');
                return matchCountry;
              }).slice(0, 5).map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-light)' }}>{h.stationName}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{h.city ? `${h.city}, ` : ''}{h.country === 'United Arab Emirates' ? 'UAE' : h.country}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-very-poor)', fontWeight: 700 }}>
                    {h.scoreType === 'AQI-based' && h.aqi !== undefined ? `AQI: ${h.aqi}` : `Risk: ${h.riskScore || 'N/A'}`}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{h.scoreType}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`severity-badge severity-${h.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                      {h.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: h.trend >= 0 ? 'var(--color-very-poor)' : 'var(--color-good)' }}>
                    {h.trend >= 0 ? `+${h.trend}%` : `${h.trend}%`}
                  </td>
                </tr>
              ))}
              {hotspots.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-dark)' }}>No active hotspots found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: REGIONAL BREAKDOWN */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>
          Regional Station Registry Breakdown
        </h3>
        <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
          <table className="hotspots-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 1 }}>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Station</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Country</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>City / State</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)', textAlign: 'center' }}>CPCB AQI</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>AQI Category</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)', textAlign: 'center' }}>Risk Score</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Risk Type</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Dominant</th>
                <th style={{ padding: '8px 12px', color: 'var(--color-text-dark)' }}>Granularity</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map(s => {
                const hasAqi = s.aqi !== null && s.aqi !== undefined && !isNaN(s.aqi);
                return (
                  <tr 
                    key={s.id} 
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedStationGlobal(s);
                      onPageChange('map');
                    }}
                    className="sidebar-item-hover"
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-light)' }}>{s.station}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{s.country === 'United Arab Emirates' ? 'UAE' : s.country}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>
                      {s.city || 'Unavailable'} / {s.state || 'Unavailable'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: hasAqi ? 'var(--color-primary)' : 'var(--color-text-dark)', fontWeight: hasAqi ? 700 : 500 }}>
                      {hasAqi ? s.aqi : 'Unavailable'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {hasAqi && s.aqiCategory ? (
                        <span className={`severity-badge severity-${s.aqiCategory.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.6rem' }}>
                          {s.aqiCategory}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-dark)' }}>Unavailable</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: s.riskScore !== null && s.riskScore !== undefined ? 'var(--color-accent)' : 'var(--color-text-dark)', fontWeight: 600 }}>
                      {s.riskScore !== null && s.riskScore !== undefined ? s.riskScore : 'Unavailable'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>
                      {s.riskScoreType || 'Unavailable'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {s.dominantPollutant || 'Unavailable'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-dark)', fontSize: '0.75rem' }}>{s.data_granularity || 'Unavailable'}</td>
                  </tr>
                );
              })}
              {filteredStations.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-dark)' }}>No stations match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
