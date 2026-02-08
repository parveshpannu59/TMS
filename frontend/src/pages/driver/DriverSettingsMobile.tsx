import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearAuth, getAuth, saveAuth } from '../../utils/mobileAuth';
import { clearAuthToken, getApiOrigin } from '../../api/client';
import { settingsApi } from '../../api/settings.api';
import { useDriverMobile } from '../../contexts/DriverMobileContext';
import { useAuth } from '../../contexts/AuthContext';
import '../../layouts/mobile/mobile.css';

// iOS-style Toggle Switch component
function IOSToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 51, height: 31, borderRadius: 16, padding: 2,
        background: on ? '#34c759' : 'rgba(120,120,128,0.32)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.25s ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 27, height: 27, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
        transform: on ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.25s ease',
      }} />
    </button>
  );
}

export default function DriverSettingsMobile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auth, setAuthState] = useState<ReturnType<typeof getAuth>>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Settings state with localStorage persistence
  const [notificationsOn, setNotificationsOn] = useState(() => localStorage.getItem('driver_notifications') !== 'off');
  const [locationOn, setLocationOn] = useState(() => localStorage.getItem('driver_location') !== 'off');
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('driver_sound') !== 'off');
  const [pushPermission, setPushPermission] = useState<string>('default');

  const refreshAuth = useCallback(() => {
    setAuthState(getAuth());
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPushPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const { theme, setTheme, language, setLanguage } = useDriverMobile();

  const profilePictureUrl = auth?.user?.profilePicture
    ? (auth.user.profilePicture.startsWith('http')
        ? auth.user.profilePicture
        : `${getApiOrigin()}${auth.user.profilePicture}`)
    : undefined;

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast(t('driverSettings.invalidImage'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast(t('driverSettings.imageTooLarge'));
      return;
    }
    try {
      setUploadingPic(true);
      const url = await settingsApi.updateProfilePicture(file);
      const updatedUser = { ...auth?.user, profilePicture: url };
      const newAuth = { ...auth!, user: updatedUser };
      saveAuth(newAuth);
      setAuthState(newAuth);
      window.dispatchEvent(new CustomEvent('driver-profile-updated'));
      setToast(t('driverSettings.photoUpdated'));
    } catch (err: any) {
      setToast(err?.response?.data?.message || t('driverSettings.uploadFailed'));
    } finally {
      setUploadingPic(false);
      e.target.value = '';
    }
  };

  const handleLogout = () => {
    clearAuth();
    clearAuthToken();
    authLogout();
  };

  const handleNotificationsToggle = (val: boolean) => {
    setNotificationsOn(val);
    localStorage.setItem('driver_notifications', val ? 'on' : 'off');
    setToast(val ? t('driverSettings.pushEnabled') : t('driverSettings.pushDenied'));
  };

  const handleLocationToggle = async (val: boolean) => {
    if (val && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationOn(true);
          localStorage.setItem('driver_location', 'on');
          setToast(t('driverSettings.locationDesc') + ' ✓');
        },
        () => {
          setToast(t('driverSettings.pushDenied'));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationOn(false);
      localStorage.setItem('driver_location', 'off');
      setToast(t('driverSettings.locationDesc') + ' ✗');
    }
  };

  const handleSoundToggle = (val: boolean) => {
    setSoundOn(val);
    localStorage.setItem('driver_sound', val ? 'on' : 'off');
    if (val && navigator && 'vibrate' in navigator) {
      (navigator as any).vibrate(50);
    }
  };

  const handlePushNotification = async () => {
    if (typeof Notification !== 'undefined') {
      const p = await Notification.requestPermission();
      setPushPermission(p);
      setToast(p === 'granted' ? t('driverSettings.pushEnabled') : t('driverSettings.pushDenied'));
    } else {
      setToast(t('driverSettings.pushNotSupported'));
    }
  };

  const ios = { blue: '#007aff', green: '#34c759', red: '#ff3b30' };

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 14 }}>
      {/* ─── Profile Header ─── */}
      <div className="dm-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '28px 20px' }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePictureUpload} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPic}
          style={{ position: 'relative', padding: 0, border: 'none', background: 'none', cursor: uploadingPic ? 'wait' : 'pointer', borderRadius: '50%' }}
          aria-label={t('driverSettings.changePhoto')}
        >
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: profilePictureUrl ? `url(${profilePictureUrl}) center/cover` : 'linear-gradient(135deg, var(--dm-accent), var(--dm-accent-2))',
            display: 'grid', placeItems: 'center',
            border: '3px solid var(--dm-surface)',
            boxShadow: 'var(--dm-shadow-elevated)',
            fontSize: 36, fontWeight: 600, color: '#fff',
          }}>
            {!profilePictureUrl && (auth?.user?.name?.charAt(0)?.toUpperCase() || '?')}
          </div>
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 30, height: 30, borderRadius: '50%',
            background: ios.blue, color: '#fff',
            display: 'grid', placeItems: 'center', fontSize: 14,
            border: '2px solid var(--dm-surface)',
          }}>
            {uploadingPic ? '...' : '📷'}
          </div>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: -0.3 }}>{auth?.user?.name || t('users.driver')}</div>
          <div style={{ fontSize: 14, color: 'var(--dm-muted)', marginTop: 2 }}>{auth?.user?.email || ''}</div>
          {auth?.user?.phone && <div style={{ fontSize: 14, color: 'var(--dm-muted)', marginTop: 2 }}>{auth.user.phone}</div>}
        </div>
      </div>

      {/* ─── Appearance ─── */}
      <div style={{ padding: '8px 4px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dm-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{t('driverSettings.appearance')}</div>
      </div>
      <div className="dm-inset-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
          <span style={{ fontSize: 16 }}>{t('driverSettings.theme')}</span>
          <div style={{ display: 'flex', gap: 6, background: 'var(--dm-fill)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setTheme('light')} style={{
              padding: '6px 14px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: theme === 'light' ? 'var(--dm-surface)' : 'transparent',
              color: theme === 'light' ? 'var(--dm-text)' : 'var(--dm-muted)',
              boxShadow: theme === 'light' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{t('driverSettings.light')}</button>
            <button onClick={() => setTheme('dark')} style={{
              padding: '6px 14px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: theme === 'dark' ? 'var(--dm-surface)' : 'transparent',
              color: theme === 'dark' ? 'var(--dm-text)' : 'var(--dm-muted)',
              boxShadow: theme === 'dark' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{t('driverSettings.dark')}</button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
          <span style={{ fontSize: 16 }}>{t('driverSettings.language')}</span>
          <div style={{ display: 'flex', gap: 6, background: 'var(--dm-fill)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setLanguage('en')} style={{
              padding: '6px 14px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: language === 'en' ? 'var(--dm-surface)' : 'transparent',
              color: language === 'en' ? 'var(--dm-text)' : 'var(--dm-muted)',
              boxShadow: language === 'en' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>EN</button>
            <button onClick={() => setLanguage('es')} style={{
              padding: '6px 14px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: language === 'es' ? 'var(--dm-surface)' : 'transparent',
              color: language === 'es' ? 'var(--dm-text)' : 'var(--dm-muted)',
              boxShadow: language === 'es' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>ES</button>
          </div>
        </div>
      </div>

      {/* ─── Preferences with Functional Toggles ─── */}
      <div style={{ padding: '8px 4px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dm-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{t('settings.systemPreferences', { defaultValue: 'Preferences' })}</div>
      </div>
      <div className="dm-inset-group">
        {/* Notifications Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
          <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{t('driverSettings.notifications')}</div>
            <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 1 }}>{t('driverSettings.notificationsDesc')}</div>
          </div>
          <IOSToggle on={notificationsOn} onChange={handleNotificationsToggle} />
        </div>

        {/* Location Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
          <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>📍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{t('driverSettings.location')}</div>
            <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 1 }}>{t('driverSettings.locationDesc')}</div>
          </div>
          <IOSToggle on={locationOn} onChange={handleLocationToggle} />
        </div>

        {/* Sound & Haptic Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
          <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>🔊</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{t('driverSettings.soundHaptic')}</div>
            <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 1 }}>{t('driverSettings.soundHapticDesc')}</div>
          </div>
          <IOSToggle on={soundOn} onChange={handleSoundToggle} />
        </div>

        {/* Push Notifications - actionable */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
          onClick={handlePushNotification}
        >
          <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>📲</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{t('driverSettings.pushNotifications')}</div>
            <div style={{ fontSize: 13, color: pushPermission === 'granted' ? ios.green : 'var(--dm-muted)', marginTop: 1 }}>
              {pushPermission === 'granted'
                ? t('driverSettings.pushEnabled')
                : pushPermission === 'denied'
                ? t('driverSettings.pushDenied')
                : t('driverSettings.enablePush')}
            </div>
          </div>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: pushPermission === 'granted' ? ios.green : pushPermission === 'denied' ? ios.red : 'var(--dm-muted)',
          }} />
        </div>
      </div>

      {/* ─── Info ─── */}
      <div style={{ padding: '8px 4px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dm-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{t('driverSettings.about', { defaultValue: 'Info' })}</div>
      </div>
      <div className="dm-inset-group">
        {[
          { label: t('driverSettings.helpSupport'), icon: '❓' },
          { label: t('driverSettings.privacy'), icon: '🔒' },
          { label: t('driverSettings.about'), icon: 'ℹ️', extra: 'FleetPro v1.0' },
        ].map(({ label, icon, extra }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}>
            <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{icon}</span>
            <div style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{label}</div>
            {extra && <span style={{ fontSize: 14, color: 'var(--dm-muted)' }}>{extra}</span>}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dm-muted)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        ))}
      </div>

      {/* ─── Sign Out ─── */}
      <button
        className="dm-btn"
        onClick={handleLogout}
        style={{ background: ios.red, borderRadius: 'var(--dm-radius)', marginTop: 8, fontSize: 17 }}
      >
        {t('driverSettings.logout')}
      </button>

      {/* iOS Toast */}
      {toast && (
        <div style={{
          position: 'fixed', left: 16, right: 16, bottom: 100,
          display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 999,
          animation: 'ios-fadeUp 0.25s ease',
        }}>
          <div style={{
            background: 'var(--dm-text)', color: 'var(--dm-bg)',
            padding: '12px 20px', borderRadius: 50,
            fontSize: 15, fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
