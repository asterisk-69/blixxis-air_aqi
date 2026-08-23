import React, { useState, useEffect } from 'react';
import type { Hotspot } from '../types/environmental';
import { EnvironmentalDataService } from '../services/environmentalData';
import { Flame, Info, Zap, BrainCircuit } from 'lucide-react';

import { AIService } from '../services/aiService';
import type { GenerateInterventionResult } from '../services/aiService';

interface HotspotsProps {
  selectedCountry: string;
}

export const Hotspots: React.FC<HotspotsProps> = ({ selectedCountry }) => {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [intervention, setIntervention] = useState<{
    priority: string;
    reason: string;
    actions: string[];
  } | null>(null);
  const [geminiIntervention, setGeminiIntervention] = useState<GenerateInterventionResult | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setLoading(true);
    EnvironmentalDataService.getHotspots(selectedCountry)
      .then(data => {
        setHotspots(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedCountry]);

  // Handle mock authority intervention generation (Phase 8 placeholder)
  const handleGenerateIntervention = async (hs: Hotspot) => {
    setSelectedHotspot(hs);
    setGenerating(true);
    setIntervention(null);
    setGeminiIntervention(null);
    
    try {
      // 1. Get the full station details to retrieve additional pollutant context
      const station = await EnvironmentalDataService.getStationById(hs.stationId);
      if (!station) {
        throw new Error(`Station not found for ID: ${hs.stationId}`);
      }

      // 2. Fetch forecast and weather data
      const forecast = await EnvironmentalDataService.getForecast(hs.stationId);
      const weatherResult = await EnvironmentalDataService.getLatestWeather(station);

      // 3. Assemble the EnvironmentalContext using the unified data service helper
      const context = EnvironmentalDataService.getEnvironmentalContext(
        station,
        forecast,
        weatherResult,
        hs.trend
      );

      // 4. Call real Gemini backend endpoint
      const result = await AIService.generateIntervention(context);
      setGeminiIntervention(result);
    } catch (err) {
      console.warn("Gemini service failed, falling back to local intervention generator:", err);
      
      setIntervention({
        priority: hs.status === 'Critical' ? 'CRITICAL / HIGH' : 'MODERATE',
        reason: `Rapid AQI trend spike (+${hs.trend}%) and high PM2.5 values (${hs.pm25} µg/m³) detected at monitoring station ${hs.stationName}.`,
        actions: [
          `Increase localized monitoring frequency at ${hs.stationName} node.`,
          `Deploy municipal water-misting trucks to control particulate suspensions within a 2km radius.`,
          `Notify ${hs.city} district environmental safety office.`,
          `Issue public health warnings if the deterioration trend persists for more than 6 hours.`
        ]
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', width: '100%', alignItems: 'flex-start' }}>
      
      {/* Left Column: Active Hotspots & Formula Explainers */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Hotspot Scoring Formula Explainer */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main)' }}>
            <Info size={16} className="text-primary" />
            Transparent Hotspot Scoring Engine
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
            To detect emerging risks early, BLiXXiS uses a prototype scoring algorithm. The score evaluates multiple indicators:
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginTop: '12px'
          }}>
            <div style={{ padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>50% Weight</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '2px' }}>AQI severity index</div>
            </div>
            <div style={{ padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>25% Weight</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '2px' }}>PM2.5 particulate risk</div>
            </div>
            <div style={{ padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>15% Weight</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '2px' }}>24h local trend spike</div>
            </div>
            <div style={{ padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>10% Weight</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '2px' }}>Spatial density index</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '12px', flexWrap: 'wrap' }}>
            <span>CLASSIFICATIONS:</span>
            <span style={{ color: 'var(--color-good)' }}>0-30 NORMAL</span>
            <span style={{ color: 'var(--color-moderate)' }}>30-50 WATCH</span>
            <span style={{ color: 'var(--color-poor)' }}>50-70 EMERGING</span>
            <span style={{ color: 'var(--color-very-poor)' }}>70-100 CRITICAL</span>
          </div>
        </div>

        {/* Hotspots Grid */}
        {loading ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Evaluating monitoring grid...</div>
        ) : hotspots.length === 0 ? (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-dark)' }}>
            No active hotspots detected in this region. All stations within safety boundaries.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {hotspots.map((hs) => {
              const isCritical = hs.status === 'Critical';
              const color = isCritical ? 'var(--color-very-poor)' : 'var(--color-poor)';
              
              return (
                <div 
                  key={hs.id} 
                  className="glass-panel" 
                  style={{
                    padding: '16px',
                    border: '1px solid',
                    borderColor: selectedHotspot?.id === hs.id ? 'var(--color-primary)' : 'var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '180px',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--color-text-dark)'
                      }}>
                        {hs.city}, {hs.country}
                      </span>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color,
                        border: `1px solid ${color}40`,
                        backgroundColor: `${color}10`,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        Score {hs.score}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '8px', color: 'white' }}>
                      {hs.stationName}
                    </h4>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', display: 'block' }}>
                          {hs.scoreType === 'Pollutant-based' ? 'BLiXXiS Risk Score' : 'AQI'}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {hs.scoreType === 'Pollutant-based' 
                            ? (hs.riskScore !== undefined && hs.riskScore !== null ? hs.riskScore : 'N/A') 
                            : hs.aqi}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', display: 'block' }}>PM2.5</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{isNaN(hs.pm25) ? 'N/A' : `${hs.pm25} µg/m³`}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', display: 'block' }}>TREND</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-very-poor)' }}>
                          {hs.trend > 0 ? `+${hs.trend}%` : `${hs.trend}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="btn-primary"
                    onClick={() => handleGenerateIntervention(hs)}
                    style={{ fontSize: '0.75rem', padding: '6px 12px', marginTop: '16px', width: '100%', justifyContent: 'center' }}
                  >
                    <Zap size={14} />
                    Evaluate Intervention
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Dynamic Gemini Intervention Support Panel (Phase 8 Shell) */}
      <div style={{ width: '380px', flexShrink: 0 }}>
        <div className="glass-panel" style={{ padding: '20px', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
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
            paddingBottom: '10px',
            marginBottom: '16px'
          }}>
            <BrainCircuit size={18} className="text-primary" style={{ flexShrink: 0 }} />
            AI Intervention Draft
          </h3>

          {generating ? (
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '2px solid rgba(0, 210, 255, 0.2)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Querying Gemini decision engine...</span>
            </div>
          ) : geminiIntervention && selectedHotspot ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Target Hotspot</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>{selectedHotspot.stationName} ({selectedHotspot.city})</h4>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
                  AI Intervention Recommendation • Powered by Google Gemini
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Threat Priority</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <div style={{
                    backgroundColor: geminiIntervention.priority === 'CRITICAL' || geminiIntervention.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid',
                    borderColor: geminiIntervention.priority === 'CRITICAL' || geminiIntervention.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                    color: geminiIntervention.priority === 'CRITICAL' || geminiIntervention.priority === 'HIGH' ? 'var(--color-very-poor)' : 'var(--color-moderate)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {geminiIntervention.priority}
                  </div>
                  {geminiIntervention.public_advisory_recommended && (
                    <div style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      color: '#a855f7',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      PUBLIC ADVISORY RECOMMENDED
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Rationale</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.45, margin: 0 }}>
                  {geminiIntervention.rationale}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Recommended Actions</span>
                <ul style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '6px',
                  padding: 0,
                  margin: 0
                }}>
                  {geminiIntervention.actions.map((act, index) => {
                    const urgencyColor = act.priority === 'IMMEDIATE' || act.priority === 'HIGH' ? 'var(--color-very-poor)' : 'var(--color-primary)';
                    return (
                      <li key={`act-${index}`} style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-main)',
                        padding: '10px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        borderLeft: `3px solid ${urgencyColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 750, color: 'white' }}>Action {index + 1}</span>
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            color: urgencyColor,
                            backgroundColor: `${urgencyColor}10`,
                            border: `1px solid ${urgencyColor}30`,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            textTransform: 'uppercase'
                          }}>
                            {act.priority}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: 'var(--color-text-main)' }}>{act.action}</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: 'var(--color-text-dark)', fontStyle: 'italic' }}>Reason: {act.reason}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Monitoring Recommendation</span>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '4px',
                  lineHeight: 1.4,
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-light)',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  margin: 0
                }}>
                  {geminiIntervention.monitoring_recommendation}
                </p>
              </div>
            </div>
          ) : intervention && selectedHotspot ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Target Hotspot</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>{selectedHotspot.stationName} ({selectedHotspot.city})</h4>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-very-poor)', marginTop: '2px', fontWeight: 600 }}>
                  ⚠️ Gemini analysis temporarily unavailable. Showing deterministic BLiXXiS risk assessment.
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Priority Status</span>
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--color-very-poor)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginTop: '4px',
                  display: 'inline-block'
                }}>
                  {intervention.priority}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>AI Context Justification</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  {intervention.reason}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Suggested Action List</span>
                <ul style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '6px'
                }}>
                  {intervention.actions.map((act, index) => (
                    <li key={`act-${index}`} style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-main)',
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      borderLeft: '2px solid var(--color-primary)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{index + 1}.</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dark)', textAlign: 'center', gap: '10px' }}>
              <Flame size={32} strokeWidth={1} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '0.75rem' }}>Select a station and click "Evaluate Intervention" to draft AI recommendations.</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
