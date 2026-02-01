import { memo } from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, TextField, MenuItem, Switch, Button, Divider } from '@mui/material';
import { Save } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { UserSettings } from '@/api/settings.api';

type SettingsAppearanceSectionProps = {
  settings: UserSettings;
  onSettingsChange: (s: Partial<UserSettings>) => void;
  saving: boolean;
  onSave: () => void;
  i18nLanguage: string;
  onLanguageChange: (lang: string) => Promise<void>;
};

export const SettingsAppearanceSection = memo<SettingsAppearanceSectionProps>(function SettingsAppearanceSection({
  settings,
  onSettingsChange,
  saving,
  onSave,
  i18nLanguage,
  onLanguageChange,
}) {
  const { t } = useTranslation();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('settings.appearance')} {t('settings.title')}</Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
      <List>
        <ListItem>
          <ListItemText primary={t('settings.theme')} secondary={i18nLanguage === 'es' ? 'Elija entre tema claro y oscuro' : 'Choose between light and dark theme'} />
          <ListItemSecondaryAction>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">{settings.theme === 'dark' ? 'Dark' : 'Light'}</Typography>
              <Switch checked={settings.theme === 'dark'} onChange={(e) => onSettingsChange({ theme: e.target.checked ? 'dark' : 'light' })} color="primary" />
            </Box>
          </ListItemSecondaryAction>
        </ListItem>
        <Divider component="li" />
        <ListItem>
          <ListItemText primary={t('settings.language')} secondary={t('settings.languageDescription')} />
          <ListItemSecondaryAction>
            <TextField id="settings-language" select size="small" value={settings.language} onChange={async (e) => { const v = e.target.value; onSettingsChange({ language: v }); await onLanguageChange(v); }} sx={{ minWidth: 150 }}>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Español</MenuItem>
            </TextField>
          </ListItemSecondaryAction>
        </ListItem>
        <Divider component="li" />
        <ListItem>
          <ListItemText primary={t('settings.dateFormat')} secondary={t('settings.dateFormatDescription')} />
          <ListItemSecondaryAction>
            <TextField id="settings-date-format" select size="small" value={settings.dateFormat} onChange={(e) => onSettingsChange({ dateFormat: e.target.value })} sx={{ minWidth: 150 }}>
              <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
              <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
              <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
              <MenuItem value="DD-MMM-YYYY">DD-MMM-YYYY</MenuItem>
            </TextField>
          </ListItemSecondaryAction>
        </ListItem>
        <Divider component="li" />
        <ListItem>
          <ListItemText primary={t('settings.timeFormat')} secondary={t('settings.timeFormatDescription')} />
          <ListItemSecondaryAction>
            <TextField id="settings-time-format" select size="small" value={settings.timeFormat} onChange={(e) => onSettingsChange({ timeFormat: e.target.value as '12h' | '24h' })} sx={{ minWidth: 150 }}>
              <MenuItem value="12h">12 Hour (AM/PM)</MenuItem>
              <MenuItem value="24h">24 Hour</MenuItem>
            </TextField>
          </ListItemSecondaryAction>
        </ListItem>
      </List>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={20} /> : <Save />} onClick={onSave} disabled={saving}>
          {t('settings.saveAppearanceSettings')}
        </Button>
      </Box>
    </Box>
  );
});
