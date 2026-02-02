import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearAuth, getAuth, saveAuth } from '../../utils/mobileAuth';
import { clearAuthToken, getApiOrigin } from '../../api/client';
import { settingsApi } from '../../api/settings.api';
import { useDriverMobile } from '../../contexts/DriverMobileContext';
import { useAuth } from '../../contexts/AuthContext';
import '../../layouts/mobile/mobile.css';

export default function DriverSettingsMobile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auth, setAuthState] = useState<ReturnType<typeof getAuth>>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refreshAuth = useCallback(() => {
    setAuthState(getAuth());
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
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
      setToast(t('driverSettings.invalidImage', { defaultValue: 'Please upload an image (JPG, PNG, GIF)' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast(t('driverSettings.imageTooLarge', { defaultValue: 'Image must be less than 5MB' }));
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
      setToast(t('driverSettings.photoUpdated', { defaultValue: 'Profile photo updated!' }));
    } catch (err: any) {
      setToast(err?.response?.data?.message || t('driverSettings.uploadFailed', { defaultValue: 'Upload failed' }));
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

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 12 }}>
      {/* Appearance - Theme & Language */}
      <div className="dm-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.appearance')}</div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginBottom: 4 }}>{t('driverSettings.theme')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="dm-chip"
                onClick={() => setTheme('light')}
                style={{ background: theme === 'light' ? 'var(--dm-accent)' : undefined, color: theme === 'light' ? '#022c22' : undefined }}
              >
                ☀️ {t('driverSettings.light')}
              </button>
              <button
                className="dm-chip"
                onClick={() => setTheme('dark')}
                style={{ background: theme === 'dark' ? 'var(--dm-accent)' : undefined, color: theme === 'dark' ? '#022c22' : undefined }}
              >
                🌙 {t('driverSettings.dark')}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginBottom: 4 }}>{t('driverSettings.language')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="dm-chip"
                onClick={() => setLanguage('en')}
                style={{ background: language === 'en' ? 'var(--dm-accent)' : undefined, color: language === 'en' ? '#022c22' : undefined }}
              >
                🇺🇸 {t('driverSettings.english')}
              </button>
              <button
                className="dm-chip"
                onClick={() => setLanguage('es')}
                style={{ background: language === 'es' ? 'var(--dm-accent)' : undefined, color: language === 'es' ? '#022c22' : undefined }}
              >
                🇪🇸 {t('driverSettings.spanish')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile - with photo upload */}
      <div className="dm-card" style={{ display: 'grid', gap: 14 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.profile')}</div>

        {/* Profile Picture Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleProfilePictureUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPic}
            style={{
              position: 'relative',
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: uploadingPic ? 'wait' : 'pointer',
              borderRadius: '50%',
            }}
            aria-label={t('driverSettings.changePhoto')}
          >
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: profilePictureUrl ? `url(${profilePictureUrl}) center/cover` : 'var(--dm-border)',
                display: 'grid',
                placeItems: 'center',
                border: '3px solid var(--dm-accent)',
                fontSize: 32,
                fontWeight: 700,
                color: 'var(--dm-muted)',
              }}
            >
              {!profilePictureUrl && (auth?.user?.name?.charAt(0) || '?')}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--dm-accent)',
                color: '#022c22',
                display: 'grid',
                placeItems: 'center',
                fontSize: 16,
              }}
            >
              {uploadingPic ? '…' : '📷'}
            </div>
          </button>
          <div style={{ fontSize: 12, color: 'var(--dm-muted)', textAlign: 'center' }}>
            {t('driverSettings.profilePhotoDesc')}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>{t('driverSettings.name')}</div>
          <div>{auth?.user?.name || '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>{t('driverSettings.phone')}</div>
          <div>{auth?.user?.phone || '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>{t('driverSettings.email')}</div>
          <div>{auth?.user?.email || '—'}</div>
        </div>
      </div>

      {/* Availability */}
      <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>{t('driverSettings.availability')}</div>
          <button
            className="dm-chip"
            onClick={() => {}}
            aria-label="Toggle availability"
          >
            {t('driverSettings.online')}
          </button>
        </div>
        <div style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{t('driverSettings.availabilityDesc')}</div>
      </div>

      {/* Notifications */}
      <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.notifications')}</div>
        <div style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{t('driverSettings.notificationsDesc')}</div>
        <button className="dm-chip" style={{ alignSelf: 'start' }}>{t('driverSettings.online')}</button>
      </div>

      {/* Sound & Haptic */}
      <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.soundHaptic')}</div>
        <div style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{t('driverSettings.soundHapticDesc')}</div>
        <button className="dm-chip" style={{ alignSelf: 'start' }}>On</button>
      </div>

      {/* Location */}
      <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.location')}</div>
        <div style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{t('driverSettings.locationDesc')}</div>
        <button className="dm-chip" style={{ alignSelf: 'start' }}>Enable</button>
      </div>

      {/* Push Notifications */}
      <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.pushNotifications')}</div>
        <div style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{t('driverSettings.pushNotificationsDesc')}</div>
        <button
          className="dm-chip"
          style={{ alignSelf: 'start' }}
          onClick={async () => {
            if (typeof Notification !== 'undefined') {
              const p = await Notification.requestPermission();
              setToast(p === 'granted' ? t('driverSettings.pushEnabled') : t('driverSettings.pushDenied'));
            } else {
              setToast(t('driverSettings.pushNotSupported'));
            }
          }}
        >
          {typeof Notification !== 'undefined' && Notification.permission === 'granted'
            ? t('driverSettings.pushEnabled')
            : t('driverSettings.enablePush')}
        </button>
      </div>

      {/* About */}
      <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.about')}</div>
        <div style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{t('driverSettings.aboutDesc')}</div>
        <div style={{ fontSize: 13 }}>TMS Driver v1.0</div>
      </div>

      {/* Help & Support */}
      <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.helpSupport')}</div>
        <div style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{t('driverSettings.helpSupportDesc')}</div>
      </div>

      {/* Privacy */}
      <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.privacy')}</div>
        <div style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{t('driverSettings.privacyDesc')}</div>
      </div>

      {/* App Actions */}
      <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{t('driverSettings.app')}</div>
        <button
          className="dm-btn ghost"
          onClick={() => navigate('/driver/mobile/dashboard')}
        >
          {t('driverSettings.backToHome')}
        </button>
        <button
          className="dm-btn"
          onClick={handleLogout}
          style={{ background: 'var(--dm-danger)' }}
        >
          {t('driverSettings.logout')}
        </button>
      </div>

      {toast && (
        <div style={{ position: 'fixed', left: 12, right: 12, bottom: 90, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '10px 16px', borderRadius: 12, fontSize: 13, maxWidth: 320 }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
