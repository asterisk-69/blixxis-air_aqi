import type { EnvironmentalStation, Hotspot, AQIForecast, CitizenReport, OperationalAlert, AQISeverity, EnvironmentalContext, EnvironmentalValue } from '../types/environmental';
import { MOCK_STATIONS, MOCK_FORECASTS, MOCK_CITIZEN_REPORTS, MOCK_ALERTS } from '../data/mockData';

const API_BASE_URL = 'http://localhost:5000';

// Helper to determine AQI severity text and color
export const getAQISeverity = (aqi: number | null | undefined): AQISeverity => {
  if (aqi === undefined || aqi === null || isNaN(aqi)) return 'Unknown';
  if (aqi <= 0) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Poor';
  if (aqi <= 200) return 'Very Poor';
  return 'Severe';
};

// Helper for UI styling of severity
export const getSeverityColor = (severity: AQISeverity): string => {
  switch (severity) {
    case 'Good': return '#10b981'; // Green
    case 'Moderate': return '#f59e0b'; // Yellow/Amber
    case 'Poor': return '#f97316'; // Orange
    case 'Very Poor': return '#ef4444'; // Red
    case 'Severe': return '#a855f7'; // Purple
    case 'Unknown': return '#9ca3af'; // Grey / Neutral
    default: return '#9ca3af';
  }
};

export type RiskSeverity = 'Low' | 'Moderate' | 'High' | 'Critical' | 'Unknown';

export const getRiskSeverity = (risk: number | null | undefined): RiskSeverity => {
  if (risk === undefined || risk === null || isNaN(risk)) return 'Unknown';
  if (risk <= 0) return 'Unknown';
  if (risk <= 50) return 'Low';       // <= 50% of standard limit
  if (risk <= 100) return 'Moderate'; // <= 100% of standard limit
  if (risk <= 250) return 'High';     // <= 250% of standard limit
  return 'Critical';                  // > 250% of standard limit
};

export const getRiskSeverityColor = (severity: RiskSeverity): string => {
  switch (severity) {
    case 'Low': return '#06b6d4';      // Cyan / Cool Blue
    case 'Moderate': return '#eab308'; // Amber / Yellow
    case 'High': return '#f97316';     // Orange
    case 'Critical': return '#ef4444'; // Red / Crimson
    case 'Unknown': return '#9ca3af';  // Grey
    default: return '#9ca3af';
  }
};

export const getStationSeverity = (station: EnvironmentalStation): string => {
  const prefMetric = localStorage.getItem('blixxis_pref_metric') || 'AQI';
  const hasAqi = station.aqi !== null && station.aqi !== undefined && !isNaN(station.aqi);
  const hasRisk = station.riskScore !== null && station.riskScore !== undefined && !isNaN(station.riskScore);
  
  if (prefMetric === 'Risk' && hasRisk) {
    return `${getRiskSeverity(station.riskScore)} Risk`;
  }
  
  if (hasAqi && station.aqiCategory && station.aqiCategory !== 'Unavailable') {
    return station.aqiCategory;
  }
  
  if (hasRisk) {
    return `${getRiskSeverity(station.riskScore)} Risk`;
  }
  
  return 'Unknown';
};

export const getStationSeverityColor = (station: EnvironmentalStation): string => {
  const prefMetric = localStorage.getItem('blixxis_pref_metric') || 'AQI';
  const hasAqi = station.aqi !== null && station.aqi !== undefined && !isNaN(station.aqi);
  const hasRisk = station.riskScore !== null && station.riskScore !== undefined && !isNaN(station.riskScore);

  if (prefMetric === 'Risk' && hasRisk) {
    return getRiskSeverityColor(getRiskSeverity(station.riskScore));
  }

  if (hasAqi) {
    if (station.aqiCategory && station.aqiCategory !== 'Unavailable') {
      const cat = station.aqiCategory.toLowerCase();
      if (cat === 'good') return '#10b981'; // Green
      if (cat === 'satisfactory') return '#84cc16'; // Light Green
      if (cat === 'moderate') return '#f59e0b'; // Yellow/Amber
      if (cat === 'poor') return '#f97316'; // Orange
      if (cat === 'very poor') return '#ef4444'; // Red
      if (cat === 'severe') return '#7f1d1d'; // Dark Red / Maroon (CPCB severe)
      return '#9ca3af';
    }
    return getSeverityColor(getAQISeverity(station.aqi));
  }

  if (hasRisk) {
    return getRiskSeverityColor(getRiskSeverity(station.riskScore));
  }

  return '#9ca3af';
};

