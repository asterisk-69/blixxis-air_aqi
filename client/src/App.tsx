import { useState, useEffect } from 'react';
import './App.css';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { MapView } from './pages/MapView';
import { Hotspots } from './pages/Hotspots';
import { Forecast } from './pages/Forecast';
import { CitizenReports } from './pages/CitizenReports';
import { IndiaNetwork } from './pages/IndiaNetwork';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import type { EnvironmentalStation } from './types/environmental';
import { EnvironmentalDataService } from './services/environmentalData';

function App() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedCountry, setSelectedCountry] = useState<string>('All Countries');
  const [selectedStationGlobal, setSelectedStationGlobal] = useState<EnvironmentalStation | null>(null);
  const [alertCount, setAlertCount] = useState<number>(0);
  const [dataSource, setDataSource] = useState<string>('Loading dataset...');

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedCountry = localStorage.getItem('blixxis_pref_country');
    if (savedCountry) {
      setSelectedCountry(savedCountry === 'All' ? 'All Countries' : savedCountry);
    }
    
    const savedTheme = localStorage.getItem('blixxis_dark_theme');
    if (savedTheme === 'false') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, []);

  // Initialize EnvironmentalData Service
  useEffect(() => {
    EnvironmentalDataService.initialize().then(() => {
      setDataSource(EnvironmentalDataService.getDataSourceName());
    });
  }, []);

  // Fetch initial alert count dynamically from service layer

  // Fetch initial alert count dynamically from service layer
  useEffect(() => {
    EnvironmentalDataService.getAlerts()
      .then(data => {
        // Filter alerts by country if filter is active
        let filtered = data;
        if (selectedCountry === 'India') {
          filtered = data.filter(a => a.location.includes('Delhi') || a.location.includes('Lucknow') || a.location.includes('Mumbai'));
        } else if (selectedCountry === 'Saudi Arabia') {
          filtered = data.filter(a => a.location.includes('Riyadh') || a.location.includes('Dammam') || a.location.includes('Jeddah'));
        } else if (selectedCountry === 'UAE') {
          filtered = data.filter(a => a.location.includes('Dubai') || a.location.includes('Abu Dhabi') || a.location.includes('Sharjah'));
        }
        setAlertCount(filtered.length);
      })
      .catch(err => console.error("Error loading alerts:", err));
  }, [selectedCountry]);

  // Page title mapping
  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Climate Intelligence Command Center';
      case 'map':
        return 'Spatial Pollution Map';
      case 'hotspots':
        return 'Active Regional Hotspots';
      case 'forecast':
        return 'AQI Deterioration Predictor';
      case 'citizen':
        return 'Citizen Observations Hub';
      case 'network':
        return 'Federated Scalability Architecture';
      case 'alerts':
        return 'Operational Incidents Control';
      case 'reports':
        return 'Environmental Intelligence Reports';
      case 'settings':
        return 'System Configuration Controls';
      default:
        return 'BLiXXiS Climate Intelligence';
    }
  };

  // State-based page router rendering
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            selectedCountry={selectedCountry} 
            onPageChange={setCurrentPage}
            setSelectedStationGlobal={setSelectedStationGlobal}
          />
        );
      case 'map':
        return (
          <MapView 
            selectedCountry={selectedCountry}
            setSelectedStationGlobal={setSelectedStationGlobal}
          />
        );
      case 'hotspots':
        return <Hotspots selectedCountry={selectedCountry} />;
      case 'forecast':
        return (
          <Forecast 
            selectedCountry={selectedCountry} 
            selectedStationGlobal={selectedStationGlobal}
          />
        );
      case 'citizen':
        return (
          <CitizenReports 
            selectedCountry={selectedCountry} 
            onPageChange={setCurrentPage}
            setSelectedStationGlobal={setSelectedStationGlobal}
          />
        );
      case 'network':
        return <IndiaNetwork />;
      case 'alerts':
        return (
          <Alerts 
            onPageChange={setCurrentPage} 
            setSelectedStationGlobal={setSelectedStationGlobal}
          />
        );
      case 'reports':
        return <Reports selectedCountry={selectedCountry} setSelectedStationGlobal={setSelectedStationGlobal} onPageChange={setCurrentPage} />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard 
            selectedCountry={selectedCountry} 
            onPageChange={setCurrentPage}
            setSelectedStationGlobal={setSelectedStationGlobal}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
        alertCount={alertCount}
      />

      {/* Main Panel Content Area */}
      <main className="main-content">
        <Header 
          currentPageTitle={getPageTitle()}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          dataSource={dataSource}
        />
        
        <div className="page-container">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
