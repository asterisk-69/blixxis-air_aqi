import React from 'react';
import { ShieldCheck, Database, Globe } from 'lucide-react';

interface HeaderProps {
  currentPageTitle: string;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  dataSource: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentPageTitle, 
  selectedCountry, 
  onCountryChange,
  dataSource
}) => {
  const countries = ['All Countries', 'India', 'Saudi Arabia', 'UAE'];

  return (
    <header className="header">
      {/* Title & Metadata */}
      <div>
        <h1 className="font-display" style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--color-text-main)',
          lineHeight: 1.2
        }}>
          {currentPageTitle}
        </h1>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', marginTop: '2px', display: 'block' }}>
          {selectedCountry === 'India' && 'India — realtime snapshot'}
          {selectedCountry === 'Saudi Arabia' && 'Saudi Arabia — daily observations'}
          {selectedCountry === 'UAE' && 'UAE — annual averages'}
          {selectedCountry === 'All Countries' && 'Ingested grid: India (realtime), Saudi Arabia (daily), UAE (annual averages)'}
        </span>
      </div>

      {/* Country Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-light)',
        padding: '3px',
        borderRadius: '8px'
      }}>
        {countries.map((c) => {
          const isActive = selectedCountry === c;
          const isIndia = c === 'India';
          
          return (
            <button
              key={c}
              onClick={() => onCountryChange(c)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: isActive 
                  ? 'white' 
                  : isIndia 
                    ? 'rgba(0, 210, 255, 0.7)' // Give India a slight accent color even when inactive
                    : 'var(--color-text-muted)',
                backgroundColor: isActive 
                  ? isIndia 
                    ? 'rgba(0, 210, 255, 0.15)' // Active India indicator
                    : 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
                border: isActive && isIndia 
                  ? '1px solid rgba(0, 210, 255, 0.3)' 
                  : '1px solid transparent',
                transition: 'all var(--transition-fast)',
                letterSpacing: '0.02em'
              }}
            >
              {isIndia && (
                <span style={{ 
                  marginRight: '6px', 
                  fontSize: '0.75rem',
                  display: 'inline-block',
                  verticalAlign: 'middle'
                }}>
                  🇮🇳
                </span>
              )}
              {c === 'Saudi Arabia' && <span style={{ marginRight: '6px' }}>🇸🇦</span>}
              {c === 'UAE' && <span style={{ marginRight: '6px' }}>🇦🇪</span>}
              {c === 'All Countries' && <span style={{ marginRight: '6px' }}><Globe size={11} style={{ display: 'inline-block', verticalAlign: 'middle', marginTop: '-2px' }} /></span>}
              <span style={{ verticalAlign: 'middle' }}>{c}</span>
            </button>
          );
        })}
      </div>

      {/* Right Action / System Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '0.75rem'
      }}>
        {/* Status Indicators */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          padding: '6px 12px',
          borderRadius: '6px',
          color: 'var(--color-good)'
        }}>
          <ShieldCheck size={14} />
          <span style={{ fontWeight: 600 }}>AI Core Online</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: dataSource.includes('Mock') ? 'rgba(245, 158, 11, 0.05)' : 'rgba(0, 210, 255, 0.05)',
          border: dataSource.includes('Mock') ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(0, 210, 255, 0.15)',
          padding: '6px 12px',
          borderRadius: '6px',
          color: dataSource.includes('Mock') ? 'var(--color-moderate)' : 'var(--color-primary)'
        }}>
          <Database size={14} />
          <span style={{ fontWeight: 600 }}>{dataSource}</span>
        </div>
      </div>
    </header>
  );
};
