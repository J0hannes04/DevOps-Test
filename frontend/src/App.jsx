import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Box, CheckCircle2, Lock, Mail, User } from 'lucide-react';
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
    const url = `${import.meta.env.VITE_API_URL || ''}${endpoint}`;

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
    } catch {
      setMessage("Netzwerkfehler: Backend nicht erreichbar.");
    }
  };

  return (
    <div className="auth-page">
      <div className="ambient-orb ambient-orb-purple"></div>
      <div className="ambient-orb ambient-orb-blue"></div>

      <div className="auth-layout">
        <section className="brand-card">
          <div className="brand-header">
            <div className="brand-icon"><Box size={28} /></div>
            <span>MaterialM</span>
          </div>

          <h1>Welcome to<br />a new dimension.</h1>
          <p>MaterialM helps developers to build organized and well-coded dashboards full of beautiful and rich modules. Elevate your development process today.</p>

          <div className="benefits">
            <div><CheckCircle2 size={20} /> <span>Beautifully crafted modules</span></div>
            <div><CheckCircle2 size={20} /> <span>Clean and organized code</span></div>
          </div>

          <button type="button" className="learn-more-btn">Learn More</button>
        </section>

        <section className="auth-card">
          <div className="form-header">
            <h2>{isLogin ? 'Sign In' : 'Create Account'}</h2>
            <p>{isLogin ? 'Welcome back! Please enter your details.' : 'Let us get you set up with an account.'}</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group icon-input">
              <User size={20} />
              <input 
                type="text" 
                placeholder="Username"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                autoComplete="off"
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9._-]+"
                required 
              />
            </div>

            {!isLogin && (
              <div className="input-group icon-input">
                <Mail size={20} />
                <input 
                  type="email" 
                  placeholder="Email Address"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  autoComplete="off"
                  maxLength={254}
                  required 
                />
              </div>
            )}

            <div className="input-group icon-input">
              <Lock size={20} />
              <input 
                type="password" 
                placeholder="Password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required 
              />
            </div>

            <div className="form-options auth-options">
              <label className="checkbox-label">
                <input type="checkbox" /> Remember me
              </label>
              {isLogin && <button type="button" className="forgot-link">Forgot Password?</button>}
            </div>

            <button type="submit" className="submit-btn">
              {isLogin ? 'Sign In' : 'Sign Up'}
              <ArrowRight size={17} />
            </button>
          </form>

          {message && <p className="status-message">{message}</p>}

          <div className="switch-mode">
            <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>{' '}
            <button type="button" className="text-link" onClick={() => {
              setIsLogin(!isLogin);
              clearFields();
            }}>
              {isLogin ? 'Create one now' : 'Sign In instead'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;