import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { saveAuth } from '../../utils/mobileAuth';
import '../../layouts/mobile/mobile.css';

export default function DriverLoginMobile() {
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Adjust payload shape if your backend expects different fields
      const res = await authApi.login({ email: identifier, password });
      const token = (res as any)?.data?.token || (res as any)?.token;
      const user = (res as any)?.data?.user || (res as any)?.user;
      if (!token) throw new Error('Missing access token');
      const role = user?.role || user?.userType;
      if (role && role !== 'driver') throw new Error('Only driver accounts can sign in here');
      saveAuth({ accessToken: token, user, role });
      navigate('/driver/mobile/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dm-app" style={{minHeight:'100dvh', display:'grid', placeItems:'center', padding:'24px', background:'radial-gradient(1200px 600px at 20% -10%, rgba(34,211,238,0.25), transparent), radial-gradient(1200px 600px at 80% 110%, rgba(52,211,153,0.25), transparent)'}}>
      <div className="dm-card" style={{ width: '100%', maxWidth: 420, borderRadius:16, borderColor:'var(--dm-border)' }}>
        <div style={{textAlign:'center', marginBottom:12, fontWeight:800, fontSize:22}}>Driver Sign In</div>
        <form onSubmit={onSubmit}>
          <div style={{display:'grid', gap:10}}>
            <input className="dm-input" placeholder="Email or Phone" value={identifier} onChange={e=>setIdentifier(e.target.value)} inputMode="email" autoComplete="username" />
            <input className="dm-input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" />
            {error && <div style={{color:'#ff7676', fontSize:13}}>{error}</div>}
            <button className="dm-btn" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
            <button type="button" className="dm-btn ghost" onClick={() => navigate('/driver/login')}>Use Email/Phone</button>
          </div>
        </form>
        <div style={{marginTop:10, textAlign:'center', fontSize:12, color:'var(--dm-muted)'}}>Mobile-only driver access</div>
      </div>
    </div>
  );
}
