// src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell auth-card">
      <h1 className="page-title">Login</h1>
      <p className="helper-text">Welcome back! Jump back into your decks.</p>
      <form onSubmit={handleSubmit} style={{ width: '100%', textAlign: 'left' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label className="label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label className="label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {error && (
          <p className="notice" style={{ marginBottom: '0.5rem' }}>
            {error}
          </p>
        )}
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="helper-text" style={{ marginTop: '1rem' }}>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}

export default LoginPage;
