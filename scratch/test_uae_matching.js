const fs = require('fs');

const REGISTRY_PATH = 'c:/Users/sudhamshu/code-for-communities/client/src/data/normalized_air_quality_india_uae_saudi.csv';
const HISTORY_PATH = 'c:/Users/sudhamshu/code-for-communities/client/src/data/combined_3country_air_quality.csv';

function splitCSVLine(line) {
  const result = [];
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

const regLines = fs.readFileSync(REGISTRY_PATH, 'utf-8').split('\n');
const regHeaders = splitCSVLine(regLines[0]);
const countryIdx = regHeaders.indexOf('country');
const stationIdx = regHeaders.indexOf('station_name');

const registryStations = new Set();
for (let i = 1; i < regLines.length; i++) {
  if (!regLines[i].trim()) continue;
  const parts = splitCSVLine(regLines[i]);
  const country = parts[countryIdx] || '';
  if (country.toLowerCase() === 'uae' || country.toLowerCase() === 'united arab emirates') {
    registryStations.add(parts[stationIdx].trim());
  }
}

// Read all unique history coordinates
const historyCoords = new Map(); // normalized -> { originalName, lat, lng, city }

function normalize(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

function cleanUaeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/school/g, '')
    .replace(/oasis/g, '')
    .replace(/village/g, '')
    .replace(/road/g, '')
    .replace(/street/g, '')
    .replace(/gate/g, '')
    .replace(/park/g, '')
    .replace(/zone/g, '')
    .replace(/port/g, '')
    .replace(/city/g, '')
    .replace(/centre/g, '')
    .replace(/center/g, '')
    .replace(/village.*/g, '')
    .replace(/sharjah.*/g, '')
    .replace(/ras al khaimah.*/g, '')
    .replace(/uae/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const histLines = fs.readFileSync(HISTORY_PATH, 'utf-8').split('\n');
for (let i = 1; i < histLines.length; i++) {
  const line = histLines[i];
  if (!line) continue;
  if (line.toLowerCase().includes('uae') || line.toLowerCase().includes('united arab emirates')) {
    const parts = splitCSVLine(line);
    const lat = parts[1];
    const lng = parts[2];
    const station = parts[3];
    const city = parts[4];
    const country = parts[5];
    
    if ((country.toLowerCase() === 'uae' || country.toLowerCase() === 'united arab emirates') && lat && lng) {
      const key = station.trim();
      if (!historyCoords.has(key)) {
        historyCoords.set(key, { lat: parseFloat(lat), lng: parseFloat(lng), city, name: key });
      }
    }
  }
}

console.log('--- UAE STATIONS MATCHING ANALYSIS ---');
let matchedCount = 0;
const unmatched = [];

for (const regSt of registryStations) {
  let matched = false;
  
  // Rule 1: Exact Match (normalized)
  const normReg = normalize(regSt);
  for (const [histSt, info] of historyCoords.entries()) {
    if (normalize(histSt) === normReg) {
      console.log(`[EXACT MATCH] Registry: "${regSt}" -> History: "${histSt}" (${info.lat}, ${info.lng})`);
      matched = true;
      matchedCount++;
      break;
    }
  }
  if (matched) continue;
  
  // Rule 2: Cleaned UAE Name Match (stripping suffixes like school, oasis, street, etc.)
  const cleanReg = cleanUaeName(regSt);
  for (const [histSt, info] of historyCoords.entries()) {
    const cleanHist = cleanUaeName(histSt);
    if (cleanReg && cleanHist && (cleanReg === cleanHist || cleanReg.includes(cleanHist) || cleanHist.includes(cleanReg))) {
      console.log(`[CLEANED MATCH] Registry: "${regSt}" -> History: "${histSt}" (${info.lat}, ${info.lng})`);
      matched = true;
      matchedCount++;
      break;
    }
  }
  if (matched) continue;

  unmatched.push(regSt);
}

console.log(`\nMatched: ${matchedCount} / ${registryStations.size}`);
console.log('Unmatched Registry Stations:', unmatched);
