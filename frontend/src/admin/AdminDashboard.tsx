import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProtocol, getCatalogs, ProtocolData, CatalogsData } from '../api/admin';
import { ADMIN_TOKEN_KEY, ADMIN_AUTH_EXPIRED_EVENT } from '../api/client';
import { AdminPasscodeModal } from './AdminPasscodeModal';
import { ProtocolConfigTab } from './ProtocolConfigTab';
import { LiveSessionMonitorTab } from './LiveSessionMonitorTab';
import { DataExportsTab } from './DataExportsTab';
import './admin.css';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem(ADMIN_TOKEN_KEY);
  });

  // Any admin request rejected with 401 sends the researcher back to the passcode screen
  useEffect(() => {
    const onExpired = () => setIsAuthenticated(false);
    window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const [activeTab, setActiveTab] = useState<'protocol' | 'sessions' | 'exports'>('protocol');
  const [protocol, setProtocol] = useState<ProtocolData | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [protoData, catData] = await Promise.all([
        getProtocol(),
        getCatalogs()
      ]);
      setProtocol(protoData);
      setCatalogs(catData);
    } catch (err: any) {
      setError(err.message || 'Failed to load protocol data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminPasscodeModal onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="admin-layout">
      {/* Top Admin Header */}
      <header className="admin-header">
        <div className="admin-header-title">
          <span>🏛️ Spatial Learning Platform</span>
          <span className="admin-badge">Researcher Console</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            ← View Student Platform
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '0.4rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              background: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Lock Console 🔒
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'protocol' ? 'active' : ''}`}
          onClick={() => setActiveTab('protocol')}
        >
          ⚙️ Study Protocol & Tasks
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          📊 Live Session Monitor
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'exports' ? 'active' : ''}`}
          onClick={() => setActiveTab('exports')}
        >
          📥 Research Data Exports
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="admin-content">
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading platform configuration...
          </div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {!loading && activeTab === 'protocol' && protocol && catalogs && (
          <ProtocolConfigTab
            protocol={protocol}
            catalogs={catalogs}
            onProtocolUpdated={(updated) => setProtocol(updated)}
          />
        )}

        {!loading && activeTab === 'sessions' && (
          <LiveSessionMonitorTab />
        )}

        {!loading && activeTab === 'exports' && (
          <DataExportsTab />
        )}
      </main>
    </div>
  );
}
