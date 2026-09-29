import fs from 'fs';
import path from 'path';
import { EnvironmentalStation, Hotspot, AQIForecast, EnvironmentalValue } from '../types/environmental';
import { ForecastEngine } from './forecastEngine';

// Helpers for string normalization
export const normalizeName = (name: string): string => {
  if (!name) return '';
  return name.toLowerCase().replace(/new\s+delhi/g, 'delhi').replace(/[^a-z0-9]/g, '');
};

// Suffix-stripped name normalizer for robust matching
export const cleanNameForMatching = (name: string): string => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/new\s+delhi/g, 'delhi')
    .replace(/-\s*(dpcc|iitm|imd|cpcb|mpcb|rspcb|appcb|cecb|hspcb|jmc|bspcb|ntpc|pcb|mc|imc|uppcb|ospcb|cecb).*$/g, '')
    .replace(/\b(dpcc|iitm|imd|cpcb|mpcb|rspcb|appcb|cecb|hspcb|jmc|bspcb|ntpc|pcb|mc|imc|uppcb|ospcb)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
};

// Check if two country names match, normalizing UAE / United Arab Emirates
export const isSameCountry = (c1: string, c2: string): boolean => {
  const norm = (c: string) => {
    if (!c) return '';
    const l = c.toLowerCase().trim();
    if (l === 'uae' || l === 'united arab emirates') return 'uae';
    return l;
  };
  return norm(c1) === norm(c2);
};

// The source UAE annual dataset does not provide coordinates.
// BLiXXiS enriches a maximum of five representative UAE monitoring stations with curated station-location metadata solely for map visualization.
export const normalizeStationName = (name: string): string => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const UAE_STATION_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  [normalizeStationName("Ajman X")]: { latitude: 25.4052, longitude: 55.5136 },
  [normalizeStationName("Al Ain Islamic Institute")]: { latitude: 24.2075, longitude: 55.7447 },
  [normalizeStationName("Al Hamra")]: { latitude: 25.6961, longitude: 55.7906 },
  [normalizeStationName("Al Mafraq")]: { latitude: 24.2694, longitude: 54.6186 },
  [normalizeStationName("Al Maqta")]: { latitude: 24.4172, longitude: 54.5028 }
};

// Multi-tiered registry match lookup (Exact, Suffix-stripped, Proximity)
export function findRegistryMatch(
  histName: string,
  histCountry: string,
  histLat: number,
  histLng: number,
  registry: EnvironmentalStation[]
): string | null {
  const normHist = normalizeName(histName);
  if (!normHist) return null;

  // Tier 1: Exact normalized name match within same country
  for (const reg of registry) {
    if (isSameCountry(reg.country, histCountry)) {
      if (normalizeName(reg.station) === normHist) {
        return reg.id;
      }
    }
  }

  // Tier 2: Suffix-stripped name match within same country
  const cleanHist = cleanNameForMatching(histName);
  if (cleanHist) {
    for (const reg of registry) {
      if (isSameCountry(reg.country, histCountry)) {
        if (cleanNameForMatching(reg.station) === cleanHist) {
          return reg.id;
        }
      }
    }
  }

  // Tier 3: Geographic proximity match (<= 5km) within same country
  if (!isNaN(histLat) && !isNaN(histLng)) {
    let closestId: string | null = null;
    let minDistance = Infinity;

    for (const reg of registry) {
      if (isSameCountry(reg.country, histCountry)) {
        if (!isNaN(reg.latitude) && !isNaN(reg.longitude)) {
          const dLat = reg.latitude - histLat;
          const dLon = reg.longitude - histLng;
          const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111; // approx km
          if (dist < minDistance && dist <= 5) {
            minDistance = dist;
            closestId = reg.id;
          }
        }
      }
    }
    if (closestId) {
      return closestId;
    }
  }

  return null;
}

// Custom, robust quoted CSV parser
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n' || char === '\r') {
        row.push(cell);
        if (row.length > 1 || row[0] !== '') {
          result.push(row);
        }
        row = [];
        cell = '';
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    result.push(row);
  }
  return result;
}

export function csvToObjects(text: string): any[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.trim());
  const data: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: any = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = row[j] !== undefined ? row[j].trim() : '';
    }
    data.push(obj);
  }
  return data;
}

// Single line parser for splitting memory-friendly rows
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(cell);
        cell = '';
      } else {
        cell += char;
      }
    }
  }
  result.push(cell);
  return result;
}

// Target directory for dataset files
const DATA_DIR = path.resolve(__dirname, '../../data');
const NORMALIZED_CSV = path.join(DATA_DIR, 'normalized_air_quality_india_uae_saudi.csv');
const COMBINED_AQ_CSV = path.join(DATA_DIR, 'combined_3country_air_quality.csv');
const COMBINED_WEATHER_CSV = path.join(DATA_DIR, 'combined_3country_hourly_weather.csv');

interface WeatherMatch {
  weatherStationKey: string;
  matchType: 'STATION_NAME' | 'GEOGRAPHIC_PROXIMITY' | 'NONE';
  matchDistance?: number;
}