// Helper to calculate hotspot scores dynamically (used for mock data fallback)
export const calculateHotspotScore = (station: EnvironmentalStation): Hotspot => {
  const hasAqi = station.aqi !== null && station.aqi !== undefined && !isNaN(station.aqi);
  const riskScore = station.riskScore !== undefined && station.riskScore !== null ? station.riskScore : null;

  const aqiRisk = hasAqi ? Math.min(station.aqi! / 300, 1.0) : (riskScore !== null ? Math.min(riskScore / 300, 1.0) : 0.3);
  const pm25Risk = isNaN(station.pm25) ? 0.2 : Math.min(station.pm25 / 150, 1.0);
  
  let trend = 5;
  const targetVal = hasAqi ? station.aqi! : (riskScore !== null ? riskScore : 50);
  if (targetVal > 200) trend = 25;
  else if (targetVal > 150) trend = 18;
  else if (targetVal > 100) trend = 12;
  else if (targetVal < 70) trend = -4;
  
  const trendRisk = Math.max(0, trend / 30);
  
  let densityRisk = 0.3;
  if (station.city === "New Delhi" || station.city === "Lucknow") densityRisk = 0.8;
  else if (station.city === "Mumbai" || station.city === "Dubai") densityRisk = 0.5;

  const score = (0.50 * aqiRisk + 0.25 * pm25Risk + 0.15 * trendRisk + 0.10 * densityRisk) * 100;
  
  let status: Hotspot['status'] = 'Normal';
  if (score >= 70) status = 'Critical';
  else if (score >= 50) status = 'Emerging';
  else if (score >= 30) status = 'Watch';

  return {
    id: `hotspot-${station.id}`,
    stationId: station.id,
    stationName: station.station,
    city: station.city,
    state: station.state,
    country: station.country,
    aqi: hasAqi ? station.aqi! : undefined,
    pm25: station.pm25,
    score: Math.round(score),
    status,
    trend,
    scoreType: hasAqi ? 'AQI-based' : 'Pollutant-based',
    pollutantRiskScore: riskScore !== null ? riskScore : undefined,
    riskScore: riskScore !== null ? riskScore : undefined,
    riskScoreType: riskScore !== null ? 'BLiXXiS Pollutant Risk' : undefined
  };
};

export class EnvironmentalDataService {
  private static initPromise: Promise<void> | null = null;
  private static isFallback = false;

