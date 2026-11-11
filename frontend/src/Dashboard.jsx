import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, CreditCard, Eye, EyeOff, FileText,
  Key, LayoutGrid, Lock, LogOut, MoreVertical, Plus, Search, Shield, User, WandSparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createWorker } from 'tesseract.js';
import { apiFetch, getCsrfToken } from './api';
import { decryptVaultPayload, deriveVaultKey, encryptVerifier, encryptVaultPayload } from './crypto';
import PasswordGenerator from './PasswordGenerator';
import './Dashboard.css';

const navigationCategories = [
  { name: 'All Items', icon: LayoutGrid },
  { name: 'Passwords', icon: Key },
  { name: 'Financial', icon: CreditCard },
  { name: 'Identity & Docs', icon: FileText },
  { name: 'Security Audit', icon: Activity },
];

const VAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const createEmptyEntry = (category = 'Passwords') => ({
  title: '',
  category,
  username: '',
  website: '',
  cardNumber: '',
  expiryDate: '',
  cvv: '',
  cardholderName: '',
  secret: '',
  firstName: '',
  lastName: '',
  documentNumber: '',
  documentData: '',
  documentMimeType: '',
});

const isWeakSecret = (secret) => {
  const normalizedSecret = secret.trim().toLowerCase();
  const commonSecrets = ['password', 'passwort', '123456', 'qwerty', 'letmein', 'welcome'];
  return normalizedSecret.length < 12
    || commonSecrets.some((commonSecret) => normalizedSecret.includes(commonSecret));
};