const pm25Ranges = [
  { bpLo: 0, bpHi: 30, iLo: 0, iHi: 50 },
  { bpLo: 31, bpHi: 60, iLo: 51, iHi: 100 },
  { bpLo: 61, bpHi: 90, iLo: 101, iHi: 200 },
  { bpLo: 91, bpHi: 120, iLo: 201, iHi: 300 },
  { bpLo: 121, bpHi: 250, iLo: 301, iHi: 400 },
  { bpLo: 251, bpHi: 500, iLo: 401, iHi: 500 }
];

const pm10Ranges = [
  { bpLo: 0, bpHi: 50, iLo: 0, iHi: 50 },
  { bpLo: 51, bpHi: 100, iLo: 51, iHi: 100 },
  { bpLo: 101, bpHi: 250, iLo: 101, iHi: 200 },
  { bpLo: 251, bpHi: 350, iLo: 201, iHi: 300 },
  { bpLo: 351, bpHi: 430, iLo: 301, iHi: 400 },
  { bpLo: 431, bpHi: 1000, iLo: 401, iHi: 500 }
];

const no2Ranges = [
  { bpLo: 0, bpHi: 40, iLo: 0, iHi: 50 },
  { bpLo: 41, bpHi: 80, iLo: 51, iHi: 100 },
  { bpLo: 81, bpHi: 180, iLo: 101, iHi: 200 },
  { bpLo: 181, bpHi: 280, iLo: 201, iHi: 300 },
  { bpLo: 281, bpHi: 400, iLo: 301, iHi: 400 },
  { bpLo: 401, bpHi: 1000, iLo: 401, iHi: 500 }
];

const so2Ranges = [
  { bpLo: 0, bpHi: 40, iLo: 0, iHi: 50 },
  { bpLo: 41, bpHi: 80, iLo: 51, iHi: 100 },
  { bpLo: 81, bpHi: 380, iLo: 101, iHi: 200 },
  { bpLo: 381, bpHi: 800, iLo: 201, iHi: 300 },
  { bpLo: 801, bpHi: 1600, iLo: 301, iHi: 400 },
  { bpLo: 1601, bpHi: 5000, iLo: 401, iHi: 500 }
];

const o3Ranges = [
  { bpLo: 0, bpHi: 50, iLo: 0, iHi: 50 },
  { bpLo: 51, bpHi: 100, iLo: 51, iHi: 100 },
  { bpLo: 101, bpHi: 168, iLo: 101, iHi: 200 },
  { bpLo: 169, bpHi: 208, iLo: 201, iHi: 300 },
  { bpLo: 209, bpHi: 748, iLo: 301, iHi: 400 },
  { bpLo: 749, bpHi: 2000, iLo: 401, iHi: 500 }
];

function calculateSubIndex(val: any, ranges: { bpLo: number; bpHi: number; iLo: number; iHi: number }[]): number | null {
  if (val === null || val === undefined || typeof val !== 'number' || isNaN(val) || !isFinite(val) || val < 0) {
    return null;
  }

  for (const r of ranges) {
    if (val >= r.bpLo && val <= r.bpHi) {
      const result = ((r.iHi - r.iLo) / (r.bpHi - r.bpLo)) * (val - r.bpLo) + r.iLo;
      return Math.round(result);
    }
  }

  const last = ranges[ranges.length - 1];
  if (val > last.bpHi) {
    const result = ((500 - last.iLo) / (last.bpHi - last.bpLo)) * (val - last.bpLo) + last.iLo;
    return Math.min(500, Math.round(result));
  }

  return null;
}