  static async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private static async _initialize(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/status`);
      if (res.ok) {
        this.isFallback = false;
        console.log('[EnvironmentalDataService] Connected to backend environmental service.');
      } else {
        throw new Error('Server not OK');
      }
    } catch (e) {
      console.warn('[EnvironmentalDataService] Backend API offline. Activating mock fallback.', e);
      this.isFallback = true;
      for (const s of MOCK_STATIONS) {
        const hasA = s.aqi !== null && s.aqi !== undefined && !isNaN(s.aqi);
        if (hasA) {
          s.aqiSource = 'source';
          s.aqiMethod = 'Dataset Source';
          s.aqiCategory = getAQISeverity(s.aqi);
        } else {
          s.aqiSource = null;
          s.aqiMethod = null;
          s.aqiCategory = 'Unavailable';
          s.aqiUnavailableReason = 'Insufficient data';
        }
      }
    }
  }

  static isFallbackMode(): boolean {
    return this.isFallback;
  }

  static getDataSourceName(): string {
    return this.isFallback ? 'DEMO MODE (Mock Data)' : 'Normalized Environmental Dataset';
  }

  // Get list of supported countries
  static async getCountries(): Promise<string[]> {
    await this.initialize();
    if (!this.isFallback) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stations`);
        if (response.ok) {
          const stations: EnvironmentalStation[] = await response.json();
          const countries = Array.from(new Set(stations.map(s => s.country)));
          // Map backend countries back to UI country labels
          return countries.map(c => c.toLowerCase() === 'united arab emirates' ? 'UAE' : c);
        }
      } catch (e) {
        this.isFallback = true;
      }
    }
    const countries = Array.from(new Set(MOCK_STATIONS.map(s => s.country)));
    return countries;
  }

  // Get all environmental monitoring stations
  static async getStations(filters?: { country?: string; state?: string }): Promise<EnvironmentalStation[]> {
    await this.initialize();
    if (!this.isFallback) {
      try {
        const url = new URL(`${API_BASE_URL}/api/stations`);
        if (filters?.country) {
          url.searchParams.append('country', filters.country);
        }
        if (filters?.state) {
          url.searchParams.append('state', filters.state);
        }
        
        const response = await fetch(url.toString());
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        this.isFallback = true;
      }
    }
    
    // Local Fallback
    let stations = [...MOCK_STATIONS];
    if (filters?.country && filters.country !== 'All Countries' && filters.country !== 'All') {
      const target = filters.country.toLowerCase().trim();
      stations = stations.filter(s => {
        const c = s.country.toLowerCase().trim();
        if (target === 'uae' || target === 'united arab emirates') {
          return c === 'uae' || c === 'united arab emirates';
        }
        return c === target;
      });
    }
    if (filters?.state) {
      stations = stations.filter(s => s.state.toLowerCase() === filters.state!.toLowerCase());
    }
    return stations;
  }

  // Get detailed info for a single station
  static async getStationById(id: string): Promise<EnvironmentalStation | null> {
    await this.initialize();
    if (!this.isFallback) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stations/${id}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        this.isFallback = true;
      }
    }
    
    // Local Fallback
    return MOCK_STATIONS.find(s => s.id === id) || null;
  }

  // Get active hotspots
  static async getHotspots(country?: string): Promise<Hotspot[]> {
    await this.initialize();
    if (!this.isFallback) {
      try {
        const url = new URL(`${API_BASE_URL}/api/hotspots`);
        if (country) {
          url.searchParams.append('country', country);
        }
        const response = await fetch(url.toString());
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        this.isFallback = true;
      }
    }

    // Local Fallback
    let stations = [...MOCK_STATIONS];
    if (country && country !== 'All Countries' && country !== 'All') {
      stations = stations.filter(s => s.country.toLowerCase() === country.toLowerCase());
    }
    return stations
      .map(calculateHotspotScore)
      .filter(h => h.status !== 'Normal')
      .sort((a, b) => b.score - a.score);
  }

  // Get AQI forecast for a specific station
  static async getForecast(stationId: string): Promise<AQIForecast> {
    await this.initialize();
    if (!this.isFallback) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stations/${stationId}/forecast`);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        this.isFallback = true;
      }
    }

    // Local Fallback
    const existing = MOCK_FORECASTS[stationId];
    if (existing) {
      return existing;
    }

    const station = MOCK_STATIONS.find(s => s.id === stationId);
    const isUae = station && (station.country.toLowerCase() === 'united arab emirates' || station.country.toLowerCase() === 'uae');
    const isAnnual = station && (station.data_granularity?.toLowerCase() === 'annual' || station.data_granularity?.toLowerCase() === 'annual average');

    if (isAnnual) {
      return {
        stationId,
        currentAqi: null,
        currentRiskScore: (station && station.riskScore !== undefined) ? station.riskScore : null,
        forecastMetric: 'Risk',
        forecast6h: 0,
        forecast12h: 0,
        forecast24h: 0,
        forecastTimeline: [],
        insufficientData: true,
        message: isUae 
          ? 'Short-term forecasting unavailable for annual UAE observations.'
          : 'Short-term forecasting unavailable for annual observations.'
      };
    }

    const currentAqi = station ? station.aqi : 100;
    
    const trendMultiplier = (currentAqi && currentAqi > 120) ? 1.12 : 0.98;
    const f6h = Math.round((currentAqi || 100) * (1 + (trendMultiplier - 1) * 0.4));
    const f12h = Math.round((currentAqi || 100) * (1 + (trendMultiplier - 1) * 0.8));
    const f24h = Math.round((currentAqi || 100) * trendMultiplier);

    return {
      stationId,
      currentAqi,
      currentRiskScore: (station && station.riskScore !== undefined) ? station.riskScore : null,
      forecastMetric: 'AQI',
      forecast6h: f6h,
      forecast12h: f12h,
      forecast24h: f24h,
      forecastTimeline: [
        { time: "Current", aqi: currentAqi ?? 0, predicted: false },
        { time: "+6h", aqi: f6h, predicted: true },
        { time: "+12h", aqi: f12h, predicted: true },
        { time: "+24h", aqi: f24h, predicted: true }
      ]
    };
  }

  // Get latest weather context for a station
  static async getLatestWeather(station: EnvironmentalStation): Promise<{ weather: any | null; matchType: 'STATION_ID' | 'STATION_NAME' | 'GEOGRAPHIC_PROXIMITY' | 'NONE'; matchDistance?: number }> {
    await this.initialize();
    if (!this.isFallback) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stations/${station.id}/weather`);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        this.isFallback = true;
      }
    }

    return {
      weather: null,
      matchType: 'NONE'
    };
  }

  // Get all citizen reports
  static async getCitizenReports(): Promise<CitizenReport[]> {
    return MOCK_CITIZEN_REPORTS;
  }

  // Submit a new citizen report
  static async submitCitizenReport(report: Omit<CitizenReport, 'id' | 'timestamp'>): Promise<CitizenReport> {
    const newReport: CitizenReport = {
      ...report,
      id: `rep-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    MOCK_CITIZEN_REPORTS.unshift(newReport);
    return newReport;
  }

  // Get active operational alerts
  static async getAlerts(): Promise<OperationalAlert[]> {
    return MOCK_ALERTS;
  }

  // Construct status-based EnvironmentalContext for Gemini Reasoning
  static getEnvironmentalContext(
    station: EnvironmentalStation,
    forecast: AQIForecast | null,
    weatherResult: { weather: any | null; matchType: string; matchDistance?: number } | null,
    trend: number | null
  ): EnvironmentalContext {
    const isAqiMissing = station.aqi === undefined || station.aqi === null || isNaN(station.aqi);
    
    // (Unused standard limits commented out to resolve TS errors)
    // const pm25Std = 60;
    // const pm10Std = 100;
    // const no2Std = 80;
    // const so2Std = 80;
    // const coStd = 2.0;
    // const o3Std = 100;
    // const isUnitVerified = station.source_unit_notes ? !station.source_unit_notes.toLowerCase().includes('unverified') : true;

    // Use the authoritative risk score from the backend
    const pollutantRiskScore = station.riskScore !== undefined && station.riskScore !== null ? station.riskScore : null;

    const toVal = <T>(val: T | undefined | null, statusOverride?: 'OBSERVED' | 'DERIVED' | 'PREDICTED' | 'MISSING'): EnvironmentalValue<T> => {
      const isMissing = val === undefined || val === null || (typeof val === 'number' && isNaN(val));
      if (isMissing) {
        return { value: null, status: 'MISSING' };
      }
      return {
        value: val,
        status: statusOverride || 'OBSERVED'
      };
    };

    const weather = weatherResult?.weather;

    return {
      country: station.country,
      state_or_region: station.state,
      city: station.city,
      station_name: station.station,
      latitude: station.latitude,
      longitude: station.longitude,

      current_aqi: toVal(station.aqi, 'OBSERVED'),
      pm2_5: toVal(station.pm25, 'OBSERVED'),
      pm10: toVal(station.pm10, 'OBSERVED'),
      no2: toVal(station.no2, 'OBSERVED'),
      so2: toVal(station.so2, 'OBSERVED'),
      co: toVal(station.co, 'OBSERVED'),
      o3: toVal(station.o3, 'OBSERVED'),

      trend24h: toVal(trend, 'DERIVED'),
      hotspot_score: toVal(forecast?.insufficientData ? null : (forecast && forecast.currentAqi !== null ? Math.min(100, Math.round(forecast.currentAqi * 0.5)) : null), 'DERIVED'),
      risk_score: toVal(pollutantRiskScore, 'DERIVED'),
      score_type: toVal(isAqiMissing ? 'Pollutant-based' : 'AQI-based', 'DERIVED'),

      temperature: toVal(weather?.temperature, 'OBSERVED'),
      relative_humidity: toVal(weather?.relative_humidity, 'OBSERVED'),
      wind_speed: toVal(weather?.wind_speed, 'OBSERVED'),
      wind_direction: toVal(weather?.wind_direction, 'OBSERVED'),
      precipitation: toVal(weather?.precipitation, 'OBSERVED'),
      rainfall: toVal(weather?.rainfall, 'OBSERVED'),
      surface_pressure: toVal(weather?.surface_pressure, 'OBSERVED'),
      cloud_cover: toVal(weather?.cloud_cover, 'OBSERVED'),
      solar_radiation: toVal(weather?.solar_radiation, 'OBSERVED'),

      forecast_aqi: toVal(forecast?.insufficientData ? null : forecast?.forecast24h, 'PREDICTED'),
      forecast6h: toVal(forecast?.insufficientData ? null : forecast?.forecast6h, 'PREDICTED'),
      forecast12h: toVal(forecast?.insufficientData ? null : forecast?.forecast12h, 'PREDICTED'),
      forecast24h: toVal(forecast?.insufficientData ? null : forecast?.forecast24h, 'PREDICTED'),
      spike_expected: toVal(forecast?.insufficientData ? null : (forecast ? (forecast.forecast24h >= 150) : null), 'PREDICTED'),

      data_source: this.getDataSourceName(),
      data_granularity: station.data_granularity,
      source_dataset: station.source_dataset,
      source_row_id: station.source_row_id,
      source_unit_notes: station.source_unit_notes,
      source_timestamp: station.timestamp,
      weather_match_type: weatherResult?.matchType || 'NONE',
      weather_match_distance_km: weatherResult?.matchDistance
    };
  }

  // Get developer-safe diagnostics stats
  static async getDiagnostics(): Promise<any> {
    await this.initialize();
    if (!this.isFallback) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/diagnostics`);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        console.warn("Diagnostics API offline, using fallback", e);
      }
    }
    // Fallback counts for demo
    return {
      indiaCount: 113,
      uaeCount: 57,
      saudiCount: 7,
      aqiCalculable: 113,
      aqiUnavailable: 64,
      riskCalculable: 177,
      riskUnavailable: 0,
      mapped: 120,
      unmapped: 57
    };
  }
}
