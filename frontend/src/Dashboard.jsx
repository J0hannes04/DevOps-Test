import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  
  // Neue States für unser Profil-Update
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');

  // Wird einmal beim Laden der Seite ausgeführt
  useEffect(() => {
    // Prüfen, ob der User im Local- ODER SessionStorage steht
    const loggedInUser = localStorage.getItem('username') || sessionStorage.getItem('username');
    
    if (!loggedInUser) {
      navigate('/'); // Zurück zum Login, wenn nicht eingeloggt
    } else {
      setCurrentUsername(loggedInUser);
      setNewUsername(loggedInUser); // Input-Feld schon mal mit dem aktuellen Namen füllen
    }
  }, [navigate]);

  const handleLogout = () => {
    // Beide Speicher leeren, egal wo der Haken gesetzt war
    localStorage.removeItem('username');
    sessionStorage.removeItem('username');
    navigate('/'); 
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUsername: currentUsername,
          newUsername: newUsername,
          newEmail: newEmail,
        }),
      });

      const text = await response.text();

      if (response.ok) {
        setMessage('Profil erfolgreich aktualisiert!');
        
        // Den Namen im richtigen Storage aktualisieren
        if (localStorage.getItem('username')) {
          localStorage.setItem('username', newUsername);
        } else if (sessionStorage.getItem('username')) {
          sessionStorage.setItem('username', newUsername);
        }
        
        // Anzeige oben rechts aktualisieren
        setCurrentUsername(newUsername);
      } else {
        setMessage(`Fehler: ${text}`);
      }
    } catch (error) {
      setMessage('Netzwerkfehler: Backend nicht erreichbar.');
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>MaterialM Admin Dashboard</h1>
        <div className="user-profile">
          <span>Hallo, <strong>{currentUsername}</strong></span>
          <button onClick={handleLogout} className="logout-btn">
            Abmelden
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Deine bestehende Willkommens-Karte */}
        <div className="welcome-card">
          <h2>Herzlich Willkommen!</h2>
          <p>Hier entsteht dein zukünftiges Dashboard mit Statistiken, Tabellen und Einstellungen.</p>
        </div>

        {/* NEU: Die Karte für die Profil-Einstellungen */}
        <div className="profile-card" style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Profil bearbeiten</h3>
          
          <form onSubmit={handleUpdate} autoComplete="off" style={{ marginTop: '15px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Benutzername ändern</label>
              <input 
                type="text" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)} 
                required 
                style={{ padding: '8px', width: '100%', maxWidth: '300px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Neue E-Mail Adresse (optional)</label>
              <input 
                type="email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                placeholder="mail@beispiel.de"
                style={{ padding: '8px', width: '100%', maxWidth: '300px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <button type="submit" style={{ padding: '10px 15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Änderungen speichern
            </button>
          </form>
          
          {/* Erfolgs- oder Fehlermeldung */}
          {message && (
            <p style={{ marginTop: '15px', fontWeight: 'bold', color: message.includes('Fehler') || message.includes('fehler') ? 'red' : 'green' }}>
              {message}
            </p>
          )}
        </div>

      </main>
    </div>
  );
}

export default Dashboard;