export class EnvironmentalDataService {
  private static initPromise: Promise<void> | null = null;
  private static stationsRegistry: EnvironmentalStation[] = [];
  private static aqHistoryData: Map<string, any[]> = new Map(); // stationId -> list of AQ observations
  private static weatherHistoryData: Map<string, any[]> = new Map(); // weatherStationKey -> list of weather observations
  private static stationWeatherMatch: Map<string, WeatherMatch> = new Map(); // stationId -> WeatherMatch
  private static hotspotsCache: Map<string, Hotspot[]> = new Map(); // country -> list of Hotspots
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private static async _initialize(): Promise<void> {
    try {
      console.log('[EnvironmentalDataService] Starting backend datasets ingestion...');

      // Helper to compute timestamp value
      const getTimestampTime = (row: any) => {
        const dateStr = row.date || row.year || '';
        if (!dateStr) return 0;
        return new Date(dateStr).getTime() || 0;
      };

      // 1. Load Station Registry from normalized CSV
      if (fs.existsSync(NORMALIZED_CSV)) {
        const text = fs.readFileSync(NORMALIZED_CSV, 'utf-8');
        const objects = csvToObjects(text);

        // Group observations by station identity to find unique stations
        const groupedRows = new Map<string, any[]>();
        for (const row of objects) {
          const country = row.country || '';
          const stationName = row.station_name || '';
          if (!stationName) continue;

          const stationId = 'station-' + normalizeName(country) + '-' + normalizeName(stationName);
          if (!groupedRows.has(stationId)) {
            groupedRows.set(stationId, []);
          }
          groupedRows.get(stationId)!.push(row);
        }

        // Map grouped stations to registry with latest observation values
        this.stationsRegistry = [];
        for (const [stationId, rows] of groupedRows.entries()) {
          // Sort chronologically (ascending) so the latest observation is last
          rows.sort((a, b) => getTimestampTime(a) - getTimestampTime(b));
          const latestRow = rows[rows.length - 1];

          const lat = latestRow.latitude ? parseFloat(latestRow.latitude) : NaN;
          const lng = latestRow.longitude ? parseFloat(latestRow.longitude) : NaN;

          let finalLat = isNaN(lat) ? NaN : lat;
          let finalLng = isNaN(lng) ? NaN : lng;
          let coordSource: string | undefined = undefined;

          const isUaeCountry = latestRow.country.toLowerCase() === 'united arab emirates' || latestRow.country.toLowerCase() === 'uae';

          if (isUaeCountry) {
            const hasValidSource = !isNaN(finalLat) && !isNaN(finalLng) && finalLat !== 0 && finalLng !== 0;
            if (!hasValidSource) {
              const normalizedKey = normalizeStationName(latestRow.station_name);
              const curated = UAE_STATION_COORDINATES[normalizedKey];
              if (curated) {
                finalLat = curated.latitude;
                finalLng = curated.longitude;
                coordSource = 'curated_station_location';
              }
            } else {
              coordSource = 'source_dataset';
            }
          }

          const stationTemp: EnvironmentalStation = {
            id: stationId,
            country: latestRow.country,
            state: latestRow.state_or_region || '',
            city: latestRow.city || '',
            station: latestRow.station_name,
            latitude: finalLat,
            longitude: finalLng,
            coordinateSource: coordSource,
            timestamp: latestRow.date || latestRow.year || '',
            aqi: latestRow.aqi && latestRow.aqi.trim() !== '' && !isNaN(parseFloat(latestRow.aqi)) ? parseFloat(latestRow.aqi) : null,
            pm25: latestRow.pm2_5 ? parseFloat(latestRow.pm2_5) : NaN,
            pm10: latestRow.pm10 ? parseFloat(latestRow.pm10) : NaN,
            no2: latestRow.no2 ? parseFloat(latestRow.no2) : NaN,
            so2: latestRow.so2 ? parseFloat(latestRow.so2) : NaN,
            co: latestRow.co ? parseFloat(latestRow.co) : NaN,
            o3: latestRow.o3 ? parseFloat(latestRow.o3) : NaN,
            data_granularity: latestRow.data_granularity,
            source_dataset: latestRow.source_dataset,
            source_row_id: latestRow.source_row_id,
            source_unit_notes: latestRow.source_unit_notes
          };

          const aqiResult = this.calculateAQI(stationTemp);
          stationTemp.aqi = aqiResult.aqi;
          stationTemp.calculatedAqi = aqiResult.calculatedAqi;
          stationTemp.sourceAqi = aqiResult.sourceAqi;
          stationTemp.aqiCategory = aqiResult.aqiCategory;
          stationTemp.dominantPollutant = aqiResult.dominantPollutant;
          stationTemp.aqiMethod = aqiResult.aqiMethod;
          stationTemp.aqiSource = aqiResult.aqiSource;
          stationTemp.aqiUnavailableReason = aqiResult.aqiUnavailableReason;

          const riskVal = this.calculatePollutantRiskScore(stationTemp);
          stationTemp.pollutantRiskScore = riskVal;
          stationTemp.riskScore = riskVal;
          stationTemp.riskScoreType = riskVal !== null ? 'BLiXXiS Pollutant Risk' : null;
          this.stationsRegistry.push(stationTemp);
        }

        // Filter and reduce India stations registry to ~113 representative stations
        const indiaStations = this.stationsRegistry.filter(s => s.country.toLowerCase() === 'india');
        const nonIndiaStations = this.stationsRegistry.filter(s => s.country.toLowerCase() !== 'india');

        // Deterministic geographic selection for India stations
        const isImportantStation = (name: string): boolean => {
          const n = name.toLowerCase();
          return n.includes('anand vihar') || n.includes('shadipur') || n.includes('city center, gwalior');
        };

        const isImportantCity = (city: string): boolean => {
          const c = city.toLowerCase();
          const majors = [
            'delhi', 'new delhi', 'gwalior', 'mumbai', 'kolkata', 'chennai',
            'bengaluru', 'hyderabad', 'ahmedabad', 'lucknow', 'jaipur',
            'patna', 'bhopal', 'guwahati', 'srinagar'
          ];
          return majors.some(m => c === m || c.includes(m));
        };

        const stateGroupsMap = new Map<string, EnvironmentalStation[]>();
        for (const s of indiaStations) {
          const stateKey = s.state || 'Unknown';
          if (!stateGroupsMap.has(stateKey)) {
            stateGroupsMap.set(stateKey, []);
          }
          stateGroupsMap.get(stateKey)!.push(s);
        }

        const selectedIndiaStations: EnvironmentalStation[] = [];
        for (const [state, list] of stateGroupsMap.entries()) {
          const scoredList = list.map(s => {
            const pollutantsCount = [s.pm25, s.pm10, s.no2, s.so2, s.co, s.o3]
              .filter(val => val !== undefined && val !== null && !isNaN(val)).length;

            let score = 0;
            if (isImportantStation(s.station)) score += 10000;
            if (isImportantCity(s.city)) score += 5000;
            score += pollutantsCount * 10;

            return { station: s, score };
          });

          scoredList.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.station.station.localeCompare(b.station.station);
          });

          const cap = state.toLowerCase() === 'delhi' ? 7 : 5;
          const selected = scoredList.slice(0, cap).map(item => item.station);
          selectedIndiaStations.push(...selected);
        }

        this.stationsRegistry = [...nonIndiaStations, ...selectedIndiaStations];
        console.log(`[EnvironmentalDataService] Ingested registry: Created ${this.stationsRegistry.length} unique station entities (India reduced to ${selectedIndiaStations.length}).`);
      } else {
        throw new Error(`Registry CSV file not found at: ${NORMALIZED_CSV}`);
      }

