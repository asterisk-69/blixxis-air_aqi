import { EnvironmentalDataService } from '../server/src/services/environmentalData';

async function test() {
  await EnvironmentalDataService.initialize();
  const stations = await EnvironmentalDataService.getStations();
  
  // Find GVM station
  const gvm = stations.find(s => s.station.includes('GVM') || s.city.includes('Visakhapatnam'));
  if (!gvm) {
    console.log('GVM station not found in registry!');
    return;
  }
  
  console.log('GVM Station Registry Entry:', JSON.stringify(gvm, null, 2));
  
  const forecast = await EnvironmentalDataService.getForecast(gvm.id);
  console.log('GVM Station Forecast:', JSON.stringify(forecast, null, 2));
  
  const history = await EnvironmentalDataService.getHistory(gvm.id);
  console.log(`GVM History Count: ${history.length}`);
  console.log('GVM History Samples (last 5):', JSON.stringify(history.slice(-5), null, 2));
}

test().catch(err => console.error(err));