const getItemPreview = (item) => item.secret || item.cardNumber || item.username || '';

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
  const [editingItem, setEditingItem] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showInlineGenerator, setShowInlineGenerator] = useState(false);
  const [entry, setEntry] = useState(createEmptyEntry());
  const [revealedId, setRevealedId] = useState(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [entryError, setEntryError] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const ocrWorkerRef = useRef(null);

  useEffect(() => () => {
    if (documentPreviewUrl && documentPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(documentPreviewUrl);
    if (ocrWorkerRef.current) ocrWorkerRef.current.terminate();
  }, [documentPreviewUrl]);

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
    setEntry(createEmptyEntry());
    setShowNewEntry(false);
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
    setEntry(createEmptyEntry());
    setShowNewEntry(false);
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
        setEntry(createEmptyEntry());
        setShowNewEntry(false);
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
    setEntryError('');
    setIsSavingEntry(true);
    try {
      const encrypted = await encryptVaultPayload(vaultKey, {
        title: entry.title,
        ...(entry.category === 'Financial'
          ? {
            cardNumber: entry.cardNumber,
            expiryDate: entry.expiryDate,
            cvv: entry.cvv,
            cardholderName: entry.cardholderName,
          }
          : entry.category === 'Identity & Docs'
            ? {
              firstName: entry.firstName,
              lastName: entry.lastName,
              documentNumber: entry.documentNumber,
              expiryDate: entry.expiryDate,
              documentData: entry.documentData,
              documentMimeType: entry.documentMimeType,
            }
            : {
            username: entry.username,
            website: entry.website,
            secret: entry.secret,
            }),
      });
      const response = await apiFetch(
        editingItem ? `/api/vault/items/${editingItem.id}` : '/api/vault/items',
        {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: entry.category, ...encrypted }),
        },
      );
      if (!response.ok) {
        const responseMessage = await response.text();
        throw new Error(responseMessage || `${editingItem ? 'Eintrag konnte nicht aktualisiert' : 'Eintrag konnte nicht gespeichert'} werden (HTTP ${response.status}).`);
      }
      const saved = await response.json();
      setItems((current) => editingItem
        ? current.map((item) => item.id === editingItem.id ? { ...saved, ...entry } : item)
        : [...current, { ...saved, ...entry }]);
      setEntry(createEmptyEntry());
      setEditingItem(null);
      setShowNewEntry(false);
      setIsSavingEntry(false);
    } catch (error) {
      setEntryError(`Fehler: ${error.message}`);
      setIsSavingEntry(false);
    }
  };

  const openNewEntry = () => {
    setEditingItem(null);
    setEntry(createEmptyEntry());
    if (documentPreviewUrl && documentPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(documentPreviewUrl);
    setDocumentPreviewUrl('');
    setOcrStatus('');
    setOcrProgress(0);
    setEntryError('');
    setIsSavingEntry(false);
    setShowNewEntry(true);
  };

  const openEditEntry = (item) => {
    setEditingItem(item);
    setEntry({ ...createEmptyEntry(item.category), ...item });
    if (documentPreviewUrl && documentPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(documentPreviewUrl);
    setDocumentPreviewUrl(item.category === 'Identity & Docs' && item.documentData
      ? `data:${item.documentMimeType || 'image/jpeg'};base64,${item.documentData}`
      : '');
    setOcrStatus('');
    setOcrProgress(0);
    setEntryError('');
    setIsSavingEntry(false);
    setShowNewEntry(true);
  };

  const closeEntryModal = () => {
    setEditingItem(null);
    setShowNewEntry(false);
    setShowInlineGenerator(false);
    if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl);
    setDocumentPreviewUrl('');
    setOcrStatus('');
    setOcrProgress(0);
    setEntryError('');
    setIsSavingEntry(false);
  };

  const parseOcrText = (text) => {
    const lines = text.split(/\r?\n/)
      .map((line) => line.replace(/[|_[\]{}]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const findLabeledValue = (labels) => {
      const labelPattern = new RegExp(`(?:${labels.join('|')})`, 'i');
      const isName = (value) => /^[A-ZÄÖÜÀ-Ý][A-ZÄÖÜÀ-Ý' -]{1,39}$/i.test(value)
        && value.split(' ').length <= 4;
      for (let index = 0; index < lines.length; index += 1) {
        if (!labelPattern.test(lines[index])) continue;
        const sameLine = lines[index].replace(labelPattern, '').replace(/^[\s:/-]+/, '').trim();
        if (isName(sameLine)) return sameLine;
        for (let offset = 1; offset <= 3; offset += 1) {
          const candidate = lines[index + offset]?.replace(/[^A-ZÄÖÜÀ-Ý' -]/gi, ' ').replace(/\s+/g, ' ').trim();
          if (candidate && isName(candidate)) return candidate;
        }
      }
      return '';
    };
    const dates = text.match(/\b\d{2}[./-]\d{2}[./-]\d{2,4}\b/g) || [];
    const documentNumber = text.match(/\b[A-Z0-9]{8,12}\b/gi)?.find((value) => /[A-Z]/i.test(value) && /\d/.test(value)) || '';
    return {
      firstName: findLabeledValue(['Vornamen?', 'Given names?', 'First names?']),
      lastName: findLabeledValue(['Familienname', 'Nachname', 'Surname', 'Last name']),
      documentNumber: findLabeledValue(['Ausweisnummer', 'Dokumentennummer', 'Document no']) || documentNumber,
      expiryDate: dates.at(-1) || '',
    };
  };

  const prepareOcrImage = (file) => new Promise((resolve, reject) => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      const scale = Math.min(3, Math.max(2, 1800 / image.width));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < imageData.data.length; index += 4) {
        const luminance = (imageData.data[index] * 0.299)
          + (imageData.data[index + 1] * 0.587)
          + (imageData.data[index + 2] * 0.114);
        const contrast = Math.max(0, Math.min(255, ((luminance - 128) * 1.35) + 128));
        imageData.data[index] = contrast;
        imageData.data[index + 1] = contrast;
        imageData.data[index + 2] = contrast;
      }
      context.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Bild konnte nicht vorbereitet werden.'))), 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Bild konnte nicht geladen werden.'));
    };
    image.src = sourceUrl;
  });

  const handleDocumentFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setOcrStatus('Bitte wähle ein Bild (JPG, PNG oder WEBP) aus.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setOcrStatus('Das Bild darf maximal 10 MB groß sein.');
      return;
    }
    if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl);
    setDocumentPreviewUrl(URL.createObjectURL(file));
    setOcrProgress(0);
    setOcrStatus('Lese Daten lokal aus...');
    try {
      const documentData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
        reader.readAsDataURL(file);
      });
      if (ocrWorkerRef.current) await ocrWorkerRef.current.terminate();
      const worker = await createWorker(['eng', 'deu'], 1, {
        logger: (progress) => {
          if (progress.status === 'recognizing text') setOcrProgress(Math.round(progress.progress * 100));
        },
      });
      ocrWorkerRef.current = worker;
      const ocrImage = await prepareOcrImage(file);
      const result = await worker.recognize(ocrImage);
      const parsed = parseOcrText(result.data.text);
      await worker.terminate();
      ocrWorkerRef.current = null;
      setEntry((current) => ({
        ...current,
        ...parsed,
        documentData,
        documentMimeType: file.type,
        title: current.title || file.name.replace(/\.[^.]+$/, ''),
      }));
      setOcrProgress(100);
      setOcrStatus('Scan abgeschlossen. Bitte prüfe die erkannten Daten.');
    } catch (error) {
      if (ocrWorkerRef.current) await ocrWorkerRef.current.terminate();
      ocrWorkerRef.current = null;
      setOcrStatus(`OCR fehlgeschlagen: ${error.message}`);
    }
  };

  const handleDocumentDrop = (event) => {
    event.preventDefault();
    handleDocumentFile(event.dataTransfer.files[0]);
  };

  const reviewItem = (item) => {
    setActiveCategory(item.category);
    setSearchQuery('');
    openEditEntry(item);
  };

  const useGeneratedSecret = (secret) => {
    setEntry((current) => ({ ...current, secret }));
    setShowInlineGenerator(false);
    setShowGenerator(false);
  };

  const filteredItems = useMemo(() => items.filter((item) => {
    const categoryMatches = activeCategory === 'All Items' || item.category === activeCategory;
    const searchMatches = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatches && searchMatches;
  }), [activeCategory, items, searchQuery]);

  const audit = useMemo(() => {
    const passwordItems = items.filter((item) => item.category === 'Passwords');
    const weakItems = passwordItems.filter((item) => isWeakSecret(item.secret));
    const secretCounts = new Map();
    passwordItems.forEach((item) => {
      const normalizedSecret = item.secret.trim();
      secretCounts.set(normalizedSecret, (secretCounts.get(normalizedSecret) || 0) + 1);
    });
    const duplicateItems = passwordItems.filter((item) => secretCounts.get(item.secret.trim()) > 1);
    const issues = weakItems.length + duplicateItems.length;

    return {
      score: Math.max(0, 100 - issues * 10),
      weakItems,
      duplicateItems,
      issueCount: issues,
    };
  }, [items]);

  if (isLoading) return <div className="vault-loading">Loading Secure Vault...</div>;

  return (
    <div className="vault-shell">
      <aside className="vault-sidebar">
        <div className="vault-logo"><div className="vault-logo-icon"><Shield size={20} /></div><span>Secure Vault</span></div>
        <nav className="vault-navigation" aria-label="Vault-Kategorien">
          <p className="navigation-label">Categories</p>
          {navigationCategories.map((category) => {
            const Icon = category.icon;
            return <button className={`navigation-item ${activeCategory === category.name ? 'active' : ''}`} key={category.name} onClick={() => { setActiveCategory(category.name); setSearchQuery(''); }} type="button"><Icon size={19} /><span>{category.name}</span></button>;
          })}
          <button className={`navigation-item ${showGenerator ? 'active' : ''}`} type="button" onClick={() => setShowGenerator(true)}><WandSparkles size={19} /><span>Generator</span></button>
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
          ) : activeCategory === 'Security Audit' ? (
            <section className="audit-content">
              <div className="audit-score-card">
                <div>
                  <h2>Vault Health Score</h2>
                  <p>{audit.issueCount === 0 ? 'No issues found in your vault.' : `${audit.issueCount} issue${audit.issueCount === 1 ? '' : 's'} found requiring your attention.`}</p>
                </div>
                <div className="audit-score">
                  <strong>{audit.score}<span>/100</span></strong>
                  <div className={`audit-score-ring ${audit.score >= 80 ? 'good' : audit.score >= 50 ? 'warning' : 'critical'}`} />
                </div>
              </div>

              {audit.weakItems.length > 0 ? (
                <div className="audit-issue-card">
                  <div className="audit-card-heading"><AlertTriangle size={22} /><h2>Weak Passwords Detected</h2></div>
                  <div className="audit-item-list">
                    {audit.weakItems.map((item) => (
                      <div className="audit-item" key={item.id}>
                        <div className="audit-item-icon"><Key size={18} /></div>
                        <div><h3>{item.title}</h3><p>Password is short or matches a commonly guessed pattern.</p></div>
                        <button className="secondary-button" type="button" onClick={() => reviewItem(item)}>Review item</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="audit-success-card">
                  <CheckCircle2 size={21} />
                  <div><h2>No weak passwords detected</h2><p>All password entries meet the local strength checks.</p></div>
                </div>
              )}

              {audit.duplicateItems.length > 0 ? (
                <div className="audit-issue-card">
                  <div className="audit-card-heading"><AlertTriangle size={22} /><h2>Reused Passwords Detected</h2></div>
                  <div className="audit-item-list">
                    {audit.duplicateItems.map((item) => (
                      <div className="audit-item" key={item.id}>
                        <div className="audit-item-icon"><Key size={18} /></div>
                        <div><h3>{item.title}</h3><p>This password is used by more than one vault entry.</p></div>
                        <button className="secondary-button" type="button" onClick={() => reviewItem(item)}>Review item</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="audit-success-card">
                  <CheckCircle2 size={21} />
                  <div><h2>No reused passwords detected</h2><p>Each password entry uses a different secret.</p></div>
                </div>
              )}

              <div className="audit-info-card">
                <Activity size={21} />
                <div><h2>Analysis runs locally</h2><p>Only decrypted entries already present in this browser are analyzed. Secrets are never sent to the server for the audit.</p></div>
              </div>
            </section>
          ) : (
            <>
              <div className="vault-page-heading"><div><h1>{activeCategory}</h1><p>Your decrypted entries exist only while the vault is unlocked.</p></div><div className="heading-actions"><button className="secondary-button" type="button" onClick={lockVault}><Lock size={17} /> Lock</button><button className="primary-button" type="button" onClick={openNewEntry}><Plus size={18} /> New Entry</button></div></div>
              {filteredItems.length > 0 ? <div className="vault-item-grid">{filteredItems.map((item) => <article className="vault-item-card" key={item.id}><div className="item-card-heading"><div><h2>{item.title}</h2><span>{item.category}</span></div><button type="button" aria-label={`Eintrag ${item.title} bearbeiten`} onClick={() => openEditEntry(item)}><MoreVertical size={19} /></button></div><div className="item-secret"><code>{revealedId === item.id ? getItemPreview(item) : '••••••••••••••••'}</code><button type="button" onClick={() => setRevealedId(revealedId === item.id ? null : item.id)} aria-label="Geheimnis anzeigen">{revealedId === item.id ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></article>)}</div> : <section className="vault-empty-state"><div className="empty-icon"><EyeOff size={27} /></div><h2>No entries found</h2><p>Your encrypted vault is ready for its first entry.</p><button className="primary-button" type="button" onClick={openNewEntry}><Plus size={18} /> New Entry</button></section>}
            </>
          )}
          {showNewEntry && <div className="entry-overlay"><section className="entry-modal"><div className="profile-panel-heading"><div><p className="profile-eyebrow">ENCRYPTED ENTRY</p><h2>{editingItem ? 'Edit Entry' : 'New Entry'}</h2></div><button className="modal-close" type="button" onClick={closeEntryModal}>×</button></div><div className="entry-type-tabs">{navigationCategories.slice(1, 4).map((category) => { const Icon = category.icon; return <button className={entry.category === category.name ? 'active' : ''} key={category.name} type="button" onClick={() => { setEntry((current) => ({ ...createEmptyEntry(category.name), title: current.title })); setShowInlineGenerator(false); setOcrStatus(''); setEntryError(''); }}><Icon size={14} /> {category.name}</button>; })}</div><form onSubmit={createEntry}><label>{entry.category === 'Financial' ? 'Card / account name' : 'Title / service'}<input value={entry.title} onChange={(event) => setEntry({ ...entry, title: event.target.value })} placeholder={entry.category === 'Financial' ? 'e.g. Main Credit Card' : 'e.g. Netflix, Google'} maxLength={120} required /></label>{entry.category === 'Financial' ? <><div className="entry-form-grid"><label>Card number<input value={entry.cardNumber} onChange={(event) => setEntry({ ...entry, cardNumber: event.target.value })} placeholder="0000 0000 0000 0000" maxLength={32} required /></label><label>Expiry date<input value={entry.expiryDate} onChange={(event) => setEntry({ ...entry, expiryDate: event.target.value })} placeholder="MM/YY" maxLength={5} required /></label></div><div className="entry-form-grid"><label>CVV<input type="password" value={entry.cvv} onChange={(event) => setEntry({ ...entry, cvv: event.target.value })} placeholder="•••" maxLength={4} required /></label><label>Cardholder name<input value={entry.cardholderName} onChange={(event) => setEntry({ ...entry, cardholderName: event.target.value })} placeholder="Name on card" maxLength={120} required /></label></div></> : entry.category === 'Identity & Docs' ? <><div className="document-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDocumentDrop}><FileText size={30} /><strong>Ziehe deinen Ausweis hierher</strong><span>oder klicke zur Auswahl. Das Bild verlässt dein Gerät nicht unverschlüsselt.</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleDocumentFile(event.target.files[0])} /></div>{documentPreviewUrl && <div className="document-preview"><img src={documentPreviewUrl} alt="Lokale Dokumentvorschau" /><div className="document-scan-line" /></div>}{ocrStatus && <div className="ocr-status"><span>{ocrStatus}</span>{ocrProgress > 0 && <span>{ocrProgress}%</span></div>}<div className="entry-form-grid"><label>Vorname<input value={entry.firstName} onChange={(event) => setEntry({ ...entry, firstName: event.target.value })} maxLength={120} /></label><label>Nachname<input value={entry.lastName} onChange={(event) => setEntry({ ...entry, lastName: event.target.value })} maxLength={120} /></label></div><div className="entry-form-grid"><label>Ausweisnummer<input value={entry.documentNumber} onChange={(event) => setEntry({ ...entry, documentNumber: event.target.value })} maxLength={40} /></label><label>Ablaufdatum<input value={entry.expiryDate} onChange={(event) => setEntry({ ...entry, expiryDate: event.target.value })} placeholder="DD.MM.YYYY" maxLength={10} /></label></div></> : <><label>Username / email<input value={entry.username} onChange={(event) => setEntry({ ...entry, username: event.target.value })} placeholder="hello@example.com" maxLength={254} /></label><label>Website URL<input type="url" value={entry.website} onChange={(event) => setEntry({ ...entry, website: event.target.value })} placeholder="https://" maxLength={500} /></label><label className="secret-field-label">Password or private note<div className="secret-input-wrap"><textarea value={entry.secret} onChange={(event) => setEntry({ ...entry, secret: event.target.value })} maxLength={10000} required /><button className="generator-trigger" type="button" onClick={() => setShowInlineGenerator((current) => !current)} aria-label="Passwort-Generator öffnen"><WandSparkles size={17} /></button><PasswordGenerator inline isOpen={showInlineGenerator} onClose={() => setShowInlineGenerator(false)} onUse={useGeneratedSecret} /></div></label>          </>}{entryError && <p className="form-error">{entryError}</p>}<button className="primary-button" type="submit" disabled={ocrStatus === 'Lese Daten lokal aus...' || isSavingEntry}>{isSavingEntry ? 'Saving...' : (editingItem ? 'Encrypt and update' : 'Encrypt and save')}</button></form></section></div>}
          <PasswordGenerator isOpen={showGenerator} onClose={() => setShowGenerator(false)} />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