      // 2. Load Historical Air Quality Time-Series
      if (fs.existsSync(COMBINED_AQ_CSV)) {
        const text = fs.readFileSync(COMBINED_AQ_CSV, 'utf-8');
        const lines = text.split(/\r?\n/);

        // Cache for matched station IDs (key: "station_name:::country" -> stationId or null)
        const matchCache = new Map<string, string | null>();

        let loadedRows = 0;
        // Skip header lines[0]
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;

          const parts = splitCSVLine(line);
          if (parts.length < 9) continue;

          const [timestamp, latStr, lngStr, station_name, city, country, pollutant, unit, valueStr] = parts;
          const value = parseFloat(valueStr);
          if (isNaN(value) || !station_name) continue;

          const cacheKey = `${station_name.trim()}:::${country.trim()}`;
          let stationId = matchCache.get(cacheKey);

          if (stationId === undefined) {
            // Find and cache the matched station ID
            const histLat = parseFloat(latStr);
            const histLng = parseFloat(lngStr);
            stationId = findRegistryMatch(station_name, country, histLat, histLng, this.stationsRegistry);
            matchCache.set(cacheKey, stationId);
          }

          if (!stationId) continue; // Ignore observations for stations not in registry

          let stationObs = this.aqHistoryData.get(stationId);
          if (!stationObs) {
            stationObs = [];
            this.aqHistoryData.set(stationId, stationObs);
          }

          stationObs.push({
            timestamp,
            pollutant,
            value,
            unit
          });

          loadedRows++;
        }

