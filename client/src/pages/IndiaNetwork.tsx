import React, { useState } from 'react';
import { Network, Server, ArrowRight, CheckCircle, Database, Plus, ShieldCheck } from 'lucide-react';

export const IndiaNetwork: React.FC = () => {
  const [states, setStates] = useState([
    { name: 'Delhi NCR', stations: 3, hotspots: 2, status: 'Active', risk: 'Critical', connection: 'Secure API' },
    { name: 'Maharashtra', stations: 2, hotspots: 0, status: 'Active', risk: 'Moderate', connection: 'Secure API' },
    { name: 'Telangana', stations: 2, hotspots: 0, status: 'Active', risk: 'Moderate', connection: 'Secure API' },
    { name: 'Karnataka', stations: 2, hotspots: 0, status: 'Active', risk: 'Moderate', connection: 'Secure API' },
    { name: 'Uttar Pradesh', stations: 1, hotspots: 1, status: 'Active', risk: 'Emerging', connection: 'Secure API' },
    { name: 'Gujarat', stations: 1, hotspots: 0, status: 'Active', risk: 'Moderate', connection: 'Secure API' },
    { name: 'Rajasthan', stations: 1, hotspots: 0, status: 'Active', risk: 'Moderate', connection: 'Secure API' },
    { name: 'West Bengal', stations: 1, hotspots: 0, status: 'Active', risk: 'Moderate', connection: 'Secure API' },
    { name: 'Tamil Nadu', stations: 0, hotspots: 0, status: 'Pending', risk: 'None', connection: 'Not Connected' },
    { name: 'Haryana', stations: 0, hotspots: 0, status: 'Pending', risk: 'None', connection: 'Not Connected' }
  ]);

  const handleConnectNode = (stateName: string) => {
    setStates(prevStates => 
      prevStates.map(s => 
        s.name === stateName 
          ? { ...s, stations: 3, status: 'Active', risk: 'Moderate', connection: 'Secure API' } 
          : s
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* Federated Flow Visualizer Header */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="font-display" style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--color-text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Network size={18} className="text-primary" />
          Transnational Federated Data Architecture
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
          BLiXXiS is built on a shared environmental schema. Municipalities and state boards connect their database nodes via standardized APIs, leveraging central forecasting models, hotspot scoring libraries, and Google Gemini AI features without maintaining localized infrastructure.
        </p>

        {/* Data Architecture Pipeline Steps */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '20px',
          backgroundColor: 'rgba(0,0,0,0.2)',
          border: '1px solid var(--border-light)',
          padding: '16px',
          borderRadius: '8px',
          overflowX: 'auto',
          gap: '12px'
        }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <Server size={22} className="text-primary" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '6px' }}>STATE DATA</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--color-text-dark)' }}>Sensor streams</span>
          </div>

          <ArrowRight size={16} className="text-dark" />

          {/* Step 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <Database size={22} className="text-primary" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '6px' }}>COMMON SCHEMA</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--color-text-dark)' }}>Normalized format</span>
          </div>

          <ArrowRight size={16} className="text-dark" />

          {/* Step 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <ShieldCheck size={22} className="text-primary" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '6px' }}>SHARED AI MODEL</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--color-text-dark)' }}>AQI Forecasting</span>
          </div>

          <ArrowRight size={16} className="text-dark" />

          {/* Step 4 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <Network size={22} className="text-primary" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '6px' }}>HOTSPOT ENGINE</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--color-text-dark)' }}>Risk calculation</span>
          </div>

          <ArrowRight size={16} className="text-dark" />

          {/* Step 5 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <CheckCircle size={22} className="text-primary" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '6px' }}>DISTRICT ACTION</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--color-text-dark)' }}>Intervention plans</span>
          </div>
        </div>
      </div>

      {/* States Connection Grid */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4 className="font-display" style={{
          fontSize: '0.875rem',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '16px'
        }}>
          Regional Node Connection Registry
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {states.map((st) => {
            const isActive = st.status === 'Active';
            
            return (
              <div 
                key={st.name} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.25)',
                  transition: 'background var(--transition-fast)'
                }}
              >
                {/* State Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '120px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{st.name}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Stations: <strong>{st.stations}</strong></span>
                    {isActive && <span>Hotspots: <strong style={{ color: st.hotspots > 0 ? 'var(--color-very-poor)' : 'inherit' }}>{st.hotspots}</strong></span>}
                    <span>Risk: <strong style={{ 
                      color: st.risk === 'Critical' 
                        ? 'var(--color-very-poor)' 
                        : st.risk === 'Emerging' 
                          ? 'var(--color-poor)' 
                          : st.risk === 'Moderate'
                            ? 'var(--color-moderate)'
                            : 'var(--color-text-dark)'
                    }}>{st.risk}</strong></span>
                  </div>
                </div>

                {/* Connection Status & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? 'var(--color-good)' : 'var(--color-text-dark)'
                  }}>
                    {st.connection}
                  </span>

                  {!isActive ? (
                    <button
                      className="btn-primary"
                      onClick={() => handleConnectNode(st.name)}
                      style={{ fontSize: '0.65rem', padding: '4px 8px' }}
                    >
                      <Plus size={10} />
                      Connect Node
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-good)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={12} />
                      Online
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
