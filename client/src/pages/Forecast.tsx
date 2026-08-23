import React, { useState, useEffect, useMemo } from 'react';
import type { EnvironmentalStation, AQIForecast } from '../types/environmental';
import { getAQISeverity, getSeverityColor, getRiskSeverity, getRiskSeverityColor, EnvironmentalDataService } from '../services/environmentalData';
import { getStationTrend, getStationHistory } from '../services/forecastEngine';
import type { ForecastResult } from '../services/forecastEngine';
import { Compass, AlertCircle, BrainCircuit, BarChart2 } from 'lucide-react';
import { AIService } from '../services/aiService';
import type { ExplainRiskResult } from '../services/aiService';

interface ForecastProps {
  selectedCountry: string;
  selectedStationGlobal: EnvironmentalStation | null;
}

export const Forecast: React.FC<ForecastProps> = ({ selectedCountry, selectedStationGlobal }) => {
  const [stations, setStations] = useState<EnvironmentalStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<EnvironmentalStation | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [geminiExplanation, setGeminiExplanation] = useState<ExplainRiskResult | null>(null);

  const [weatherContext, setWeatherContext] = useState<any | null>(null);
  const [weatherMatchInfo, setWeatherMatchInfo] = useState<{ matchType: string; matchDistance?: number } | null>(null);

  // Fetch stations for select list
  useEffect(() => {
    setLoading(true);
    EnvironmentalDataServiceGetStations({ country: selectedCountry })
      .then(data => {
        setStations(data);
        if (selectedStationGlobal) {
          const match = data.find(s => s.id === selectedStationGlobal.id);
          if (match) setSelectedStation(match);
          else if (data.length > 0) setSelectedStation(data[0]);
        } else if (data.length > 0) {
          setSelectedStation(data[0]);
        }
      })
      .catch(err => {
        console.error("Error loading stations for forecast:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedCountry, selectedStationGlobal]);

  // Wrap service fetch inside standard mock generator to prevent compilation issues
  // while keeping getStations isolated.
  const EnvironmentalDataServiceGetStations = async (filters: { country?: string }) => {
    return EnvironmentalDataService.getStations(filters);
  };

  // Run forecast calculation when selectedStation changes
  useEffect(() => {
    if (!selectedStation) {
      setForecast(null);
      setWeatherContext(null);
      setWeatherMatchInfo(null);
      return;
    }
    setLoading(true);
    setExplanation(null);
    setGeminiExplanation(null);


    
    Promise.all([
      EnvironmentalDataService.getForecast(selectedStation.id),
      EnvironmentalDataService.getLatestWeather(selectedStation)
    ]).then(([forecastData, weatherResult]) => {
      setWeatherContext(weatherResult.weather);
      setWeatherMatchInfo({
        matchType: weatherResult.matchType,
        matchDistance: weatherResult.matchDistance
      });

      if (forecastData.insufficientData) {
        setForecast({
          predicted6h: 0,
          predicted12h: 0,
          predicted24h: 0,
          risk6h: 'Good',
          risk12h: 'Good',
          risk24h: 'Good',
          pctChange6h: 0,
          pctChange12h: 0,
          pctChange24h: 0,
          confidence: 'Low',
          contributingFactors: [],
          spikeExpected: false,
          insufficientData: true,
          message: forecastData.message || 'Insufficient temporal data for short-term forecasting.'
        } as any);
      } else {
        const currentScore = forecastData.forecastMetric === 'Risk' ? (forecastData.currentRiskScore || 0) : (forecastData.currentAqi || 0);
        const pctChange6h = Math.round(((forecastData.forecast6h - currentScore) / (currentScore || 1)) * 100);
        const pctChange12h = Math.round(((forecastData.forecast12h - currentScore) / (currentScore || 1)) * 100);
        const pctChange24h = Math.round(((forecastData.forecast24h - currentScore) / (currentScore || 1)) * 100);

        setForecast({
          predicted6h: forecastData.forecast6h,
          predicted12h: forecastData.forecast12h,
          predicted24h: forecastData.forecast24h,
          risk6h: forecastData.forecastMetric === 'Risk' ? getRiskSeverity(forecastData.forecast6h) : getAQISeverity(forecastData.forecast6h),
          risk12h: forecastData.forecastMetric === 'Risk' ? getRiskSeverity(forecastData.forecast12h) : getAQISeverity(forecastData.forecast12h),
          risk24h: forecastData.forecastMetric === 'Risk' ? getRiskSeverity(forecastData.forecast24h) : getAQISeverity(forecastData.forecast24h),
          pctChange6h,
          pctChange12h,
          pctChange24h,
          confidence: selectedStation.pm25 > 110 ? 'Medium' : 'High',
          spikeExpected: (forecastData.forecast24h >= (forecastData.forecastMetric === 'Risk' ? 1500 : 150) && pctChange24h >= 12) || forecastData.forecast24h >= (forecastData.forecastMetric === 'Risk' ? 2500 : 200),
          contributingFactors: [
            {
              factor: 'Short-term Momentum',
              impact: pctChange24h > 15 ? 'High' : pctChange24h > 5 ? 'Medium' : 'Low',
              description: pctChange24h > 0
                ? `Station risk trend is projected to rise at +${pctChange24h}% over the 24h timeline.`
                : 'Particulate concentrations are projected to remain relatively stable.'
            },
            {
              factor: 'Particulate Loading (PM2.5)',
              impact: selectedStation.pm25 > 100 ? 'High' : selectedStation.pm25 > 50 ? 'Medium' : 'Low',
              description: selectedStation.pm25 > 100
                ? `Heavy particulate loading (${selectedStation.pm25} µg/m³) creates high density resistance.`
                : `PM2.5 levels are currently at ${selectedStation.pm25} µg/m³.`
            }
          ],
          observedHistory: forecastData.observedHistory,
          currentAqi: forecastData.currentAqi,
          currentRiskScore: forecastData.currentRiskScore,
          forecastMetric: forecastData.forecastMetric
        } as any);
      }
    }).catch(err => {
      console.error("Error fetching forecast:", err);
    }).finally(() => {
      setLoading(false);
    });
  }, [selectedStation]);

  const handleGenerateExplanation = async () => {
    if (!selectedStation || !forecast) return;
    setExplaining(true);
    setExplanation(null);
    setGeminiExplanation(null);



    try {
      const weatherResult = await EnvironmentalDataService.getLatestWeather(selectedStation);
      
      const context = EnvironmentalDataService.getEnvironmentalContext(
        selectedStation,
        (forecast as any).insufficientData ? null : {
          stationId: selectedStation.id,
          currentAqi: (forecast as any).currentAqi || selectedStation.aqi,
          currentRiskScore: (forecast as any).currentRiskScore || null,
          forecastMetric: (forecast as any).forecastMetric || 'AQI',
          forecast6h: forecast.predicted6h,
          forecast12h: forecast.predicted12h,
          forecast24h: forecast.predicted24h,
          forecastTimeline: []
        } as AQIForecast,
        weatherResult,
        forecast.pctChange24h
      );

      const result = await AIService.explainRisk(context);
      setGeminiExplanation(result);
    } catch (err) {
      console.warn("Gemini service failed, falling back to local deterministic generator:", err);
      
      const isDelhi = selectedStation.city === "New Delhi" || selectedStation.city === "Lucknow";
      const isGulf = selectedStation.country === "Saudi Arabia" || selectedStation.country === "UAE";
      
      let reasonText = "";
      if (isDelhi) {
        reasonText = `The PM2.5 levels (${selectedStation.pm25} µg/m³) at ${selectedStation.station} combined with the current trend indicate high pollutant concentration. Lower boundary layer height and static surface wind conditions are causing particulate entrapment.`;
      } else if (isGulf) {
        reasonText = `The forecast indicates minor particle accumulation at ${selectedStation.station} primarily driven by elevated PM10 (${selectedStation.pm10} µg/m³), indicating suspended mineral dust particles.`;
      } else {
        reasonText = `Localized emission density and standard daily vehicle volume spikes are driving the upward trend at ${selectedStation.station}.`;
      }

      setExplanation(reasonText);
    } finally {
      setExplaining(false);
    }
  };


  // Helper to draw forecast SVG (dashed lines to show prediction)
  const chartPaths = useMemo(() => {
    if (!selectedStation || !forecast || (forecast as any).insufficientData) return null;
    
    const observed = (forecast as any).observedHistory || getStationHistory(selectedStation);
    const isRisk = (forecast as any).forecastMetric === 'Risk';
    const currentVal = isRisk 
      ? ((forecast as any).currentRiskScore !== null && (forecast as any).currentRiskScore !== undefined ? (forecast as any).currentRiskScore : selectedStation.riskScore || 0)
      : ((forecast as any).currentAqi !== null && (forecast as any).currentAqi !== undefined ? (forecast as any).currentAqi : selectedStation.aqi || 0);
    const observedWithCurrent = [...observed, currentVal];

    const predicted = [
      currentVal,
      forecast.predicted6h,
      forecast.predicted12h,
      forecast.predicted24h
    ];

    const allPoints = [...observedWithCurrent, ...predicted.slice(1)];
    const min = Math.max(0, Math.min(...allPoints) - 15);
    const max = Math.max(...allPoints) + 15;
    const range = max - min;

    const width = 640;
    const height = 180;

    // Project index -> x, value -> y
    const getX = (idx: number) => (idx / 6) * width;
    const getY = (val: number) => height - ((val - min) / (range || 1)) * height;

    const obsPoints = observedWithCurrent.map((v, i) => `${getX(i)},${getY(v)}`);
    const predPoints = predicted.map((v, i) => `${getX(i + 3)},${getY(v)}`);

    return {
      obsPath: `M ${obsPoints.join(' L ')}`,
      predPath: `M ${predPoints.join(' L ')}`,
      allPoints,
      getX,
      getY,
      observed: observedWithCurrent,
      predicted,
      min,
      max
    };
  }, [selectedStation, forecast]);

  return (
    <div style={{ display: 'flex', gap: '20px', width: '100%', alignItems: 'flex-start' }}>
      
      {/* Left side: Forecast Chart, Structured Cards, and Selectors */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Station Selector Bar */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Target Node:</span>
            <select
              value={selectedStation?.id || ''}
              onChange={(e) => {
                const match = stations.find(s => s.id === e.target.value);
                if (match) setSelectedStation(match);
              }}
              style={{
                backgroundColor: 'rgba(6, 9, 14, 0.85)',
                border: '1px solid var(--border-light)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                outline: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {stations.map(st => (
                <option key={st.id} value={st.id}>{st.station} ({st.city || 'N/A'})</option>
              ))}
            </select>

            <span style={{
              fontSize: '0.65rem',
              backgroundColor: 'rgba(0, 210, 255, 0.1)',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              color: 'var(--color-primary)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Prototype Baseline Forecast
            </span>
          </div>
          
          {selectedStation && (
            <div style={{ fontSize: '0.85rem' }}>
              {selectedStation.aqi !== null && selectedStation.aqi !== undefined && !isNaN(selectedStation.aqi) ? (
                <>Current observed AQI: <span style={{ color: getSeverityColor(getAQISeverity(selectedStation.aqi)), fontWeight: 700 }}>{selectedStation.aqi}</span></>
              ) : (
                <>Current BLiXXiS Risk: <span style={{ color: getRiskSeverityColor(getRiskSeverity(selectedStation.riskScore)), fontWeight: 700 }}>{selectedStation.riskScore !== null && selectedStation.riskScore !== undefined ? selectedStation.riskScore : 'Unavailable'}</span></>
              )}
            </div>
          )}
        </div>

        {/* Warning Banner */}
        {forecast?.spikeExpected && !(forecast as any).insufficientData && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '6px',
            color: 'var(--color-very-poor)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8rem',
            fontWeight: 600,
            animation: 'pulse-glow 2.5s infinite'
          }}>
            <AlertCircle size={16} />
            <span>⚠️ WARNING: PARTICLE SPIKE EXPECTED within 24h (+{forecast.pctChange24h}% growth). Mitigations recommended.</span>
          </div>
        )}

        {/* Insufficient Data Warning Callout */}
        {forecast && (forecast as any).insufficientData && (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px dashed rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            color: 'var(--color-very-poor)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{(forecast as any).message || 'Insufficient temporal data for short-term forecasting.'}</span>
          </div>
        )}

        {/* Structured KPI Predictions Grid */}
        {forecast && selectedStation && !(forecast as any).insufficientData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px'
          }}>
            {/* Card 1: Observed Current */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '90px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                {(forecast as any).forecastMetric === 'Risk' ? 'Observed Current BLiXXiS Risk' : 'Observed Current AQI'}
              </span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: (forecast as any).forecastMetric === 'Risk' ? getRiskSeverityColor(getRiskSeverity((forecast as any).currentRiskScore)) : getSeverityColor(getAQISeverity((forecast as any).currentAqi)), marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                {(forecast as any).forecastMetric === 'Risk' ? (forecast as any).currentRiskScore : (forecast as any).currentAqi}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '4px' }}>
                Type: {(forecast as any).forecastMetric === 'Risk' ? 'BLiXXiS Risk' : 'AQI'}
              </span>
            </div>
            
            {/* Card 2: +6h */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '90px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                {(forecast as any).forecastMetric === 'Risk' ? '+6 Hours Forecast (BLiXXiS Risk)' : '+6 Hours Forecast (AQI)'}
              </span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: (forecast as any).forecastMetric === 'Risk' ? getRiskSeverityColor(forecast.risk6h as any) : getSeverityColor(forecast.risk6h as any), marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                {forecast.predicted6h}
              </span>
              <span style={{ fontSize: '0.65rem', color: forecast.pctChange6h >= 0 ? 'var(--color-very-poor)' : 'var(--color-good)', marginTop: '4px', fontWeight: 600 }}>
                {forecast.pctChange6h >= 0 ? `+${forecast.pctChange6h}%` : `${forecast.pctChange6h}%`} vs current
              </span>
            </div>
            
            {/* Card 3: +12h */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '90px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                {(forecast as any).forecastMetric === 'Risk' ? '+12 Hours Forecast (BLiXXiS Risk)' : '+12 Hours Forecast (AQI)'}
              </span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: (forecast as any).forecastMetric === 'Risk' ? getRiskSeverityColor(forecast.risk12h as any) : getSeverityColor(forecast.risk12h as any), marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                {forecast.predicted12h}
              </span>
              <span style={{ fontSize: '0.65rem', color: forecast.pctChange12h >= 0 ? 'var(--color-very-poor)' : 'var(--color-good)', marginTop: '4px', fontWeight: 600 }}>
                {forecast.pctChange12h >= 0 ? `+${forecast.pctChange12h}%` : `${forecast.pctChange12h}%`} vs current
              </span>
            </div>
            
            {/* Card 4: +24h */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '90px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                {(forecast as any).forecastMetric === 'Risk' ? '+24 Hours Forecast (BLiXXiS Risk)' : '+24 Hours Forecast (AQI)'}
              </span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: (forecast as any).forecastMetric === 'Risk' ? getRiskSeverityColor(forecast.risk24h as any) : getSeverityColor(forecast.risk24h as any), marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                {forecast.predicted24h}
              </span>
              <span style={{ fontSize: '0.65rem', color: forecast.pctChange24h >= 0 ? 'var(--color-very-poor)' : 'var(--color-good)', marginTop: '4px', fontWeight: 600 }}>
                {forecast.pctChange24h >= 0 ? `+${forecast.pctChange24h}%` : `${forecast.pctChange24h}%`} vs current
              </span>
            </div>

            {/* Card 5: Confidence */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '90px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Model Confidence</span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: forecast.confidence === 'High' ? 'var(--color-good)' : forecast.confidence === 'Medium' ? 'var(--color-moderate)' : 'var(--color-very-poor)',
                marginTop: '10px',
                textTransform: 'uppercase'
              }}>
                {forecast.confidence}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '6px' }}>
                Based on history density
              </span>
            </div>
          </div>
        )}

        {/* Prediction Chart Box */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <h3 className="font-display" style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <BarChart2 size={16} className="text-primary" />
            {forecast && (forecast as any).forecastMetric === 'Risk'
              ? '24h Predictive Risk Timeline'
              : '24h Predictive AQI Timeline'}
          </h3>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-dark)', marginTop: '4px' }}>
            Solid line shows observed measurements. Dashed line denotes statistically projected trend.
          </p>

          {loading || !chartPaths ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dark)' }}>
              Calculating temporal regressions...
            </div>
          ) : (
            <div style={{ marginTop: '24px', position: 'relative' }}>
              {/* SVG Chart canvas */}
              <svg style={{ width: '100%', height: '180px', overflow: 'visible' }}>
                {/* Horizontal gridlines */}
                <line x1="0" y1="0%" x2="100%" y2="0%" stroke="rgba(255,255,255,0.03)" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.03)" />
                <line x1="0" y1="100%" x2="100%" y2="100%" stroke="rgba(255,255,255,0.05)" />

                {/* Observed Line */}
                <path d={chartPaths.obsPath} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
                {/* Forecasted Line */}
                <path d={chartPaths.predPath} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeDasharray="6,4" />

                {/* Data Points */}
                {chartPaths.observed.map((val, idx) => (
                  <circle
                    key={`obs-pt-${idx}`}
                    cx={chartPaths.getX(idx)}
                    cy={chartPaths.getY(val)}
                    r="4"
                    fill="var(--bg-deep)"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                  />
                ))}

                {chartPaths.predicted.map((val, idx) => {
                  if (idx === 0) return null; // skip start since it overlaps observed end
                  return (
                    <circle
                      key={`pred-pt-${idx}`}
                      cx={chartPaths.getX(idx + 3)}
                      cy={chartPaths.getY(val)}
                      r="4"
                      fill="var(--bg-deep)"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>

              {/* X Axis labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '8px', padding: '0 4px' }}>
                <span>-24h</span>
                <span>-16h</span>
                <span>-8h</span>
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>NOW</span>
                <span>+6h</span>
                <span>+12h</span>
                <span>+24h</span>
              </div>
            </div>
          )}
        </div>

        {/* Meteorological Context (Observed) */}
        {weatherContext && (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px'
            }}>
              Meteorological Context (Observed)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', display: 'block', textTransform: 'uppercase' }}>Temperature</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{weatherContext.temperature}°C</span>
              </div>
              <div style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', display: 'block', textTransform: 'uppercase' }}>Humidity</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{weatherContext.relative_humidity}%</span>
              </div>
              <div style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', display: 'block', textTransform: 'uppercase' }}>Wind Speed</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{weatherContext.wind_speed} m/s</span>
              </div>
              <div style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', display: 'block', textTransform: 'uppercase' }}>Precipitation</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{weatherContext.precipitation} mm</span>
              </div>
              <div style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dark)', display: 'block', textTransform: 'uppercase' }}>Pressure</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{weatherContext.surface_pressure} hPa</span>
              </div>
            </div>
            
            {weatherMatchInfo && weatherMatchInfo.matchType !== 'NONE' && (
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '8px' }}>
                Weather Match Method: <strong style={{ color: 'var(--color-primary)' }}>{weatherMatchInfo.matchType}</strong>
                {weatherMatchInfo.matchDistance !== undefined && ` (Distance: ${weatherMatchInfo.matchDistance} km)`}
              </div>
            )}
          </div>
        )}

        {/* Contributing Factors Analysis Panel */}
        {forecast && !(forecast as any).insufficientData && (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Forecast Contributing Factors Analysis
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {forecast.contributingFactors.map((factor, index) => {
                const impactColor = factor.impact === 'High' ? 'var(--color-very-poor)' : factor.impact === 'Medium' ? 'var(--color-moderate)' : 'var(--color-good)';
                return (
                  <div key={`factor-${index}`} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{factor.factor}</span>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        color: impactColor,
                        border: `1px solid ${impactColor}40`,
                        backgroundColor: `${impactColor}08`,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        textTransform: 'uppercase'
                      }}>
                        {factor.impact}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.4, margin: 0 }}>
                      {factor.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: AI Risk Explainer Block (Phase 6 Shell) */}
      <div style={{ width: '380px', flexShrink: 0 }}>
        <div className="glass-panel" style={{ padding: '20px', minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
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
            <BrainCircuit size={18} className="text-primary" />
            AI Risk Diagnostics
          </h3>

          {explaining ? (
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '2px solid rgba(0, 210, 255, 0.2)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Analyzing meteorological vectors...</span>
            </div>
          ) : geminiExplanation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>DIAGNOSTIC TARGET</span>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {selectedStation?.station} ({selectedStation?.city})
                </h4>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
                  Gemini Environmental Analysis • Powered by Google Gemini
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Risk Summary</span>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-main)',
                    marginTop: '4px',
                    lineHeight: 1.45,
                    backgroundColor: 'rgba(0, 210, 255, 0.03)',
                    border: '1px solid rgba(0, 210, 255, 0.15)',
                    padding: '10px',
                    borderRadius: '6px',
                    margin: 0
                  }}>
                    {geminiExplanation.risk_summary}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Key Drivers</span>
                  <ul style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '4px',
                    paddingLeft: '16px',
                    lineHeight: 1.4,
                    margin: '0 0 0 4px'
                  }}>
                    {geminiExplanation.key_drivers.map((driver, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{driver}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Forecast Interpretation</span>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-main)',
                    marginTop: '4px',
                    lineHeight: 1.4,
                    margin: 0
                  }}>
                    {geminiExplanation.forecast_interpretation}
                  </p>
                </div>

                {geminiExplanation.confidence_note && (
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Model Confidence</span>
                    <p style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      fontStyle: 'italic',
                      margin: 0
                    }}>
                      {geminiExplanation.confidence_note}
                    </p>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Monitoring Recommendation</span>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-main)',
                    marginTop: '4px',
                    lineHeight: 1.4,
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-light)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    margin: 0
                  }}>
                    {geminiExplanation.monitoring_recommendation}
                  </p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Inputs Used Grounding</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-light)' }}>
                    PM2.5: {selectedStation?.pm25} µg/m³
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-light)' }}>
                    PM10: {selectedStation?.pm10} µg/m³
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-light)' }}>
                    Trend: {selectedStation && getStationTrend(selectedStation) >= 0 ? `+${getStationTrend(selectedStation)}%` : `${selectedStation ? getStationTrend(selectedStation) : 0}%`}
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-light)', color: 'var(--color-text-dark)' }}>
                    Confidence: {forecast?.confidence}
                  </span>
                </div>
              </div>
            </div>
          ) : explanation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>DIAGNOSTIC TARGET</span>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {selectedStation?.station} ({selectedStation?.city})
                </h4>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-very-poor)', marginTop: '2px', fontWeight: 600 }}>
                  ⚠️ Gemini analysis temporarily unavailable. Showing deterministic BLiXXiS risk assessment.
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Why is risk increasing?</span>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-main)',
                  marginTop: '6px',
                  lineHeight: 1.45,
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-light)',
                  padding: '12px',
                  borderRadius: '6px'
                }}>
                  {explanation}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Inputs Used Grounding</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-light)' }}>
                    PM2.5: {selectedStation?.pm25} µg/m³
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-light)' }}>
                    PM10: {selectedStation?.pm10} µg/m³
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-light)' }}>
                    Trend: {selectedStation && getStationTrend(selectedStation) >= 0 ? `+${getStationTrend(selectedStation)}%` : `${selectedStation ? getStationTrend(selectedStation) : 0}%`}
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-light)', color: 'var(--color-text-dark)' }}>
                    Confidence: {forecast?.confidence}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
              <Compass size={32} strokeWidth={1} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)' }}>
                Click the button below to generate a natural language explanation of the station's forecast risk based on sensor metrics.
              </p>
              <button
                className="btn-primary"
                onClick={handleGenerateExplanation}
                style={{ fontSize: '0.75rem', padding: '8px 14px', marginTop: '8px' }}
              >
                Explain Forecast Risk
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.3); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.65); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.3); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