        // Sort and prune histories to the latest 100 entries (enough for daily/hourly regressions)
        for (const [stationId, obs] of this.aqHistoryData.entries()) {
          obs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          if (obs.length > 100) {
            this.aqHistoryData.set(stationId, obs.slice(obs.length - 100));
          }
        }
        console.log(`[EnvironmentalDataService] Ingested ${loadedRows} historical air-quality observations.`);
      }

      // 3. Load Hourly Weather Time-Series
      if (fs.existsSync(COMBINED_WEATHER_CSV)) {
        const text = fs.readFileSync(COMBINED_WEATHER_CSV, 'utf-8');
        const lines = text.split(/\r?\n/);

        let loadedRows = 0;
        // Skip header lines[0]
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;

          const parts = splitCSVLine(line);
          if (parts.length < 15) continue;

          const [
            timestamp, latStr, lngStr, station_name, city, country,
            tempStr, humidityStr, windSpStr, windDirStr, precStr, rainStr, pressStr, cloudStr, solarStr
          ] = parts;

          if (!station_name) continue;

          const key = normalizeName(station_name);
          let stationWeather = this.weatherHistoryData.get(key);
          if (!stationWeather) {
            stationWeather = [];
            this.weatherHistoryData.set(key, stationWeather);
          }

          stationWeather.push({
            timestamp,
            latitude: parseFloat(latStr),
            longitude: parseFloat(lngStr),
            temperature: parseFloat(tempStr),
            relative_humidity: parseFloat(humidityStr),
            wind_speed: parseFloat(windSpStr),
            wind_direction: parseFloat(windDirStr),
            precipitation: parseFloat(precStr),
            rainfall: parseFloat(rainStr),
            surface_pressure: parseFloat(pressStr),
            cloud_cover: parseFloat(cloudStr),
            solar_radiation: parseFloat(solarStr)
          });

          loadedRows++;
        }

        // Sort and prune weather readings to the latest 100 entries
        for (const [key, weather] of this.weatherHistoryData.entries()) {
          weather.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          if (weather.length > 100) {
            this.weatherHistoryData.set(key, weather.slice(weather.length - 100));
          }
        }
        console.log(`[EnvironmentalDataService] Ingested ${loadedRows} weather rows.`);
      }

      // 4. Pre-compute weather matches O(1) lookup
      console.log('[EnvironmentalDataService] Pre-computing static weather matches...');
      for (const station of this.stationsRegistry) {
        const key = normalizeName(station.station);

        // Priority 1: Exact Name Match
        if (this.weatherHistoryData.has(key)) {
          this.stationWeatherMatch.set(station.id, {
            weatherStationKey: key,
            matchType: 'STATION_NAME'
          });
          continue;
        }

        // Priority 2: Geographical proximity (distance <= 15km)
        if (!isNaN(station.latitude) && !isNaN(station.longitude)) {
          let closestKey: string | null = null;
          let minDistance = Infinity;

          for (const [wKey, list] of this.weatherHistoryData.entries()) {
            if (list.length === 0) continue;
            const first = list[0];

            const latDiff = first.latitude - station.latitude;
            const lngDiff = first.longitude - station.longitude;
            const distKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;

            if (distKm < minDistance && distKm <= 15) {
              minDistance = distKm;
              closestKey = wKey;
            }
          }

          if (closestKey) {
            this.stationWeatherMatch.set(station.id, {
              weatherStationKey: closestKey,
              matchType: 'GEOGRAPHIC_PROXIMITY',
              matchDistance: Math.round(minDistance * 10) / 10
            });
            continue;
          }
        }

        // Priority 3: NONE
        this.stationWeatherMatch.set(station.id, {
          weatherStationKey: '',
          matchType: 'NONE'
        });
      }
      console.log(`[EnvironmentalDataService] Pre-computed weather mappings for ${this.stationWeatherMatch.size} stations.`);

      // Pre-compute hotspots
      this.precomputeHotspots();

      this.isInitialized = true;
      console.log('[EnvironmentalDataService] Datasets ingestion & indexing complete.');
    } catch (e: any) {
      this.initPromise = null;
      console.error('[EnvironmentalDataService] Datasets ingestion failed:', e.message || e);
      throw e;
    }
  }

  // Pre-calculate hotspots list and cache them
  private static precomputeHotspots(): void {
    this.hotspotsCache.clear();

    // Group hotspots by country filters
    const countries = ['all', 'india', 'saudi arabia', 'united arab emirates'];
    for (const country of countries) {
      let list = [...this.stationsRegistry];
      if (country !== 'all') {
        list = list.filter(s => isSameCountry(s.country, country));
      }

      const hotspotsList = list
        .map(station => {
          const riskScore = this.calculatePollutantRiskScore(station);
          const hasAqi = station.aqi !== null && station.aqi !== undefined && !isNaN(station.aqi);
          const effectiveScore = hasAqi ? station.aqi! : (riskScore !== null ? riskScore : 0);
          const scoreRisk = Math.min(effectiveScore / 150, 1.0);

          const history = this.aqHistoryData.get(station.id) || [];
          let trend = 5;

          if (history.length >= 2) {
            const pm25Obs = history.filter(obs => obs.pollutant.toLowerCase().includes('pm2.5') || obs.pollutant.toLowerCase().includes('pm25'));
            if (pm25Obs.length >= 2) {
              const latestVal = pm25Obs[pm25Obs.length - 1].value;
              const prevVal = pm25Obs[pm25Obs.length - 2].value;
              if (prevVal > 0) {
                trend = Math.round(((latestVal - prevVal) / prevVal) * 100);
              }
            }
          }

          const trendRisk = Math.max(-0.5, Math.min(1.0, trend / 30));

          let densityRisk = 0.3;
          if (station.city === "New Delhi" || station.city === "Lucknow") densityRisk = 0.8;
          else if (station.city === "Mumbai" || station.city === "Dubai") densityRisk = 0.5;

          const score = (0.75 * scoreRisk + 0.15 * trendRisk + 0.10 * densityRisk) * 100;

          let status: Hotspot['status'] = 'Normal';
          if (score >= 75) status = 'Critical';
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
            scoreType: hasAqi ? ('AQI-based' as const) : ('Pollutant-based' as const),
            pollutantRiskScore: riskScore !== null ? riskScore : undefined,
            riskScore: riskScore !== null ? riskScore : undefined,
            riskScoreType: riskScore !== null ? 'BLiXXiS Pollutant Risk' : undefined
          };
        })
        .filter(h => h.status !== 'Normal')
        .sort((a, b) => b.score - a.score);

      this.hotspotsCache.set(country, hotspotsList);
    }
    console.log('[EnvironmentalDataService] Pre-computed hotspots cache.');
  }

  // Check if unit is verified
  static isUnitVerified(station: EnvironmentalStation): boolean {
    if (station.source_unit_notes?.toLowerCase().includes('unverified') ||
      station.source_unit_notes?.toLowerCase().includes('unknown')) {
      return false;
    }
    return true;
  }

  // Get AQI category based on CPCB or standard US mapping
  private static getAqiCategoryByValue(aqi: number, country: string): string {
    if (country.toLowerCase() === 'india') {
      if (aqi <= 50) return 'Good';
      if (aqi <= 100) return 'Satisfactory';
      if (aqi <= 200) return 'Moderate';
      if (aqi <= 300) return 'Poor';
      if (aqi <= 400) return 'Very Poor';
      return 'Severe';
    }
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  // Calculate standard AQI based on selected methodologies
  static calculateAQI(station: EnvironmentalStation): {
    aqi: number | null;
    calculatedAqi: number | null;
    sourceAqi: number | null;
    aqiCategory: string | null;
    dominantPollutant: string | null;
    aqiMethod: string | null;
    aqiSource: 'source' | 'calculated' | null;
    aqiUnavailableReason: string | null;
  } {
    // 1. Source AQI has priority
    if (station.aqi !== undefined && station.aqi !== null && !isNaN(station.aqi)) {
      return {
        aqi: station.aqi,
        calculatedAqi: null,
        sourceAqi: station.aqi,
        aqiCategory: this.getAqiCategoryByValue(station.aqi, station.country),
        dominantPollutant: null,
        aqiMethod: 'Dataset Source',
        aqiSource: 'source',
        aqiUnavailableReason: null
      };
    }

    const countryLower = station.country.toLowerCase().trim();

    // 2. India CPCB AQI Calculation
    if (countryLower === 'india') {
      // India raw CO unit is unverified (reports 110 instead of 0.11 mg/m³).
      // We exclude CO from calculated India AQI to avoid silent conversion, as per STEP 8.
      const subIndices: { pollutant: string; val: number }[] = [];

      const pm25Sub = calculateSubIndex(station.pm25, pm25Ranges);
      if (pm25Sub !== null) subIndices.push({ pollutant: 'PM2.5', val: pm25Sub });

      const pm10Sub = calculateSubIndex(station.pm10, pm10Ranges);
      if (pm10Sub !== null) subIndices.push({ pollutant: 'PM10', val: pm10Sub });

      const no2Sub = calculateSubIndex(station.no2, no2Ranges);
      if (no2Sub !== null) subIndices.push({ pollutant: 'NO2', val: no2Sub });

      const so2Sub = calculateSubIndex(station.so2, so2Ranges);
      if (so2Sub !== null) subIndices.push({ pollutant: 'SO2', val: so2Sub });

      const o3Sub = calculateSubIndex(station.o3, o3Ranges);
      if (o3Sub !== null) subIndices.push({ pollutant: 'O3', val: o3Sub });

      const hasPm = subIndices.some(s => s.pollutant === 'PM2.5' || s.pollutant === 'PM10');
      if (subIndices.length >= 3 && hasPm) {
        let maxIndex = -1;
        let dominant: string | null = null;
        for (const s of subIndices) {
          if (s.val > maxIndex) {
            maxIndex = s.val;
            dominant = s.pollutant;
          }
        }
        return {
          aqi: maxIndex,
          calculatedAqi: maxIndex,
          sourceAqi: null,
          aqiCategory: this.getAqiCategoryByValue(maxIndex, 'india'),
          dominantPollutant: dominant,
          aqiMethod: 'CPCB National AQI Standard',
          aqiSource: 'calculated',
          aqiUnavailableReason: null
        };
      } else {
        return {
          aqi: null,
          calculatedAqi: null,
          sourceAqi: null,
          aqiCategory: 'Unavailable',
          dominantPollutant: null,
          aqiMethod: 'CPCB National AQI Standard',
          aqiSource: null,
          aqiUnavailableReason: 'CPCB AQI requires at least 3 pollutants including PM2.5 or PM10.'
        };
      }
    }

    // 3. UAE
    if (countryLower === 'uae' || countryLower === 'united arab emirates') {
      const isAnnual = station.data_granularity?.toLowerCase() === 'annual' || station.data_granularity?.toLowerCase() === 'annual average';
      return {
        aqi: null,
        calculatedAqi: null,
        sourceAqi: null,
        aqiCategory: 'Unavailable',
        dominantPollutant: null,
        aqiMethod: null,
        aqiSource: null,
        aqiUnavailableReason: isAnnual
          ? 'AQI unavailable — annual observations do not support short-term AQI calculation.'
          : 'Insufficient metadata or averaging period for defensible AQI calculation.'
      };
    }

    // 4. Saudi Arabia & Others
    return {
      aqi: null,
      calculatedAqi: null,
      sourceAqi: null,
      aqiCategory: 'Unavailable',
      dominantPollutant: null,
      aqiMethod: null,
      aqiSource: null,
      aqiUnavailableReason: 'Insufficient metadata or averaging period for defensible AQI calculation.'
    };
  }

  // Calculate dynamic BLiXXiS Pollutant-based Risk Score (0-100+)
  static calculatePollutantRiskScore(station: EnvironmentalStation): number | null {

    const pollutants = [
      { val: station.pm25, std: 60 },
      { val: station.pm10, std: 100 },
      { val: station.no2, std: 80 },
      { val: station.so2, std: 80 },
      { val: station.co, std: 2.0 },
      { val: station.o3, std: 100 }
    ];

    const validPcts = pollutants
      .filter(p => p.val !== undefined && p.val !== null && !isNaN(p.val))
      .map(p => (p.val / p.std) * 100);

    if (validPcts.length === 0) {
      return null;
    }

    return Math.round(Math.max(...validPcts));
  }

  // Get stations registry
  static async getStations(filters?: { country?: string; state?: string }): Promise<EnvironmentalStation[]> {
    await this.initialize();
    let list = [...this.stationsRegistry];
    if (filters?.country && filters.country !== 'All Countries' && filters.country !== 'All') {
      list = list.filter(s => isSameCountry(s.country, filters.country!));
    }
    if (filters?.state) {
      list = list.filter(s => s.state.toLowerCase() === filters.state!.toLowerCase());
    }
    return list;
  }

  // Get station by ID
  static async getStationById(id: string): Promise<EnvironmentalStation | null> {
    await this.initialize();
    return this.stationsRegistry.find(s => s.id === id) || null;
  }

  // Get hotspots from pre-calculated cache O(1)
  static async getHotspots(country?: string): Promise<Hotspot[]> {
    await this.initialize();
    let countryKey = country ? country.toLowerCase() : 'all';
    if (countryKey === 'all countries' || countryKey === 'all') countryKey = 'all';
    if (countryKey === 'uae' || countryKey === 'united arab emirates') {
      countryKey = 'united arab emirates';
    }

    return this.hotspotsCache.get(countryKey) || [];
  }

  // Determine if a station supports forecasting
  static supportsForecasting(station: EnvironmentalStation): boolean {
    if (station.data_granularity?.toLowerCase() === 'annual' || station.data_granularity?.toLowerCase() === 'annual average') {
      return false;
    }
    const history = this.aqHistoryData.get(station.id) || [];
    return history.length >= 3;
  }

  // Get forecast (Calculates timeline predictions using historical index)
  static async getForecast(stationId: string): Promise<AQIForecast> {
    await this.initialize();
    const station = this.stationsRegistry.find(s => s.id === stationId);
    if (!station) {
      return {
        stationId,
        currentAqi: null,
        currentRiskScore: null,
        forecastMetric: 'Risk',
        forecast6h: 0,
        forecast12h: 0,
        forecast24h: 0,
        forecastTimeline: [],
        insufficientData: true,
        message: 'Station not found.'
      };
    }

    const isUae = station.country.toLowerCase() === 'united arab emirates' || station.country.toLowerCase() === 'uae';
    const isAqiActive = station.aqi !== null && station.aqi !== undefined && !isNaN(station.aqi);
    const cachedRisk = station.riskScore !== undefined ? station.riskScore : null;

    if (station.data_granularity?.toLowerCase() === 'annual' || station.data_granularity?.toLowerCase() === 'annual average') {
      return {
        stationId,
        currentAqi: null,
        currentRiskScore: cachedRisk,
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

    if (!this.supportsForecasting(station)) {
      return {
        stationId,
        currentAqi: isAqiActive ? station.aqi : null,
        currentRiskScore: cachedRisk,
        forecastMetric: isAqiActive ? 'AQI' : 'Risk',
        forecast6h: 0,
        forecast12h: 0,
        forecast24h: 0,
        forecastTimeline: [],
        insufficientData: true,
        message: 'Insufficient data or annual averages cannot be used for short-term forecasting.'
      };
    }

    const historyObs = this.aqHistoryData.get(stationId) || [];

    // Group history by timestamp to construct daily/hourly risk progression
    const obsByTimestamp = new Map<string, any>();
    for (const obs of historyObs) {
      if (!obsByTimestamp.has(obs.timestamp)) {
        obsByTimestamp.set(obs.timestamp, {});
      }
      obsByTimestamp.get(obs.timestamp)[obs.pollutant.toLowerCase()] = obs.value;
    }

    const timelinePoints: { timestamp: string; score: number }[] = [];
    for (const [timestamp, pollutants] of obsByTimestamp.entries()) {
      const pm25 = pollutants['pm2.5'] || pollutants['pm25'] || pollutants['pm2_5'];
      const pm10 = pollutants['pm10'];
      const no2 = pollutants['no2'];
      const so2 = pollutants['so2'];
      const co = pollutants['co'];
      const o3 = pollutants['o3'];

      const mockStation: EnvironmentalStation = {
        id: station.id,
        country: station.country,
        state: station.state,
        city: station.city,
        station: station.station,
        latitude: station.latitude,
        longitude: station.longitude,
        timestamp,
        aqi: null,
        pm25: pm25 !== undefined && pm25 !== null && !isNaN(pm25) ? pm25 : NaN,
        pm10: pm10 !== undefined && pm10 !== null && !isNaN(pm10) ? pm10 : NaN,
        no2: no2 !== undefined && no2 !== null && !isNaN(no2) ? no2 : NaN,
        so2: so2 !== undefined && so2 !== null && !isNaN(so2) ? so2 : NaN,
        co: co !== undefined && co !== null && !isNaN(co) ? co : NaN,
        o3: o3 !== undefined && o3 !== null && !isNaN(o3) ? o3 : NaN
      };

      let score: number | null = null;
      if (isAqiActive) {
        const histAqiRes = this.calculateAQI(mockStation);
        score = histAqiRes.aqi;
      } else {
        score = this.calculatePollutantRiskScore(mockStation);
      }

      if (score !== null && !isNaN(score)) {
        timelinePoints.push({
          timestamp,
          score
        });
      }
    }

    timelinePoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const startValue = isAqiActive ? station.aqi! : (station.riskScore || 0);

    if (timelinePoints.length < 3) {
      return {
        stationId,
        currentAqi: isAqiActive ? station.aqi : null,
        currentRiskScore: cachedRisk,
        forecastMetric: isAqiActive ? 'AQI' : 'Risk',
        forecast6h: 0,
        forecast12h: 0,
        forecast24h: 0,
        forecastTimeline: [],
        insufficientData: true,
        message: 'Insufficient temporal data for short-term forecasting.'
      };
    }

    const recentHistory = timelinePoints.slice(Math.max(0, timelinePoints.length - 4), timelinePoints.length - 1).map(p => p.score);
    const currentScore = startValue;

    let recentTrend = 5;
    if (recentHistory.length > 0) {
      const prev = recentHistory[recentHistory.length - 1];
      recentTrend = prev > 0 ? Math.round(((currentScore - prev) / prev) * 100) : 5;
    }

    const forecastResult = ForecastEngine.predict({
      currentAqi: currentScore,
      recentHistory,
      pm25: station.pm25 || 0,
      recentTrend
    });

    return {
      stationId,
      currentAqi: isAqiActive ? station.aqi : null,
      currentRiskScore: cachedRisk,
      forecastMetric: isAqiActive ? 'AQI' : 'Risk',
      forecast6h: forecastResult.predicted6h,
      forecast12h: forecastResult.predicted12h,
      forecast24h: forecastResult.predicted24h,
      forecastTimeline: [
        { time: 'Current', aqi: currentScore, predicted: false },
        { time: '+6h', aqi: forecastResult.predicted6h, predicted: true },
        { time: '+12h', aqi: forecastResult.predicted12h, predicted: true },
        { time: '+24h', aqi: forecastResult.predicted24h, predicted: true }
      ],
      observedHistory: recentHistory
    };
  }

  // Get weather using static O(1) pre-computed match lookup
  static getLatestWeather(station: EnvironmentalStation): { weather: any | null; matchType: 'STATION_ID' | 'STATION_NAME' | 'GEOGRAPHIC_PROXIMITY' | 'NONE'; matchDistance?: number } {
    const match = this.stationWeatherMatch.get(station.id);
    if (!match || match.matchType === 'NONE') {
      return { weather: null, matchType: 'NONE' };
    }

    const list = this.weatherHistoryData.get(match.weatherStationKey);
    const weather = list && list.length > 0 ? list[list.length - 1] : null;
    return {
      weather,
      matchType: match.matchType as any,
      matchDistance: match.matchDistance
    };
  }

  // Get developer-safe diagnostics stats
  static async getDiagnostics() {
    await this.initialize();
    const list = this.stationsRegistry;
    const indiaCount = list.filter(s => s.country.toLowerCase() === 'india').length;
    const uaeCount = list.filter(s => s.country.toLowerCase() === 'uae' || s.country.toLowerCase() === 'united arab emirates').length;
    const saudiCount = list.filter(s => s.country.toLowerCase() === 'saudi arabia').length;

    const aqiCalculable = list.filter(s => s.aqi !== null && s.aqi !== undefined && !isNaN(s.aqi)).length;
    const aqiUnavailable = list.filter(s => s.aqi === null || s.aqi === undefined || isNaN(s.aqi)).length;

    const riskCalculable = list.filter(s => s.riskScore !== null && s.riskScore !== undefined && !isNaN(s.riskScore)).length;
    const riskUnavailable = list.filter(s => s.riskScore === null || s.riskScore === undefined || isNaN(s.riskScore)).length;

    const mapped = list.filter(s => !isNaN(s.latitude) && !isNaN(s.longitude) && isFinite(s.latitude) && isFinite(s.longitude)).length;
    const unmapped = list.filter(s => isNaN(s.latitude) || isNaN(s.longitude) || !isFinite(s.latitude) || !isFinite(s.longitude)).length;

    const uaeStations = list.filter(s => s.country.toLowerCase() === 'uae' || s.country.toLowerCase() === 'united arab emirates');
    const uaeLoaded = uaeStations.length;
    const uaeWithCoordinates = uaeStations.filter(s => !isNaN(s.latitude) && !isNaN(s.longitude) && isFinite(s.latitude) && isFinite(s.longitude)).length;
    const uaeMappedOnMap = Math.min(5, uaeWithCoordinates);

    return {
      indiaCount,
      uaeCount,
      saudiCount,
      totalStationCount: list.length,
      aqiCalculable,
      aqiUnavailable,
      riskCalculable,
      riskUnavailable,
      mapped,
      unmapped,
      uaeLoaded,
      uaeWithCoordinates,
      uaeMappedOnMap,
      datasetInfo: {
        registryFile: 'normalized_air_quality_india_uae_saudi.csv',
        airQualityFile: 'combined_3country_air_quality.csv',
        weatherFile: 'combined_3country_hourly_weather.csv',
        description: 'Ingested raw CSV environmental telemetry across India, UAE, and Saudi Arabia'
      }
    };
  }

  // Get historical observations for a station lazily from index
  static async getHistory(stationId: string): Promise<any[]> {
    await this.initialize();
    return this.aqHistoryData.get(stationId) || [];
  }
}
