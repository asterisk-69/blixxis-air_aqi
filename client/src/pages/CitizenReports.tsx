import React, { useState, useEffect } from 'react';
import type { CitizenReport, EnvironmentalStation } from '../types/environmental';
import { EnvironmentalDataService } from '../services/environmentalData';
import { Camera, MapPin, CheckCircle, BrainCircuit, UploadCloud, Link } from 'lucide-react';

interface CitizenReportsProps {
  selectedCountry: string;
  onPageChange: (page: string) => void;
  setSelectedStationGlobal: (st: EnvironmentalStation | null) => void;
}

export const CitizenReports: React.FC<CitizenReportsProps> = ({
  selectedCountry,
  onPageChange,
  setSelectedStationGlobal
}) => {
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<CitizenReport['aiAnalysis'] | null>(null);
  const [linkedStation, setLinkedStation] = useState<string | undefined>(undefined);

  // Pre-seed search to map nearby station
  const [stations, setStations] = useState<EnvironmentalStation[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      EnvironmentalDataService.getCitizenReports(),
      EnvironmentalDataService.getStations({ country: selectedCountry })
    ]).then(([repData, stData]) => {
      setReports(repData);
      setStations(stData);
      setLoading(false);
    }).catch(console.error);
  }, [selectedCountry]);

  // Handle mock image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Mock Gemini Vision Analysis trigger
  const handleAnalyzeAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !location) return;

    setSubmitting(true);
    setCurrentAnalysis(null);

    // Simulate backend upload + Gemini analysis (Phase 7 wrapper)
    setTimeout(() => {
      // Find a nearby station deterministically based on location keywords
      let matchedStationId = 'in-delhi-anand-vihar';
      if (location.toLowerCase().includes('mumbai')) matchedStationId = 'in-mumbai-bandra';
      else if (location.toLowerCase().includes('dubai')) matchedStationId = 'ae-dubai-jebel-ali';
      else if (location.toLowerCase().includes('riyadh')) matchedStationId = 'sa-riyadh-al-olaya';
      else if (stations.length > 0) matchedStationId = stations[0].id;
      
      const mockAnalysis: CitizenReport['aiAnalysis'] = {
        pollution_indicator: true,
        indicator_type: "visible smoke/haze plume",
        possible_source: description.toLowerCase().includes('trash') || description.toLowerCase().includes('waste') 
          ? "open-air municipal waste incineration" 
          : "industrial fuel burning or generator combustion",
        severity: "high",
        confidence: 0.89,
        recommended_verification: "Inspect local sensor nodes and dispatch municipal monitoring vehicle to verify particulate emissions."
      };

      const newReport: Omit<CitizenReport, 'id' | 'timestamp'> = {
        location,
        description,
        imageUrl: imagePreview,
        aiAnalysis: mockAnalysis,
        linkedStationId: matchedStationId
      };

      EnvironmentalDataService.submitCitizenReport(newReport)
        .then((addedReport) => {
          setReports([addedReport, ...reports]);
          setCurrentAnalysis(mockAnalysis);
          setLinkedStation(matchedStationId);
          setSubmitting(false);
          
          // Clear form fields
          setLocation('');
          setDescription('');
          setImageFile(null);
        })
        .catch(() => setSubmitting(false));

    }, 2000);
  };

  // Connect report to nearby station and open it in Dashboard
  const handleConnectNearbyAQI = (stationId?: string) => {
    if (!stationId) return;
    EnvironmentalDataService.getStationById(stationId)
      .then((st) => {
        if (st) {
          setSelectedStationGlobal(st);
          onPageChange('dashboard');
        }
      });
  };

  return (
    <div style={{ display: 'flex', gap: '20px', width: '100%', alignItems: 'flex-start' }}>
      
      {/* Left Column: Form and AI Analysis */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Form Panel */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main)' }}>
            <Camera size={18} className="text-primary" />
            File Environmental Complaint
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: '16px' }}>
            Submit a photograph showing visual smoke, haze, or industrial emissions. Gemini will analyze the visual context.
          </p>

          <form onSubmit={handleAnalyzeAndSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                LOCATION / METROPOLITAN AREA
              </label>
              <input
                type="text"
                placeholder="e.g. Anand Vihar Road, New Delhi"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(6, 9, 14, 0.85)',
                  border: '1px solid var(--border-light)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  outline: 'none',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                DESCRIPTION OF OBSERVATION
              </label>
              <textarea
                placeholder="Describe the density, source type, or odor (e.g. burning tires, thick dark plume)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  height: '60px',
                  backgroundColor: 'rgba(6, 9, 14, 0.85)',
                  border: '1px solid var(--border-light)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  outline: 'none',
                  fontSize: '0.8rem',
                  resize: 'none'
                }}
              />
            </div>

            {/* Photo Uploader */}
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                PROTOTYPE PHOTOGRAPH ATTACHMENT
              </label>
              <div style={{
                border: '1px dashed var(--border-light)',
                borderRadius: '6px',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.1)',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <UploadCloud size={28} className="text-dark" style={{ margin: '0 auto 6px auto' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                  {imageFile ? imageFile.name : "Click to select a local picture"}
                </span>
              </div>
            </div>

            {imagePreview && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <div style={{ width: '120px', height: '90px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dark)' }}>ATTACHMENT ATTACHED</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Image ready for Gemini extraction</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !imagePreview || !location}
              style={{ justifyContent: 'center', marginTop: '8px' }}
            >
              {submitting ? "Analyzing visuals with Gemini..." : "Submit and Run Gemini Vision"}
            </button>
          </form>
        </div>

        {/* AI Analysis Result Board */}
        {submitting && (
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid rgba(0, 210, 255, 0.2)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Gemini is extracting particulate features...</span>
          </div>
        )}

        {currentAnalysis && (
          <div className="glass-panel glass-panel-glow" style={{ padding: '20px', borderLeft: '4px solid var(--color-primary)' }}>
            <h3 className="font-display" style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <BrainCircuit size={18} />
              Gemini Vision Analysis Output
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginTop: '16px'
            }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Pollution Detected?</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-good)', marginTop: '2px' }}>
                  <CheckCircle size={14} />
                  <span>YES ({Math.round(currentAnalysis.confidence * 100)}% confidence)</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Indicator</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px' }}>
                  {currentAnalysis.indicator_type}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Potential Source</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px' }}>
                  {currentAnalysis.possible_source}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Visual Severity</span>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'white',
                  backgroundColor: 'var(--color-very-poor)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginTop: '4px',
                  display: 'inline-block'
                }}>
                  {currentAnalysis.severity.toUpperCase()}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', textTransform: 'uppercase', fontWeight: 600 }}>Recommended Verification Step</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                {currentAnalysis.recommended_verification}
              </p>
            </div>

            {linkedStation && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleConnectNearbyAQI(linkedStation)}
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  <Link size={14} />
                  Connect Report to Nearby AQI Station
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Historical Citizen Reports Feed */}
      <div style={{ width: '380px', flexShrink: 0 }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '380px' }}>
          <h3 className="font-display" style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.05em',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '8px'
          }}>
            Citizen Reports Feed
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
            maxHeight: '440px'
          }}>
            {loading ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)' }}>Loading feeds...</div>
            ) : reports.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)' }}>No public entries recorded.</div>
            ) : (
              reports.map((rep) => (
                <div key={rep.id} className="glass-panel" style={{ padding: '10px', backgroundColor: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={rep.imageUrl} alt="Incident" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={10} className="text-primary" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{rep.location}</span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', lineClamp: 2 }}>
                        {rep.description}
                      </p>
                    </div>
                  </div>
                  
                  {rep.aiAnalysis && (
                    <div style={{
                      marginTop: '8px',
                      backgroundColor: 'rgba(0,210,255,0.03)',
                      border: '1px solid rgba(0,210,255,0.08)',
                      padding: '6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>AI Extraction: <strong>{rep.aiAnalysis.indicator_type}</strong></span>
                      <button 
                        onClick={() => handleConnectNearbyAQI(rep.linkedStationId)}
                        style={{ color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}
                      >
                        Check AQI &rarr;
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
