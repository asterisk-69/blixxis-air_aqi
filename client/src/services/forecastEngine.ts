import type { EnvironmentalStation, AQISeverity } from '../types/environmental';
import { getAQISeverity } from './environmentalData';

export interface ForecastInput {
  currentAqi: number;
  recentHistory: number[]; // e.g. [aqi-24h, aqi-16h, aqi-8h]
  pm25: number;
  recentTrend: number; // percentage change
  pm10?: number;
}

export interface ForecastResult {
  predicted6h: number;
  predicted12h: number;
  predicted24h: number;
  risk6h: AQISeverity;
  risk12h: AQISeverity;
  risk24h: AQISeverity;
  pctChange6h: number;
  pctChange12h: number;
  pctChange24h: number;
  confidence: 'High' | 'Medium' | 'Low';
  contributingFactors: {
    factor: string;
    impact: 'High' | 'Medium' | 'Low';
    description: string;
  }[];
  spikeExpected: boolean;
}

// Generate deterministic trend based on station AQI (matches calculateHotspotScore pattern)
export const getStationTrend = (station: EnvironmentalStation): number => {
  let trend = 5; // default +5%
  const aqi = station.aqi;
  if (aqi === null || aqi === undefined || isNaN(aqi)) return trend;
  if (aqi > 200) trend = 25;
  else if (aqi > 150) trend = 18;
  else if (aqi > 100) trend = 12;
  else if (aqi < 70) trend = -4; // improving
  return trend;
};

// Generate deterministic historical time-series [aqi-24h, aqi-16h, aqi-8h]
export const getStationHistory = (station: EnvironmentalStation): number[] => {
  const trend = getStationTrend(station);
  const aqi = station.aqi ?? 0;
  // Reconstruct history working backward from current AQI
  const a8 = Math.round(aqi / (1 + trend / 200));
  const a16 = Math.round(a8 / (1 + trend / 200));
  const a24 = Math.round(a16 / (1 + trend / 200));
  return [a24, a16, a8];
};

export class ForecastEngine {
  /**
   * Deterministic, stable, and capped baseline forecasting model.
   * Prevents negative values, limits hourly change to avoid exponential runaway,
   * and ensures mathematical consistency over the 24h timeline.
   */
  static predict(input: ForecastInput): ForecastResult {
    const { currentAqi, recentHistory, pm25, recentTrend } = input;

    // 1. Calculate rate of change momentum from history
    let historyDeltaRate = 0;
    if (recentHistory.length > 0) {
      const oldest = recentHistory[0];
      historyDeltaRate = oldest > 0 ? (currentAqi - oldest) / oldest : 0;
    }

    // 2. Combine history rate and short-term trend (decimal)
    const combinedTrend = 0.5 * (recentTrend / 100) + 0.5 * historyDeltaRate;

    // 3. PM2.5 particle loading impact
    // Higher PM2.5 acts as stagnation resistance, raising the probability of a spike
    const particulateImpact = pm25 > 120 ? 0.25 : pm25 > 75 ? 0.12 : 0;

    // 4. Calculate raw hourly change rate (as a fraction of current AQI)
    // We assume the change rate is distributed over a 24-hour cycle
    const rawChangeFractionPerHour = (combinedTrend + particulateImpact) / 24;
    const rawHourlyChange = currentAqi * rawChangeFractionPerHour;

    // 5. Cap maximum hourly change to keep predictions stable and realistic
    // The cap scales with AQI (max 1.2% of current AQI or 3.5 AQI points per hour, whichever is greater)
    const maxHourlyChange = Math.max(3.5, currentAqi * 0.012);
    const cappedHourlyChange = Math.max(-maxHourlyChange * 0.8, Math.min(maxHourlyChange, rawHourlyChange));

    // 6. Project linear/sub-linear values (strictly >= 0)
    // Using linear projection ensures +24h is consistent and not disconnected from +6h and +12h
    const predicted6h = Math.round(Math.max(0, currentAqi + cappedHourlyChange * 6));
    const predicted12h = Math.round(Math.max(0, currentAqi + cappedHourlyChange * 12));
    const predicted24h = Math.round(Math.max(0, currentAqi + cappedHourlyChange * 24));

    // 7. Percentage changes
    const pctChange6h = Math.round(((predicted6h - currentAqi) / currentAqi) * 100);
    const pctChange12h = Math.round(((predicted12h - currentAqi) / currentAqi) * 100);
    const pctChange24h = Math.round(((predicted24h - currentAqi) / currentAqi) * 100);

    // 8. Severity/Risk classifications
    const risk6h = getAQISeverity(predicted6h);
    const risk12h = getAQISeverity(predicted12h);
    const risk24h = getAQISeverity(predicted24h);

    // 9. Spike warning trigger:
    // Expected spike if forecasted AQI crosses 150 AND increase is at least +12%, or if it crosses 200
    const spikeExpected = (predicted24h >= 150 && pctChange24h >= 12) || predicted24h >= 200;

    // 10. Confidence indicators
    let confidence: ForecastResult['confidence'] = 'High';
    if (Math.abs(recentTrend) > 15 || pm25 > 110) {
      confidence = 'Medium';
    }
    if (Math.abs(recentTrend) > 25 || recentHistory.length < 2) {
      confidence = 'Low';
    }

    // 11. Contributing factors breakdown
    const contributingFactors: ForecastResult['contributingFactors'] = [
      {
        factor: 'Short-term Momentum',
        impact: Math.abs(recentTrend) > 18 ? 'High' : Math.abs(recentTrend) > 8 ? 'Medium' : 'Low',
        description: recentTrend > 0
          ? `Short-term station trend is rising at +${recentTrend}% per reporting interval.`
          : recentTrend < 0
          ? `Negative trend of ${recentTrend}% indicates active dispersion.`
          : 'Ambient concentrations are currently flat/stable.'
      },
      {
        factor: 'Particulate Loading (PM2.5)',
        impact: pm25 > 100 ? 'High' : pm25 > 50 ? 'Medium' : 'Low',
        description: pm25 > 100
          ? `Heavy particulate loading (${pm25} µg/m³) creates high density resistance.`
          : pm25 > 35
          ? `Moderate PM2.5 levels (${pm25} µg/m³) are present but within baseline bounds.`
          : `Excellent PM2.5 levels (${pm25} µg/m³) support rapid air dispersion.`
      },
      {
        factor: 'Historical Rate of Change',
        impact: Math.abs(historyDeltaRate) > 0.15 ? 'High' : Math.abs(historyDeltaRate) > 0.05 ? 'Medium' : 'Low',
        description: historyDeltaRate > 0.1
          ? `Longer-term 24h baseline is climbing (+${Math.round(historyDeltaRate * 100)}%), sustaining accumulation.`
          : historyDeltaRate < -0.05
          ? `24h rate of change indicates standard air scrubbing and clearance.`
          : 'Historical 24h average shows static environmental equilibrium.'
      }
    ];

    return {
      predicted6h,
      predicted12h,
      predicted24h,
      risk6h,
      risk12h,
      risk24h,
      pctChange6h,
      pctChange12h,
      pctChange24h,
      confidence,
      contributingFactors,
      spikeExpected
    };
  }
}
