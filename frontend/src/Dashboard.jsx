import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Benutzer';

  const handleLogout = () => {
    localStorage.removeItem('username');
    navigate('/'); // Zurück zum Login
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>MaterialM Admin Dashboard</h1>
        <div className="user-profile">
          <span>Hallo, <strong>{username}</strong></span>
          <button onClick={handleLogout} className="logout-btn">
            Abmelden
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-card">
          <h2>Herzlich Willkommen!</h2>
          <p>Hier entsteht dein zukünftiges Dashboard mit Statistiken, Tabellen und Einstellungen.</p>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;