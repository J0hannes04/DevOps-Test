import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CreditCard,
  EyeOff,
  FileText,
  Key,
  LayoutGrid,
  Lock,
  LogOut,
  MoreVertical,
  Plus,
  Search,
  Shield,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getCsrfToken } from './api';
import './Dashboard.css';

const navigationCategories = [
  { name: 'All Items', icon: LayoutGrid },
  { name: 'Passwords', icon: Key },
  { name: 'Financial', icon: CreditCard },
  { name: 'Identity & Docs', icon: FileText },
  { name: 'Security Audit', icon: Activity },
];

function Dashboard() {
  const navigate = useNavigate();
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        await getCsrfToken();
        const response = await apiFetch('/api/auth/me');
        if (!response.ok) {
          navigate('/');
          return;
        }
        const user = await response.json();
        setCurrentUsername(user.username);
        setNewUsername(user.username);
        setCurrentEmail(user.email);
        setNewEmail(user.email);
      } catch {
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    loadCurrentUser();
  }, [navigate]);

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' })
      .finally(() => navigate('/'));
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const response = await apiFetch('/api/auth/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername, newEmail }),
      });
      const text = await response.text();

      if (!response.ok) {
        setMessage(`Fehler: ${text}`);
        return;
      }

      setCurrentUsername(newUsername);
      setCurrentEmail(newEmail || currentEmail);
      setMessage('Profil erfolgreich aktualisiert!');
    } catch {
      setMessage('Netzwerkfehler: Backend nicht erreichbar.');
    }
  };

  const filteredItems = useMemo(() => {
    // Vault items will be loaded from the encrypted vault API in a later step.
    const vaultItems = [];
    return vaultItems.filter((item) => {
      const matchesCategory = activeCategory === 'All Items' || item.category === activeCategory;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  if (isLoading) {
    return <div className="vault-loading">Loading Secure Vault...</div>;
  }

  return (
    <div className="vault-shell">
      <aside className="vault-sidebar">
        <div className="vault-logo">
          <div className="vault-logo-icon"><Shield size={20} /></div>
          <span>Secure Vault</span>
        </div>

        <nav className="vault-navigation" aria-label="Vault-Kategorien">
          <p className="navigation-label">Categories</p>
          {navigationCategories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.name;
            return (
              <button
                className={`navigation-item ${isActive ? 'active' : ''}`}
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                type="button"
              >
                <Icon size={19} />
                <span>{category.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="storage-card">
          <div className="storage-heading">
            <span>Encrypted Storage</span>
            <span>--</span>
          </div>
          <div className="storage-track"><div className="storage-progress" /></div>
          <p>Wird nach der Einrichtung angezeigt.</p>
        </div>
      </aside>

      <main className="vault-content">
        <header className="vault-topbar">
          <div className="vault-search">
            <Search size={19} />
            <input
              type="search"
              placeholder="Search encrypted vault..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Tresor durchsuchen"
            />
            <span className="local-indicator"><Lock size={12} /> Local</span>
          </div>

          <div className="vault-profile">
            <div className="profile-name">
              <strong>{currentUsername}</strong>
              <span>Personal Vault</span>
            </div>
            <button
              className="profile-button"
              onClick={() => setShowProfile(!showProfile)}
              type="button"
              aria-label="Profil öffnen"
              aria-expanded={showProfile}
            >
              <User size={19} />
            </button>
          </div>
          {showProfile && (
            <section className="profile-panel">
              <div className="profile-panel-heading">
                <div>
                  <p className="profile-eyebrow">ACCOUNT</p>
                  <h2>Profile</h2>
                </div>
                <button className="logout-button" onClick={handleLogout} type="button">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
              <form className="profile-form" onSubmit={handleProfileUpdate} autoComplete="off">
                <label>
                  Username
                  <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} minLength={3} maxLength={50} pattern="[a-zA-Z0-9._\-]+" required />
                </label>
                <label>
                  New email address
                  <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} maxLength={254} placeholder="Optional" />
                </label>
                <button className="primary-button" type="submit">Save changes</button>
              </form>
              {message && <p className="form-message">{message}</p>}
            </section>
          )}
        </header>

        <div className="vault-page">
          <div className="vault-page-heading">
            <div>
              <h1>{activeCategory}</h1>
              <p>Securely manage and view your private data.</p>
            </div>
            <button className="primary-button" type="button" disabled>
              <Plus size={18} /> New Entry
            </button>
          </div>

          {filteredItems.length > 0 ? (
            <div className="vault-item-grid">
              {filteredItems.map((item) => (
                <article className="vault-item-card" key={item.id}>
                  <div className="item-card-heading">
                    <div>
                      <h2>{item.title}</h2>
                      <span>{item.category}</span>
                    </div>
                    <button type="button" aria-label="Eintrag öffnen"><MoreVertical size={19} /></button>
                  </div>
                  <div className="item-secret"><code>{item.secret}</code><EyeOff size={16} /></div>
                </article>
              ))}
            </div>
          ) : (
            <section className="vault-empty-state">
              <div className="empty-icon"><EyeOff size={27} /></div>
              <h2>No entries found</h2>
              <p>Your encrypted vault is ready for its first entry.</p>
              <button className="primary-button" type="button" disabled>
                <Plus size={18} /> New Entry
              </button>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

export default Dashboard;
