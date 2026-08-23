import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GeminiService } from './services/geminiService';
import { EnvironmentalDataService } from './services/environmentalData';

// Load environment variables from root workspace directory
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration for citizen photo uploads
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// --- API Endpoints ---

// GET /api/stations
app.get('/api/stations', async (req, res) => {
  try {
    const { country, state } = req.query;
    const stations = await EnvironmentalDataService.getStations({
      country: country as string,
      state: state as string
    });
    res.json(stations);
  } catch (error: any) {
    console.error('Error fetching stations:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/stations/:id
app.get('/api/stations/:id', async (req, res) => {
  try {
    const station = await EnvironmentalDataService.getStationById(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    res.json(station);
  } catch (error: any) {
    console.error(`Error fetching station ${req.params.id}:`, error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/hotspots
app.get('/api/hotspots', async (req, res) => {
  try {
    const { country } = req.query;
    const hotspots = await EnvironmentalDataService.getHotspots(country as string);
    res.json(hotspots);
  } catch (error: any) {
    console.error('Error fetching hotspots:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/stations/:id/forecast
app.get('/api/stations/:id/forecast', async (req, res) => {
  try {
    const forecast = await EnvironmentalDataService.getForecast(req.params.id);
    res.json(forecast);
  } catch (error: any) {
    console.error(`Error fetching forecast for ${req.params.id}:`, error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/stations/:id/weather
app.get('/api/stations/:id/weather', async (req, res) => {
  try {
    const station = await EnvironmentalDataService.getStationById(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    const weatherResult = EnvironmentalDataService.getLatestWeather(station);
    res.json(weatherResult);
  } catch (error: any) {
    console.error(`Error fetching weather for ${req.params.id}:`, error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/stations/:id/history
app.get('/api/stations/:id/history', async (req, res) => {
  try {
    const history = await EnvironmentalDataService.getHistory(req.params.id);
    res.json(history);
  } catch (error: any) {
    console.error(`Error fetching history for ${req.params.id}:`, error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Liveness check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    mode: 'PROTOTYPE',
    timestamp: new Date().toISOString()
  });
});

// GET /api/diagnostics
app.get('/api/diagnostics', async (req, res) => {
  try {
    const stats = await EnvironmentalDataService.getDiagnostics();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching diagnostics:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/countries
app.get('/api/countries', (req, res) => {
  res.json(['India', 'Saudi Arabia', 'UAE']);
});

// POST /api/analyze-image (Simulated visual analyst placeholder)
app.post('/api/analyze-image', upload.single('image'), (req, res) => {
  res.json({
    success: true,
    message: 'Vision endpoint initialized'
  });
});

// POST /api/ai/explain-risk
app.post('/api/ai/explain-risk', async (req, res) => {
  try {
    const context = req.body;
    if (!context || !context.station_name || !context.country) {
      return res.status(400).json({ error: 'Missing required context fields: station_name and country are mandatory.' });
    }
    const result = await GeminiService.explainRisk(context);
    res.json(result);
  } catch (error: any) {
    console.error('[Gemini Service Error - explainRisk]:', error.message || error);
    res.status(500).json({ error: 'AI analysis service temporarily unavailable.' });
  }
});

// POST /api/ai/generate-intervention
app.post('/api/ai/generate-intervention', async (req, res) => {
  try {
    const context = req.body;
    if (!context || !context.station_name || !context.country) {
      return res.status(400).json({ error: 'Missing required context fields: station_name and country are mandatory.' });
    }
    const result = await GeminiService.generateIntervention(context);
    res.json(result);
  } catch (error: any) {
    console.error('[Gemini Service Error - generateIntervention]:', error.message || error);
    res.status(500).json({ error: 'AI decision support service temporarily unavailable.' });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`[BLiXXiS Backend] Server is running on port ${PORT}`);
  console.log(`[BLiXXiS Backend] Cors configured for localhost development`);
  
  // Asynchronously parse and index datasets in the background
  EnvironmentalDataService.initialize().catch(err => {
    console.error('[BLiXXiS Backend] Failed to pre-load environmental datasets:', err);
  });
});

