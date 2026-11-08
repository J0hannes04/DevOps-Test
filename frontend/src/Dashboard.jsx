import { useEffect, useState } from 'react';
import {
  Clock3,
  CreditCard,
  EyeOff,
  FileKey2,
  HeartPulse,
  KeyRound,
  LockKeyhole,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const categories = [
  { id: 'identity', label: 'Identity', description: 'Ausweise und persönliche Dokumente', icon: UserRoundCheck, color: 'blue', count: 0 },
  { id: 'finance', label: 'Finance', description: 'Bankdaten und Finanzinformationen', icon: CreditCard, color: 'green', count: 0 },
  { id: 'health', label: 'Health', description: 'Gesundheitsdaten und wichtige Unterlagen', icon: HeartPulse, color: 'pink', count: 0 },
  { id: 'keys', label: 'Keys', description: 'Lizenzen, Zugangsdaten und Recovery-Codes', icon: KeyRound, color: 'purple', count: 0 },
];

function Dashboard() {
  const navigate = useNavigate();
  const [currentUsername, setCurrentUsername] = useState(
    () => localStorage.getItem('username') || sessionStorage.getItem('username') || ''
  );
  const [newUsername, setNewUsername] = useState(
    () => localStorage.getItem('username') || sessionStorage.getItem('username') || ''
  );
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');
  const [activeCategory, setActiveCategory] = useState('identity');
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!currentUsername) navigate('/');
  }, [currentUsername, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('username');
    sessionStorage.removeItem('username');
    navigate('/');
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUsername, newUsername, newEmail }),
      });
      const text = await response.text();

      if (!response.ok) {
        setMessage(`Fehler: ${text}`);
        return;
      }

      localStorage.setItem('username', newUsername);
      setCurrentUsername(newUsername);
      setMessage('Profil erfolgreich aktualisiert!');
    } catch {
      setMessage('Netzwerkfehler: Backend nicht erreichbar.');
    }
  };

  const activeCategoryData = categories.find((category) => category.id === activeCategory);

  return (
    <div className="vault-container">
      <header className="vault-header">
        <div className="vault-brand">
          <div className="vault-brand-icon"><ShieldCheck size={23} /></div>
          <span>Secure Vault</span>
        </div>
        <div className="vault-user-menu">
          <button className="header-icon-btn" onClick={() => setShowProfile(!showProfile)} aria-label="Profil öffnen">
            <UserRound size={18} />
          </button>
          <span>{currentUsername}</span>
          <button className="vault-logout-btn" onClick={handleLogout}><LogOut size={16} /> Abmelden</button>
        </div>
      </header>

      <main className="vault-main">
        <section className="vault-welcome">
          <div>
            <p className="vault-eyebrow">PRIVATE SPACE</p>
            <h1>Dein sicherer Tresor</h1>
            <p className="vault-subtitle">Organisiere sensible Informationen an einem privaten Ort.</p>
          </div>
          <div className={`vault-state ${isVaultUnlocked ? 'is-unlocked' : ''}`}>
            <LockKeyhole size={18} />
            <span>{isVaultUnlocked ? 'Tresor geöffnet' : 'Tresor gesperrt'}</span>
          </div>
        </section>

        <section className="vault-hero-card">
          <div className="vault-hero-icon"><ShieldCheck size={36} /></div>
          <div className="vault-hero-copy">
            <p className="vault-eyebrow">ZERO-KNOWLEDGE VAULT</p>
            <h2>{isVaultUnlocked ? 'Dein Tresor ist bereit.' : 'Deine Daten bleiben privat.'}</h2>
            <p>
              {isVaultUnlocked
                ? 'Wähle eine Kategorie aus oder lege deinen ersten Eintrag an.'
                : 'Entsperre den Tresor, um deine verschlüsselten Kategorien zu verwalten.'}
            </p>
          </div>
          <button className="vault-primary-btn" onClick={() => setIsVaultUnlocked(!isVaultUnlocked)}>
            <LockKeyhole size={17} />
            {isVaultUnlocked ? 'Tresor sperren' : 'Tresor öffnen'}
          </button>
        </section>

        <div className="vault-section-heading">
          <div>
            <h2>Deine Safes</h2>
            <p>Strukturiere deine sensiblen Daten nach Kategorien.</p>
          </div>
          <button className="vault-secondary-btn" disabled={!isVaultUnlocked}>
            <Plus size={17} /> Neuer Eintrag
          </button>
        </div>

        <section className="safe-grid">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                className={`safe-card ${isActive ? 'active' : ''}`}
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                <div className={`safe-icon ${category.color}`}><Icon size={22} /></div>
                <div className="safe-card-copy">
                  <h3>{category.label}</h3>
                  <p>{category.description}</p>
                </div>
                <span className="safe-count">{category.count}</span>
              </button>
            );
          })}
        </section>

        <section className="vault-content-grid">
          <article className="vault-panel">
            <div className="vault-panel-heading">
              <div>
                <p className="vault-eyebrow">SELECTED SAFE</p>
                <h2>{activeCategoryData.label}</h2>
              </div>
              <FileKey2 size={22} />
            </div>
            <div className="empty-safe">
              <div className="empty-safe-icon"><EyeOff size={25} /></div>
              <h3>Noch keine Einträge</h3>
              <p>In diesem Safe wurden noch keine verschlüsselten Daten abgelegt.</p>
              <button className="vault-primary-btn" disabled={!isVaultUnlocked}><Plus size={17} /> Eintrag hinzufügen</button>
            </div>
          </article>

          <aside className="vault-panel security-panel">
            <div className="vault-panel-heading"><h2>Sicherheitsstatus</h2><ShieldCheck size={21} /></div>
            <div className="security-row"><span><LockKeyhole size={16} /> Tresorstatus</span><strong className={isVaultUnlocked ? 'green-text' : 'yellow-text'}>{isVaultUnlocked ? 'Geöffnet' : 'Gesperrt'}</strong></div>
            <div className="security-row"><span><Clock3 size={16} /> Auto-Lock</span><strong>2 Minuten</strong></div>
            <div className="security-row"><span><EyeOff size={16} /> Klartext auf Server</span><strong className="green-text">Nein</strong></div>
            <p className="security-note">Dein Master-Passwort soll den Browser nicht verlassen.</p>
          </aside>
        </section>

        {showProfile && (
          <section className="vault-panel profile-panel">
            <div className="vault-panel-heading"><h2><Settings size={19} /> Profil</h2></div>
            <form className="profile-form" onSubmit={handleProfileUpdate} autoComplete="off">
              <label>Benutzername<input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" required /></label>
              <label>Neue E-Mail-Adresse<input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} maxLength={254} placeholder="Optional" /></label>
              <button className="vault-primary-btn" type="submit">Speichern</button>
            </form>
            {message && <p className="form-message">{message}</p>}
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
