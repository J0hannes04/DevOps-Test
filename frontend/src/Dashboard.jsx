import { useEffect, useMemo, useState } from 'react';
import {
  Activity, CreditCard, Eye, EyeOff, FileText, Key, LayoutGrid, Lock,
  LogOut, MoreVertical, Plus, Search, Shield, User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getCsrfToken } from './api';
import { decryptVaultPayload, deriveVaultKey, encryptVerifier, encryptVaultPayload } from './crypto';
import './Dashboard.css';

const navigationCategories = [
  { name: 'All Items', icon: LayoutGrid },
  { name: 'Passwords', icon: Key },
  { name: 'Financial', icon: CreditCard },
  { name: 'Identity & Docs', icon: FileText },
  { name: 'Security Audit', icon: Activity },
];

const VAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function Dashboard() {
  const navigate = useNavigate();
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [vaultKey, setVaultKey] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [masterPasswordConfirmation, setMasterPasswordConfirmation] = useState('');
  const [isVaultInitialized, setIsVaultInitialized] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [items, setItems] = useState([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [entry, setEntry] = useState({ title: '', category: 'Passwords', secret: '' });
  const [revealedId, setRevealedId] = useState(null);

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
        setNewEmail(user.email);

        const configResponse = await apiFetch('/api/vault/config');
        if (!configResponse.ok) {
          throw new Error('Vault-Konfiguration konnte nicht geladen werden.');
        }
        const config = await configResponse.json();
        setIsVaultInitialized(Boolean(config.verifier));
      } catch {
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    loadCurrentUser();
  }, [navigate]);

  const handleLogout = () => {
    setVaultKey(null);
    setItems([]);
    apiFetch('/api/auth/logout', { method: 'POST' }).finally(() => navigate('/'));
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
      setMessage('Profil erfolgreich aktualisiert!');
    } catch {
      setMessage('Netzwerkfehler: Backend nicht erreichbar.');
    }
  };

  const unlockVault = async (event) => {
    event.preventDefault();
    setUnlockError('');
    try {
      const configResponse = await apiFetch('/api/vault/config');
      if (configResponse.status === 401) {
        navigate('/');
        return;
      }
      if (!configResponse.ok) throw new Error('Vault-Konfiguration konnte nicht geladen werden.');
      const config = await configResponse.json();
      setIsVaultInitialized(Boolean(config.verifier));
      if (!config.verifier && masterPassword !== masterPasswordConfirmation) {
        throw new Error('Die Master-Passwörter stimmen nicht überein.');
      }
      const key = await deriveVaultKey(masterPassword, config.salt);
      if (config.verifier) {
        const verifier = await decryptVaultPayload(key, {
          ciphertext: config.verifier,
          iv: config.verifierIv,
        });
        if (verifier.verifier !== 'secure-vault-verifier-v1') {
          throw new Error('Master-Passwort ist falsch.');
        }
      } else {
        const verifier = await encryptVerifier(key);
        const saveResponse = await apiFetch('/api/vault/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verifier: verifier.ciphertext, verifierIv: verifier.iv }),
        });
        if (!saveResponse.ok) throw new Error('Vault konnte nicht initialisiert werden.');
      }
      const itemsResponse = await apiFetch('/api/vault/items');
      if (itemsResponse.status === 401) {
        navigate('/');
        return;
      }
      if (!itemsResponse.ok) throw new Error('Vault-Einträge konnten nicht geladen werden.');
      const encryptedItems = await itemsResponse.json();
      const decryptedItems = [];
      for (const item of encryptedItems) {
        try {
          decryptedItems.push({ ...item, ...(await decryptVaultPayload(key, item)) });
        } catch {
          throw new Error('Master-Passwort ist falsch oder ein Eintrag ist beschädigt.');
        }
      }
      setVaultKey(key);
      setItems(decryptedItems);
      setMasterPassword('');
      setMasterPasswordConfirmation('');
    } catch (error) {
      setUnlockError(error.message);
    }
  };

  const lockVault = () => {
    setVaultKey(null);
    setItems([]);
    setRevealedId(null);
    setMasterPassword('');
    setMasterPasswordConfirmation('');
  };

  useEffect(() => {
    if (!vaultKey) return undefined;

    let timeoutId;
    const resetIdleTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setVaultKey(null);
        setItems([]);
        setRevealedId(null);
      }, VAULT_IDLE_TIMEOUT_MS);
    };
    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer);
    });
    resetIdleTimer();

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [vaultKey]);

  const createEntry = async (event) => {
    event.preventDefault();
    try {
      const encrypted = await encryptVaultPayload(vaultKey, {
        title: entry.title,
        secret: entry.secret,
      });
      const response = await apiFetch('/api/vault/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: entry.category, ...encrypted }),
      });
      if (!response.ok) throw new Error('Eintrag konnte nicht gespeichert werden.');
      const saved = await response.json();
      setItems((current) => [...current, { ...saved, ...entry }]);
      setEntry({ title: '', category: 'Passwords', secret: '' });
      setShowNewEntry(false);
    } catch (error) {
      setMessage(`Fehler: ${error.message}`);
    }
  };

  const filteredItems = useMemo(() => items.filter((item) => {
    const categoryMatches = activeCategory === 'All Items' || item.category === activeCategory;
    const searchMatches = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatches && searchMatches;
  }), [activeCategory, items, searchQuery]);

  if (isLoading) return <div className="vault-loading">Loading Secure Vault...</div>;

  return (
    <div className="vault-shell">
      <aside className="vault-sidebar">
        <div className="vault-logo"><div className="vault-logo-icon"><Shield size={20} /></div><span>Secure Vault</span></div>
        <nav className="vault-navigation" aria-label="Vault-Kategorien">
          <p className="navigation-label">Categories</p>
          {navigationCategories.map((category) => {
            const Icon = category.icon;
            return <button className={`navigation-item ${activeCategory === category.name ? 'active' : ''}`} key={category.name} onClick={() => setActiveCategory(category.name)} type="button"><Icon size={19} /><span>{category.name}</span></button>;
          })}
        </nav>
        <div className="storage-card"><div className="storage-heading"><span>Encrypted Storage</span><span>{items.length}</span></div><div className="storage-track"><div className="storage-progress" style={{ width: `${Math.min(items.length * 10, 100)}%` }} /></div><p>Nur verschlüsselte Daten werden gespeichert.</p></div>
      </aside>

      <main className="vault-content">
        <header className="vault-topbar">
          <div className="vault-search"><Search size={19} /><input type="search" placeholder="Search encrypted vault..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label="Tresor durchsuchen" /><span className="local-indicator"><Lock size={12} /> Local</span></div>
          <div className="vault-profile"><div className="profile-name"><strong>{currentUsername}</strong><span>Personal Vault</span></div><button className="profile-button" onClick={() => setShowProfile(!showProfile)} type="button" aria-label="Profil öffnen" aria-expanded={showProfile}><User size={19} /></button></div>
          {showProfile && <section className="profile-panel"><div className="profile-panel-heading"><div><p className="profile-eyebrow">ACCOUNT</p><h2>Profile</h2></div><button className="logout-button" onClick={handleLogout} type="button"><LogOut size={16} /> Sign out</button></div><form className="profile-form" onSubmit={handleProfileUpdate} autoComplete="off"><label>Username<input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} minLength={3} maxLength={50} pattern="[a-zA-Z0-9._\-]+" required /></label><label>New email address<input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} maxLength={254} required /></label><button className="primary-button" type="submit">Save changes</button></form>{message && <p className="form-message">{message}</p>}</section>}
        </header>

        <div className="vault-page">
          {!vaultKey ? (
            <section className="unlock-card"><div className="empty-icon"><Lock size={27} /></div><h1>{isVaultInitialized ? 'Unlock your vault' : 'Set up your vault'}</h1><p>Your master password stays in this browser and is never sent to the server.</p><form onSubmit={unlockVault}><input type="password" placeholder="Master password" value={masterPassword} onChange={(event) => setMasterPassword(event.target.value)} minLength={8} required autoComplete="off" />{!isVaultInitialized && <input type="password" placeholder="Confirm master password" value={masterPasswordConfirmation} onChange={(event) => setMasterPasswordConfirmation(event.target.value)} minLength={8} required autoComplete="off" />}<button className="primary-button" type="submit"><Lock size={18} /> {isVaultInitialized ? 'Unlock Vault' : 'Create Vault Key'}</button></form>{unlockError && <p className="form-error">{unlockError}</p>}</section>
          ) : (
            <>
              <div className="vault-page-heading"><div><h1>{activeCategory}</h1><p>Your decrypted entries exist only while the vault is unlocked.</p></div><div className="heading-actions"><button className="secondary-button" type="button" onClick={lockVault}><Lock size={17} /> Lock</button><button className="primary-button" type="button" onClick={() => setShowNewEntry(true)}><Plus size={18} /> New Entry</button></div></div>
              {filteredItems.length > 0 ? <div className="vault-item-grid">{filteredItems.map((item) => <article className="vault-item-card" key={item.id}><div className="item-card-heading"><div><h2>{item.title}</h2><span>{item.category}</span></div><button type="button" aria-label="Eintrag öffnen"><MoreVertical size={19} /></button></div><div className="item-secret"><code>{revealedId === item.id ? item.secret : '••••••••••••••••'}</code><button type="button" onClick={() => setRevealedId(revealedId === item.id ? null : item.id)} aria-label="Geheimnis anzeigen">{revealedId === item.id ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></article>)}</div> : <section className="vault-empty-state"><div className="empty-icon"><EyeOff size={27} /></div><h2>No entries found</h2><p>Your encrypted vault is ready for its first entry.</p><button className="primary-button" type="button" onClick={() => setShowNewEntry(true)}><Plus size={18} /> New Entry</button></section>}
            </>
          )}
          {showNewEntry && <div className="entry-overlay"><section className="entry-modal"><div className="profile-panel-heading"><div><p className="profile-eyebrow">ENCRYPTED ENTRY</p><h2>New Entry</h2></div><button className="modal-close" type="button" onClick={() => setShowNewEntry(false)}>×</button></div><form onSubmit={createEntry}><label>Title<input value={entry.title} onChange={(event) => setEntry({ ...entry, title: event.target.value })} maxLength={120} required /></label><label>Category<select value={entry.category} onChange={(event) => setEntry({ ...entry, category: event.target.value })}>{navigationCategories.slice(1, 4).map((category) => <option key={category.name}>{category.name}</option>)}</select></label><label>Secret or private note<textarea value={entry.secret} onChange={(event) => setEntry({ ...entry, secret: event.target.value })} maxLength={10000} required /></label><button className="primary-button" type="submit">Encrypt and save</button></form></section></div>}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
