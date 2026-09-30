import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function App() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const clearFields = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'; 
    const url = `http://localhost:9090${endpoint}`;

    const payload = isLogin 
      ? { username, password } 
      : { username, email, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();

      if (response.ok) {
  // Egal ob Sign In oder Sign Up: Direkt einloggen und weiterleiten!
  localStorage.setItem('username', username);
  navigate('/dashboard');
} else {
  setMessage(`Fehler: ${text}`);
}
    } catch (error) {
      setMessage("Netzwerkfehler: Backend nicht erreichbar.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        
        {/* Linke Sidebar */}
        <div className="login-sidebar">
          <div className="sidebar-content">
            <h1>Welcome to<br />MaterialM</h1>
            <p>MaterialM helps developers to build organized and well coded dashboards full of beautiful and rich modules.</p>
            <button type="button" className="learn-more-btn">Learn More</button>
          </div>
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>

        {/* Rechte Formular-Sektion */}
        <div className="login-form-container">
          <div className="form-header">
            
            <h2>{isLogin ? 'Sign In' : 'Create Account'}</h2>
            <p className="sub-title">Your Admin Dashboard</p>
          </div>

        

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group">
              <label>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                autoComplete="off"
                required 
              />
            </div>

            {!isLogin && (
              <div className="input-group">
                <label>E-Mail Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  autoComplete="off"
                  required 
                />
              </div>
            )}

            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete="new-password"
                required 
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" /> Remember this Device
              </label>
            </div>

            <button type="submit" className="submit-btn">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {message && <p className="status-message">{message}</p>}

          <div className="switch-mode">
            <span>{isLogin ? "New to MaterialM?" : "Already have an account?"}</span>{' '}
            <button type="button" className="text-link" onClick={() => {
              setIsLogin(!isLogin);
              clearFields();
            }}>
              {isLogin ? 'Create an account' : 'Sign In'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;