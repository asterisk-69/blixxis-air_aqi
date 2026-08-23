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

const historyCoords = new Map();

function cleanUaeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/,\s*(ras al khaimah|sharjah|dubai|abu dhabi|fujairah|ajman|umm al quwain|uae).*$/g, '')
    .replace(/\s*-.*$/g, '')
    .replace(/\b(school|oasis|village|road|street|gate|park|zone|port|city|centre|center|islamic|institute|hills|silicon|d9|zone|south|north|east|west)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/ee/g, 'e')
    .replace(/aa/g, 'a')
    .replace(/oo/g, 'o')
    .replace(/y/g, 'i')
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

console.log('--- UAE STATIONS MATCHING ANALYSIS V2 ---');
let matchedCount = 0;
const matchedPairs = [];
const unmatched = [];

for (const regSt of registryStations) {
  let matched = false;
  const cleanReg = cleanUaeName(regSt);
  
  for (const [histSt, info] of historyCoords.entries()) {
    const cleanHist = cleanUaeName(histSt);
    if (cleanReg && cleanHist && cleanReg === cleanHist) {
      matchedPairs.push(`Registry: "${regSt}" (${cleanReg}) -> History: "${histSt}" (${cleanHist}) [Coords: ${info.lat}, ${info.lng}]`);
      matched = true;
      matchedCount++;
      break;
    }
  }
  
  if (!matched) {
    unmatched.push(regSt);
  }
}

console.log(`Matched: ${matchedCount} / ${registryStations.size}`);
console.log('\nMatches:');
matchedPairs.forEach(p => console.log(p));
console.log('\nUnmatched:', unmatched);
