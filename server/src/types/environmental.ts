export interface EnvironmentalValue<T = number> {
  value: T | null;
  status: 'OBSERVED' | 'DERIVED' | 'PREDICTED' | 'MISSING';
}

export type AQISeverity = 'Good' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe' | 'Unknown';

export interface EnvironmentalStation {
  id: string;
  country: string;
  state: string;
  city: string;
  station: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  aqi: number | null; // Can be null if missing
  pollutantRiskScore?: number | null;
  calculatedAqi?: number | null;
  sourceAqi?: number | null;
  aqiCategory?: string | null;
  dominantPollutant?: string | null;
  aqiMethod?: string | null;
  aqiSource?: 'source' | 'calculated' | null;
  aqiUnavailableReason?: string | null;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  riskScore?: number | null;
  riskScoreType?: string | null;

  // Traceability metadata
  data_granularity?: string;
  source_dataset?: string;
  source_row_id?: string;
  source_unit_notes?: string;
  weather_match_type?: 'STATION_ID' | 'STATION_NAME' | 'GEOGRAPHIC_PROXIMITY' | 'NONE';
  weather_match_distance_km?: number;
  coordinateSource?: string;
}

export interface Hotspot {
  id: string;
  stationId: string;
  stationName: string;
  city: string;
  state: string;
  country: string;
  aqi?: number; // NaN or undefined for real data (not computed)
  pm25: number;
  score: number; // calculated hotspot score (0-100)
  status: 'Normal' | 'Watch' | 'Emerging' | 'Critical';
  trend: number; // percentage change
  scoreType: 'AQI-based' | 'Pollutant-based';
  pollutantRiskScore?: number;
  riskScore?: number | null;
  riskScoreType?: string | null;
}

export interface AQIForecast {
  stationId: string;
  currentAqi: number | null;
  currentRiskScore: number | null;
  forecastMetric: 'AQI' | 'Risk';
  forecast6h: number;
  forecast12h: number;
  forecast24h: number;
  forecastTimeline: {
    time: string; // "Current", "+6h", "+12h", "+24h"
    aqi: number;
    predicted: boolean;
  }[];
  insufficientData?: boolean;
  message?: string;
  observedHistory?: number[];
  riskScore?: number | null;
  riskScoreType?: string | null;
}

export interface EnvironmentalContext {
  country: string;
  state_or_region?: string;
  city?: string;
  station_name: string;

  latitude?: number;
  longitude?: number;

  current_aqi?: EnvironmentalValue;
  pm2_5?: EnvironmentalValue;
  pm10?: EnvironmentalValue;
  no2?: EnvironmentalValue;
  so2?: EnvironmentalValue;
  co?: EnvironmentalValue;
  o3?: EnvironmentalValue;

  trend24h?: EnvironmentalValue;

  hotspot_score?: EnvironmentalValue;
  hotspot_classification?: EnvironmentalValue<string>;
  risk_score?: EnvironmentalValue;
  score_type?: EnvironmentalValue<string>;

  // Weather variables
  temperature?: EnvironmentalValue;
  relative_humidity?: EnvironmentalValue;
  wind_speed?: EnvironmentalValue;
  wind_direction?: EnvironmentalValue;
  precipitation?: EnvironmentalValue;
  rainfall?: EnvironmentalValue;
  surface_pressure?: EnvironmentalValue;
  cloud_cover?: EnvironmentalValue;
  solar_radiation?: EnvironmentalValue;

  // Forecast Engine Outputs
  forecast_aqi?: EnvironmentalValue;
  forecast6h?: EnvironmentalValue;
  forecast12h?: EnvironmentalValue;
  forecast24h?: EnvironmentalValue;
  spike_expected?: EnvironmentalValue<boolean>;

  // Metadata
  data_source?: string;
  data_granularity?: string;
  source_dataset?: string;
  source_row_id?: string;
  source_unit_notes?: string;
  source_timestamp?: string;
  weather_match_type?: string;
  weather_match_distance_km?: number;
}
