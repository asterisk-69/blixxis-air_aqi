import React, { useState, useEffect } from 'react';
import type { EnvironmentalStation, AQIForecast } from '../../types/environmental';
import { getAQISeverity, getSeverityColor, getRiskSeverity, getRiskSeverityColor, EnvironmentalDataService } from '../../services/environmentalData';
import { X, BrainCircuit, Zap } from 'lucide-react';

interface StationPanelProps {
  station: EnvironmentalStation;
  onClose: () => void;
  onExplainRisk?: (station: EnvironmentalStation) => void;
  onGenerateIntervention?: (station: EnvironmentalStation) => void;
}

export const StationPanel: React.FC<StationPanelProps> = ({
  station,
  onClose,
  onExplainRisk,
  onGenerateIntervention
}) => {
  const [forecast, setForecast] = useState<AQIForecast | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  useEffect(() => {
    setLoadingForecast(true);
    EnvironmentalDataService.getForecast(station.id)
      .then(data => {
        setForecast(data);
        setLoadingForecast(false);
      })
      .catch(() => setLoadingForecast(false));
  }, [station.id]);

  const isAqiMissing = station.aqi === undefined || station.aqi === null || isNaN(station.aqi);

  // Regulatory Standards (Indian Standard limits)
  const standards = {
    pm25: 60, // µg/m³
    pm10: 100, // µg/m³
    no2: 80,   // µg/m³
    so2: 80,   // µg/m³
    co: 2.0,   // mg/m³
    o3: 100    // µg/m³
  };

  // Use authoritative riskScore pre-calculated by the backend
  const riskScoreVal = station.riskScore !== undefined && station.riskScore !== null ? station.riskScore : null;

  const prefMetric = localStorage.getItem('blixxis_pref_metric') || 'AQI';
  const hasAqi = station.aqi !== null && station.aqi !== undefined && !isNaN(station.aqi);
  const hasRisk = riskScoreVal !== null && !isNaN(riskScoreVal);

  // (Unused displayScore commented out to resolve TS errors)
  // const displayScore = (prefMetric === 'Risk' && hasRisk)
  //   ? riskScoreVal
  //   : (hasAqi ? station.aqi : (hasRisk ? riskScoreVal : null));

  const severityColor = (hasAqi && (!hasRisk || prefMetric !== 'Risk'))
    ? getSeverityColor(getAQISeverity(station.aqi))
    : (hasRisk ? getRiskSeverityColor(getRiskSeverity(riskScoreVal)) : '#9ca3af');

  const getPollutantPercentage = (val: number, standard: number) => {
    return Math.min(Math.round((val / standard) * 100), 200);
  };

  // Generate mock history coordinates for SVG line graph (8 data points)
  const generateTrendPath = () => {
    let points: number[] = [];
    if (forecast && forecast.observedHistory && forecast.observedHistory.length > 0) {
      points = [...forecast.observedHistory, forecast.currentAqi ?? 0];
    } else {
      const baseRisk = riskScoreVal || 50;
      points = [
        baseRisk - 25,
        baseRisk - 18,
        baseRisk - 30,
        baseRisk - 15,
        baseRisk - 8,
        baseRisk + 5,
        baseRisk - 3,
        baseRisk
      ];
    }

    const min = Math.min(...points) - 10;
    const max = Math.max(...points) + 10;
    const range = max - min;

    const width = 320;
    const height = 60;
    
    const svgPoints = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    });

    return {
      path: `M ${svgPoints.join(' L ')}`,
      points
    };
  };

  const trendData = generateTrendPath();

  const isValidVal = (val: any) => val !== null && val !== undefined && !isNaN(val) && val !== '';

  const isUae = station.country.toLowerCase() === 'united arab emirates' || station.country.toLowerCase() === 'uae';

  return (
    <div style={{
      width: '380px',
      height: '100%',
      backgroundColor: 'rgba(6, 9, 14, 0.95)',
      borderLeft: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
      zIndex: 8,
      backdropFilter: 'blur(16px)',
      overflowY: 'auto'
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <span style={{
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            color: 'var(--color-text-dark)',
            letterSpacing: '0.08em',
            fontWeight: 700
          }}>
            {station.city || 'N/A'} &bull; {station.state || 'N/A'}
          </span>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            marginTop: '2px',
            color: 'var(--color-text-main)',
            fontFamily: 'var(--font-display)'
          }}>
            {station.station}
          </h2>
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--color-primary)',
            fontWeight: 600,
            marginTop: '4px'
          }}>
            {isUae
              ? 'UAE — annual observations'
              : `${station.country} — ${station.data_granularity || 'observations'}`}
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            color: 'var(--color-text-muted)',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={18} />
        </button>
      </div>

      {/* Panel Content */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Split AQI & Risk Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          {/* Left half: AQI Section */}
          <div className="glass-panel" style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderColor: hasAqi ? `${getSeverityColor(getAQISeverity(station.aqi))}30` : 'var(--border-light)',
            minHeight: '140px'
          }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                AQI
              </span>
              {hasAqi ? (
                <div>
                  <span style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    color: getSeverityColor(getAQISeverity(station.aqi)),
                    lineHeight: 1,
                    display: 'block'
                  }}>
                    {station.aqi}
                  </span>
                  <span className={`severity-badge severity-${station.aqiCategory?.toLowerCase().replace(' ', '-')}`} style={{ marginTop: '8px', display: 'inline-block', fontSize: '0.6rem' }}>
                    {station.aqiCategory}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-dark)', fontFamily: 'var(--font-display)' }}>
                    Unavailable
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', fontStyle: 'italic', lineHeight: '1.25' }}>
                    {station.aqiUnavailableReason || 'Insufficient pollutant data for calculation.'}
                  </span>
                </div>
              )}
            </div>
            
            {hasAqi && (
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', marginTop: '8px', lineHeight: '1.2' }}>
                <div>Source: <strong>{station.aqiSource === 'calculated' ? 'Calculated' : 'Dataset'}</strong></div>
                {station.dominantPollutant && <div style={{ marginTop: '2px' }}>Dominant: <strong style={{ color: 'var(--color-primary)' }}>{station.dominantPollutant}</strong></div>}
              </div>
            )}
          </div>

          {/* Right half: Risk Score Section */}
          <div className="glass-panel" style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderColor: hasRisk ? `${getRiskSeverityColor(getRiskSeverity(riskScoreVal))}30` : 'var(--border-light)',
            minHeight: '140px'
          }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                BLiXXiS Risk
              </span>
              {hasRisk ? (
                <div>
                  <span style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    color: getRiskSeverityColor(getRiskSeverity(riskScoreVal)),
                    lineHeight: 1,
                    display: 'block'
                  }}>
                    {riskScoreVal}
                  </span>
                  <span 
                    className="severity-badge" 
                    style={{ 
                      marginTop: '8px', 
                      display: 'inline-block', 
                      fontSize: '0.6rem',
                      backgroundColor: `${getRiskSeverityColor(getRiskSeverity(riskScoreVal))}15`,
                      color: getRiskSeverityColor(getRiskSeverity(riskScoreVal)),
                      borderColor: `${getRiskSeverityColor(getRiskSeverity(riskScoreVal))}30`
                    }}
                  >
                    {getRiskSeverity(riskScoreVal)} Risk
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-dark)', fontFamily: 'var(--font-display)' }}>
                    Unavailable
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', fontStyle: 'italic', lineHeight: '1.25' }}>
                    Insufficient pollutant data for BLiXXiS risk calculation.
                  </span>
                </div>
              )}
            </div>
            
            {hasRisk && (
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', marginTop: '8px', lineHeight: '1.2' }}>
                <div>Method: <strong>Pollutant-based Risk</strong></div>
                <div style={{ marginTop: '2px' }}>Type: <strong>{station.riskScoreType || 'BLiXXiS Pollutant Risk'}</strong></div>
              </div>
            )}
          </div>
        </div>

        {/* 24h Mini Graph */}
        <div>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--color-text-dark)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: '8px'
          }}>
            Recent 24h {!isAqiMissing ? 'AQI' : 'Risk'} Trend
          </span>
          <div className="glass-panel" style={{ padding: '12px', height: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <svg style={{ width: '100%', height: '60px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={severityColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={severityColor} stopOpacity="0.00" />
                </linearGradient>
              </defs>
              <path
                d={`${trendData.path} L 320,60 L 0,60 Z`}
                fill="url(#trendGrad)"
              />
              <path
                d={trendData.path}
                fill="none"
                stroke={severityColor}
                strokeWidth="2"
              />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--color-text-dark)', marginTop: '2px' }}>
              <span>24h ago ({trendData.points[0]})</span>
              <span>Now ({(hasAqi ? station.aqi : riskScoreVal) || 'N/A'})</span>
            </div>
          </div>
        </div>

        {/* Pollutants Breakdown */}
        <div>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--color-text-dark)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: '10px'
          }}>
            Pollutant Breakdown (Standards)
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* PM 2.5 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span><strong>PM2.5</strong> <span style={{ color: 'var(--color-text-dark)', fontSize: '0.65rem' }}>Fine particles</span></span>
                <span><strong>{isValidVal(station.pm25) ? station.pm25 : 'Unavailable'}</strong> <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>{isValidVal(station.pm25) ? 'µg/m³' : ''}</span></span>
              </div>
              <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative' }}>
                {isValidVal(station.pm25) && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${getPollutantPercentage(station.pm25, standards.pm25)}%`,
                    backgroundColor: station.pm25 > standards.pm25 ? 'var(--color-very-poor)' : 'var(--color-good)',
                    borderRadius: '2px',
                    boxShadow: `0 0 4px ${station.pm25 > standards.pm25 ? 'var(--color-very-poor)' : 'var(--color-good)'}40`
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--color-text-dark)', marginTop: '2px' }}>
                <span>Limit: {standards.pm25} µg/m³</span>
                <span>{isValidVal(station.pm25) ? `${getPollutantPercentage(station.pm25, standards.pm25)}% of standard` : 'N/A'}</span>
              </div>
            </div>

            {/* PM 10 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span><strong>PM10</strong> <span style={{ color: 'var(--color-text-dark)', fontSize: '0.65rem' }}>Coarse particles</span></span>
                <span><strong>{isValidVal(station.pm10) ? station.pm10 : 'Unavailable'}</strong> <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>{isValidVal(station.pm10) ? 'µg/m³' : ''}</span></span>
              </div>
              <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative' }}>
                {isValidVal(station.pm10) && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${getPollutantPercentage(station.pm10, standards.pm10)}%`,
                    backgroundColor: station.pm10 > standards.pm10 ? 'var(--color-poor)' : 'var(--color-good)',
                    borderRadius: '2px'
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--color-text-dark)', marginTop: '2px' }}>
                <span>Limit: {standards.pm10} µg/m³</span>
                <span>{isValidVal(station.pm10) ? `${getPollutantPercentage(station.pm10, standards.pm10)}% of standard` : 'N/A'}</span>
              </div>
            </div>

            {/* Gaseous pollutants row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div className="glass-panel" style={{ padding: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>NO2 (Nitrogen Dioxide)</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px' }}>
                  {isValidVal(station.no2) ? `${station.no2} ` : 'Unavailable'}
                  {isValidVal(station.no2) && <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>µg/m³</span>}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>SO2 (Sulfur Dioxide)</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px' }}>
                  {isValidVal(station.so2) ? `${station.so2} ` : 'Unavailable'}
                  {isValidVal(station.so2) && <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>µg/m³</span>}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>CO (Carbon Monoxide)</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px' }}>
                  {isValidVal(station.co) ? `${station.co} ` : 'Unavailable'}
                  {isValidVal(station.co) && <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>mg/m³</span>}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>O3 (Ozone)</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px' }}>
                  {isValidVal(station.o3) ? `${station.o3} ` : 'Unavailable'}
                  {isValidVal(station.o3) && <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>µg/m³</span>}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Forecast Block */}
        <div>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--color-text-dark)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: '8px'
          }}>
            AQI Deterioration Forecast
          </span>
          <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loadingForecast ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)' }}>Computing forecast model...</div>
            ) : forecast ? (
              forecast.insufficientData ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)' }}>{forecast.message || 'No forecast data.'}</div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 8px' }}>
                  {/* Horizontal line connector */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '10%',
                    width: '80%',
                    height: '1px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    zIndex: 1
                  }} />
                  
                  {forecast.forecastTimeline.map((item, idx) => {
                    const itemSev = getAQISeverity(item.aqi);
                    const itemColor = getSeverityColor(itemSev);
                    
                    return (
                      <div key={`timeline-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', marginBottom: '4px' }}>{item.time}</span>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: itemColor,
                          marginBottom: '6px'
                        }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: item.predicted ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>{item.aqi}</span>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)' }}>No forecast data.</div>
            )}
          </div>
        </div>

        {/* Data Traceability Block */}
        <div>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--color-text-dark)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: '6px'
          }}>
            Data Traceability & Resolution
          </span>
          <div className="glass-panel" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.65rem', color: 'var(--color-text-dark)' }}>
            <div>Resolution: <strong style={{ color: 'white' }}>{station.data_granularity || 'N/A'}</strong></div>
            <div>Dataset Source: <strong style={{ color: 'white' }}>{station.source_dataset || 'BLiXXiS Sensor Grid (Mock)'}</strong></div>
            {station.source_unit_notes && (
              <div>Unit Notes: <strong style={{ color: 'var(--color-primary)' }}>{station.source_unit_notes}</strong></div>
            )}
            {isValidVal(station.latitude) && isValidVal(station.longitude) ? (
              <div>Coordinates: <strong style={{ color: 'white' }}>{station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}</strong></div>
            ) : (
              <div>Coordinates: <strong style={{ color: 'var(--color-very-poor)' }}>Location unavailable</strong></div>
            )}
          </div>
        </div>

        {/* Action Triggers */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderTop: '1px solid var(--border-light)',
          paddingTop: '16px'
        }}>
          {onExplainRisk && (
            <button 
              className="btn-secondary"
              onClick={() => onExplainRisk(station)}
              style={{ justifyContent: 'center' }}
            >
              <BrainCircuit size={16} className="text-primary" />
              Explain Risk (Gemini AI)
            </button>
          )}

          {onGenerateIntervention && (
            <button 
              className="btn-primary"
              onClick={() => onGenerateIntervention(station)}
              style={{ justifyContent: 'center' }}
            >
              <Zap size={16} />
              Generate Intervention
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
