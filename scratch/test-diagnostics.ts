import { EnvironmentalDataService } from '../server/src/services/environmentalData';

async function main() {
  console.log("Initializing EnvironmentalDataService...");
  await EnvironmentalDataService.initialize();
  console.log("Fetching diagnostics...");
  const diag = await EnvironmentalDataService.getDiagnostics();
  console.log("Diagnostics result:", JSON.stringify(diag, null, 2));
}

main().catch(err => {
  console.error("Error in diagnostics test:", err);
});
