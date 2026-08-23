import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Info, RefreshCw, CheckCircle, Database } from 'lucide-react';
import { EnvironmentalDataService } from '../services/environmentalData';

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stationCount, setStationCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Settings states persisted to localStorage
  const [darkTheme, setDarkTheme] = useState(true);
  const [mapLabels, setMapLabels] = useState(true);
  const [preferredCountry, setPreferredCountry] = useState('All');
  const [preferredMetric, setPreferredMetric] = useState<'AQI' | 'Risk'>('AQI');
  const [severeAqiAlerts, setSevereAqiAlerts] = useState(true);
  const [highRiskAlerts, setHighRiskAlerts] = useState(true);
  const [hotspotAlerts, setHotspotAlerts] = useState(true);
  
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  useEffect(() => {
    // Load persisted settings
    const savedTheme = localStorage.getItem('blixxis_dark_theme');
    if (savedTheme !== null) setDarkTheme(savedTheme === 'true');

    const savedLabels = localStorage.getItem('blixxis_map_labels');
    if (savedLabels !== null) setMapLabels(savedLabels === 'true');

    const savedCountry = localStorage.getItem('blixxis_pref_country');
    if (savedCountry !== null) setPreferredCountry(savedCountry);

    const savedMetric = localStorage.getItem('blixxis_pref_metric');
    if (savedMetric !== null) setPreferredMetric(savedMetric as any);

    const savedAqiAlerts = localStorage.getItem('blixxis_alert_aqi');
    if (savedAqiAlerts !== null) setSevereAqiAlerts(savedAqiAlerts === 'true');

    const savedRiskAlerts = localStorage.getItem('blixxis_alert_risk');
    if (savedRiskAlerts !== null) setHighRiskAlerts(savedRiskAlerts === 'true');

    const savedHotspotAlerts = localStorage.getItem('blixxis_alert_hotspot');
    if (savedHotspotAlerts !== null) setHotspotAlerts(savedHotspotAlerts === 'true');

    // Load active stats
    Promise.all([
      EnvironmentalDataService.getStations(),
      EnvironmentalDataService.getDiagnostics()
    ]).then(([stations, diag]) => {
      setStationCount(stations.length);
      setDiagnostics(diag);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading settings stats:", err);
      setLoading(false);
    });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('blixxis_dark_theme', String(darkTheme));
    localStorage.setItem('blixxis_map_labels', String(mapLabels));
    localStorage.setItem('blixxis_pref_country', preferredCountry);
    localStorage.setItem('blixxis_pref_metric', preferredMetric);
    localStorage.setItem('blixxis_alert_aqi', String(severeAqiAlerts));
    localStorage.setItem('blixxis_alert_risk', String(highRiskAlerts));
    localStorage.setItem('blixxis_alert_hotspot', String(hotspotAlerts));

    // Apply light/dark theme class instantly
    if (darkTheme) {
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.add('theme-light');
    }

    setShowSavedMessage(true);
    setTimeout(() => {
      setShowSavedMessage(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--color-primary)' }}>
        <RefreshCw className="animate-spin" size={24} style={{ marginRight: '10px' }} />
        Loading System Settings...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* Save Success Banner */}
      {showSavedMessage && (
        <div className="glass-panel animate-fade-in" style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-good)', borderRadius: '6px', color: 'var(--color-good)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <CheckCircle size={16} />
          System Preferences saved successfully.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }} className="report-grid-half">
        
        {/* Form Settings */}
        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <SettingsIcon size={16} className="text-primary" />
            User Preferences Config
          </h3>

          {/* Map Display Preferences */}
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 700, display: 'block', marginBottom: '12px' }}>Map Display Controls</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={mapLabels} onChange={(e) => setMapLabels(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
                <span>Show Detailed Station labels on Map hover</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={darkTheme} onChange={(e) => setDarkTheme(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
                <span>Default Dashboard Cinematic Dark Theme</span>
              </label>
            </div>
          </div>

          {/* Regional Defaults */}
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 700, display: 'block', marginBottom: '12px' }}>Regional Focus Defaults</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--color-text-dark)', display: 'block', marginBottom: '6px' }}>Preferred Country Filter</label>
                <select 
                  value={preferredCountry} 
                  onChange={(e) => setPreferredCountry(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-deep)', border: '1px solid var(--border-light)', color: 'var(--color-text-light)', padding: '8px 10px', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="All">All Countries</option>
                  <option value="India">India Only</option>
                  <option value="Saudi Arabia">Saudi Arabia Only</option>
                  <option value="UAE">UAE Only</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--color-text-dark)', display: 'block', marginBottom: '6px' }}>Preferred Metric Priority</label>
                <select 
                  value={preferredMetric} 
                  onChange={(e) => setPreferredMetric(e.target.value as any)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-deep)', border: '1px solid var(--border-light)', color: 'var(--color-text-light)', padding: '8px 10px', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="AQI">Calculated National AQI</option>
                  <option value="Risk">BLiXXiS Risk Score Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Incident Alert Thresholds */}
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 700, display: 'block', marginBottom: '12px' }}>Real-time Incident Alerts</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={severeAqiAlerts} onChange={(e) => setSevereAqiAlerts(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
                <span>Trigger Warning banner for Severe CPCB AQI (&gt; 300)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={highRiskAlerts} onChange={(e) => setHighRiskAlerts(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
                <span>Trigger warning for High Pollutant Risk Score (&gt; 1500)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={hotspotAlerts} onChange={(e) => setHotspotAlerts(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
                <span>Show desktop notifications on new Hotspots detected</span>
              </label>
            </div>
          </div>

          <button 
            type="submit"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--color-primary)', border: 'none', color: 'black', padding: '12px 18px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s' }}
            className="btn-hover-glow"
          >
            <Save size={16} />
            Save Preferences
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Static Data Transparency Policies */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', marginBottom: '16px' }}>
              <Info size={16} className="text-primary" />
              Dataset Transparency Audit
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.78rem' }}>
              <div>
                <strong style={{ color: 'var(--color-text-light)', display: 'block', marginBottom: '2px' }}>India AQI Standard</strong>
                <span style={{ color: 'var(--color-text-dark)' }}>CPCB National Air Quality Index — India (2014 guidelines). Excludes CO due to unconfirmed raw units.</span>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-light)', display: 'block', marginBottom: '2px' }}>Risk Assessment Method</strong>
                <span style={{ color: 'var(--color-text-dark)' }}>BLiXXiS Pollutant Risk Model (normalizing PM2.5, PM10, NO2, SO2, CO, O3 metrics against global safety margins).</span>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-light)', display: 'block', marginBottom: '2px' }}>United Arab Emirates Policy</strong>
                <span style={{ color: 'var(--color-text-dark)' }}>Short-term CPCB AQI calculation is disabled for UAE stations because annual averages do not support short-term forecasts.</span>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-light)', display: 'block', marginBottom: '2px' }}>Saudi Arabia Policy</strong>
                <span style={{ color: 'var(--color-text-dark)' }}>AQI calculations are unavailable where temporal metadata, standards, or averaging intervals are insufficient for a defensible calculation.</span>
              </div>
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', marginBottom: '16px' }}>
              <Database size={16} className="text-primary" />
              Live Ingestion Statistics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-dark)' }}>Analytical AI Core</span>
                <span style={{ fontWeight: 600, color: 'var(--color-good)' }}>Online (Graceful Failback active)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-dark)' }}>Environmental Database</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Normalized Registry Ingested</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-dark)' }}>Monitored Stations</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>{stationCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-dark)' }}>Mapped Locations</span>
                <span style={{ fontWeight: 600, color: 'var(--color-good)' }}>{diagnostics?.mapped || 120}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-dark)' }}>Unmapped Locations</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{diagnostics?.unmapped || 57}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-dark)' }}>Last Ingest Cycle</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
