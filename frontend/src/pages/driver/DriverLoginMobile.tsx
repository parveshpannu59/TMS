import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { setAuthToken } from '../../api/client';
import { saveAuth } from '../../utils/mobileAuth';
import '../../layouts/mobile/mobile.css';

export default function DriverLoginMobile() {
  const { t } = useTranslation();
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
      setAuthToken(token); // Enable API calls (loadApi, etc.)
      saveAuth({ accessToken: token, user, role });
      navigate('/driver/mobile/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dm-app" style={{
      minHeight: '100dvh', display: 'grid', placeItems: 'center',
      padding: 24,
      background: '#f2f2f7',
    }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'grid', gap: 32 }}>
        {/* Logo / Branding */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #007aff, #5856d6)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 8px 24px rgba(0,122,255,0.25)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: -0.5, color: '#1c1c1e' }}>{t('driverApp.fleetPro')}</div>
          <div style={{ fontSize: 15, color: '#8e8e93', marginTop: 4 }}>{t('driverApp.driverSignIn')}</div>
        </div>

        {/* Login Card */}
        <div className="dm-card" style={{ padding: 24, borderRadius: 18 }}>
          <form onSubmit={onSubmit}>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {t('driverApp.emailOrPhone')}
                </label>
                <input
                  className="dm-input"
                  placeholder="driver@company.com"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  inputMode="email"
                  autoComplete="username"
                  style={{ fontSize: 16, padding: '14px 16px', borderRadius: 12 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {t('driverApp.password')}
                </label>
                <input
                  className="dm-input"
                  placeholder={t('driverApp.enterPassword')}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ fontSize: 16, padding: '14px 16px', borderRadius: 12 }}
                />
              </div>
              {error && (
                <div style={{ color: '#ff3b30', fontSize: 14, fontWeight: 500, padding: '4px 0' }}>{error}</div>
              )}
              <button
                className="dm-btn"
                disabled={loading}
                style={{
                  borderRadius: 50, fontSize: 17, padding: '16px 24px',
                  background: 'linear-gradient(135deg, #007aff, #5856d6)',
                  marginTop: 4,
                }}
              >
                {loading ? t('driverApp.signingIn') : t('driverApp.signIn')}
              </button>
            </div>
          </form>
        </div>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#8e8e93' }}>
          {t('driverApp.mobileDriverAccess')}
        </div>
      </div>
    </div>
  );
}
