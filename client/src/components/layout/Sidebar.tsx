import React from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Flame, 
  TrendingUp, 
  Users, 
  Network, 
  Bell, 
  Settings, 
  FileSpreadsheet,
  Wind
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  alertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, alertCount }) => {
  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
    disabled?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Map View', icon: MapIcon },
    { id: 'hotspots', label: 'Hotspots', icon: Flame },
    { id: 'forecast', label: 'Forecast', icon: TrendingUp },
    { id: 'citizen', label: 'Citizen Reports', icon: Users },
    { id: 'network', label: 'India Network', icon: Network },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alertCount },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Logo Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          backgroundColor: 'rgba(0, 210, 255, 0.1)',
          border: '1px solid var(--color-primary)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--glow-electric)'
        }}>
          <Wind size={20} className="text-primary" />
        </div>
        <div>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-display)',
            display: 'block'
          }} className="text-gradient">
            BLiXXiS
          </span>
          <span style={{
            fontSize: '0.65rem',
            color: 'var(--color-text-dark)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 700,
            display: 'block',
            marginTop: '2px'
          }}>
            Climate Intelligence
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav style={{
        flexGrow: 1,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => !item.disabled && onPageChange(item.id)}
              disabled={item.disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 14px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: item.disabled 
                  ? 'var(--color-text-dark)' 
                  : isActive 
                    ? 'var(--color-primary)' 
                    : 'var(--color-text-muted)',
                backgroundColor: isActive 
                  ? 'rgba(0, 210, 255, 0.08)' 
                  : 'transparent',
                border: '1px solid',
                borderColor: isActive 
                  ? 'rgba(0, 210, 255, 0.15)' 
                  : 'transparent',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-fast)',
                textAlign: 'left'
              }}
              className={!isActive && !item.disabled ? 'sidebar-item-hover' : ''}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} style={{
                  color: isActive ? 'var(--color-primary)' : 'inherit',
                  flexShrink: 0
                }} />
                <span>{item.label}</span>
              </div>
              
              {/* Badge/Count */}
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{
                  backgroundColor: 'var(--color-very-poor)',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  lineHeight: 1
                }}>
                  {item.badge}
                </span>
              )}

              {item.disabled && (
                <span style={{
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-dark)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontWeight: 600
                }}>
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-light)',
        fontSize: '0.75rem',
        color: 'var(--color-text-dark)',
        backgroundColor: 'rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Federated Hub</span>
          <span style={{ color: 'var(--color-good)', fontWeight: 600 }}>Active</span>
        </div>
        <div>v1.0.0-prototype</div>
      </div>

      {/* Internal hover style injected for simplicity */}
      <style>{`
        .sidebar-item-hover:hover {
          background-color: rgba(255, 255, 255, 0.03) !important;
          color: var(--color-text-main) !important;
        }
      `}</style>
    </aside>
  );
};
