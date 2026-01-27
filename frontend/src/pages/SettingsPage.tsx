// import React, { useState } from 'react';
// import {
//   Box,
//   Card,
//   CardContent,
//   Typography,
//   Switch,
//   Button,
//   TextField,
//   Divider,
//   List,
//   ListItem,
//   ListItemText,
//   ListItemSecondaryAction,
//   Grid,
//   Avatar,
//   IconButton,
//   MenuItem,
//   Alert,
// } from '@mui/material';
// import {
//   Settings,
//   Palette,
//   Notifications,
//   Security,
//   Business,
//   Person,
//   Language,
//   IntegrationInstructions,
//   Save,
//   Edit,
// } from '@mui/icons-material';
// import { DashboardLayout } from '@layouts/DashboardLayout';
// import { useThemeMode } from '@/contexts/ThemeContext';
// import { useAuth } from '@/hooks/useAuth';

// const SettingsPage: React.FC = () => {
//   const { mode, toggleTheme } = useThemeMode();
//   const { user } = useAuth();
//   const [success, setSuccess] = useState<string | null>(null);
//   const [activeSection, setActiveSection] = useState('appearance');

//   const [settings, setSettings] = useState({
//     // Appearance
//     theme: mode,
//     language: 'en',
//     dateFormat: 'MM/DD/YYYY',
//     timeFormat: '12h',
    
//     // Notifications
//     emailNotifications: true,
//     smsNotifications: false,
//     loadUpdates: true,
//     driverUpdates: true,
//     maintenanceReminders: true,
    
//     // Company
//     companyName: 'Test Company',
//     companyEmail: user?.email || '',
//     companyPhone: '',
//     companyAddress: '',
    
//     // System
//     autoAssignment: false,
//     requireLoadApproval: true,
//     enableGPSTracking: false,
//     defaultCurrency: 'USD',
//   });

//   const handleSave = () => {
//     // Save settings logic here
//     setSuccess('Settings saved successfully!');
//     setTimeout(() => setSuccess(null), 3000);
//   };

//   const sections = [
//     { id: 'appearance', label: 'Appearance', icon: <Palette /> },
//     { id: 'notifications', label: 'Notifications', icon: <Notifications /> },
//     { id: 'company', label: 'Company Profile', icon: <Business /> },
//     { id: 'account', label: 'Account', icon: <Person /> },
//     { id: 'system', label: 'System Preferences', icon: <Settings /> },
//     { id: 'integrations', label: 'Integrations', icon: <IntegrationInstructions /> },
//   ];

//   return (
//     <DashboardLayout>
//       <Box sx={{ p: 3 }}>
//         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
//           <Settings sx={{ fontSize: 32, color: 'primary.main' }} />
//           <Box>
//             <Typography variant="h4" fontWeight={700}>
//               Settings
//             </Typography>
//             <Typography variant="body2" color="text.secondary">
//               Manage your TMS preferences and configurations
//             </Typography>
//           </Box>
//         </Box>

//         {success && (
//           <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
//             {success}
//           </Alert>
//         )}

//         <Grid container spacing={3}>
//           {/* Sidebar Navigation */}
//           <Grid item xs={12} md={3}>
//             <Card>
//               <List>
//                 {sections.map((section) => (
//                   <ListItem
//                     key={section.id}
//                     button
//                     selected={activeSection === section.id}
//                     onClick={() => setActiveSection(section.id)}
//                     sx={{
//                       borderLeft: activeSection === section.id ? '3px solid' : 'none',
//                       borderColor: 'primary.main',
//                       bgcolor: activeSection === section.id ? 'action.selected' : 'transparent',
//                     }}
//                   >
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                       {section.icon}
//                       <ListItemText primary={section.label} />
//                     </Box>
//                   </ListItem>
//                 ))}
//               </List>
//             </Card>
//           </Grid>

//           {/* Settings Content */}
//           <Grid item xs={12} md={9}>
//             <Card>
//               <CardContent sx={{ p: 3 }}>
//                 {/* Appearance Settings */}
//                 {activeSection === 'appearance' && (
//                   <Box>
//                     <Typography variant="h6" gutterBottom>
//                       Appearance Settings
//                     </Typography>
//                     <Divider sx={{ my: 2 }} />
                    
//                     <List>
//                       <ListItem>
//                         <ListItemText
//                           primary="Theme"
//                           secondary="Choose between light and dark theme"
//                         />
//                         <ListItemSecondaryAction>
//                           <Switch
//                             checked={mode === 'dark'}
//                             onChange={toggleTheme}
//                             color="primary"
//                           />
//                         </ListItemSecondaryAction>
//                       </ListItem>
                      
//                       <ListItem>
//                         <ListItemText primary="Language" />
//                         <ListItemSecondaryAction>
//                           <TextField
//                             select
//                             size="small"
//                             value={settings.language}
//                             onChange={(e) => setSettings({ ...settings, language: e.target.value })}
//                             sx={{ minWidth: 150 }}
//                           >
//                             <MenuItem value="en">English</MenuItem>
//                             <MenuItem value="es">Spanish</MenuItem>
//                             <MenuItem value="fr">French</MenuItem>
//                           </TextField>
//                         </ListItemSecondaryAction>
//                       </ListItem>
                      
//                       <ListItem>
//                         <ListItemText primary="Date Format" />
//                         <ListItemSecondaryAction>
//                           <TextField
//                             select
//                             size="small"
//                             value={settings.dateFormat}
//                             onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
//                             sx={{ minWidth: 150 }}
//                           >
//                             <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
//                             <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
//                             <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
//                           </TextField>
//                         </ListItemSecondaryAction>
//                       </ListItem>
//                     </List>
//                   </Box>
//                 )}

//                 {/* Notification Settings */}
//                 {activeSection === 'notifications' && (
//                   <Box>
//                     <Typography variant="h6" gutterBottom>
//                       Notification Preferences
//                     </Typography>
//                     <Divider sx={{ my: 2 }} />
                    
//                     <List>
//                       <ListItem>
//                         <ListItemText
//                           primary="Email Notifications"
//                           secondary="Receive notifications via email"
//                         />
//                         <ListItemSecondaryAction>
//                           <Switch
//                             checked={settings.emailNotifications}
//                             onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
//                           />
//                         </ListItemSecondaryAction>
//                       </ListItem>
                      
//                       <ListItem>
//                         <ListItemText
//                           primary="Load Updates"
//                           secondary="Get notified about load status changes"
//                         />
//                         <ListItemSecondaryAction>
//                           <Switch
//                             checked={settings.loadUpdates}
//                             onChange={(e) => setSettings({ ...settings, loadUpdates: e.target.checked })}
//                           />
//                         </ListItemSecondaryAction>
//                       </ListItem>
                      
//                       <ListItem>
//                         <ListItemText
//                           primary="Driver Updates"
//                           secondary="Notifications about driver availability"
//                         />
//                         <ListItemSecondaryAction>
//                           <Switch
//                             checked={settings.driverUpdates}
//                             onChange={(e) => setSettings({ ...settings, driverUpdates: e.target.checked })}
//                           />
//                         </ListItemSecondaryAction>
//                       </ListItem>
                      
//                       <ListItem>
//                         <ListItemText
//                           primary="Maintenance Reminders"
//                           secondary="Get reminders for vehicle maintenance"
//                         />
//                         <ListItemSecondaryAction>
//                           <Switch
//                             checked={settings.maintenanceReminders}
//                             onChange={(e) => setSettings({ ...settings, maintenanceReminders: e.target.checked })}
//                           />
//                         </ListItemSecondaryAction>
//                       </ListItem>
//                     </List>
//                   </Box>
//                 )}

//                 {/* Company Settings */}
//                 {activeSection === 'company' && (
//                   <Box>
//                     <Typography variant="h6" gutterBottom>
//                       Company Profile
//                     </Typography>
//                     <Divider sx={{ my: 2 }} />
                    
//                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
//                       <TextField
//                         label="Company Name"
//                         value={settings.companyName}
//                         onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
//                         fullWidth
//                       />
//                       <TextField
//                         label="Company Email"
//                         type="email"
//                         value={settings.companyEmail}
//                         onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
//                         fullWidth
//                       />
//                       <TextField
//                         label="Company Phone"
//                         value={settings.companyPhone}
//                         onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
//                         fullWidth
//                       />
//                       <TextField
//                         label="Company Address"
//                         multiline
//                         rows={3}
//                         value={settings.companyAddress}
//                         onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
//                         fullWidth
//                       />
//                     </Box>
//                   </Box>
//                 )}

//                 {/* System Preferences */}
//                 {activeSection === 'system' && (
//                   <Box>
//                     <Typography variant="h6" gutterBottom>
//                       System Preferences
//                     </Typography>
//                     <Divider sx={{ my: 2 }} />
                    
//                     <List>
//                       <ListItem>
//                         <ListItemText
//                           primary="Auto Assignment"
//                           secondary="Automatically assign loads to available drivers"
//                         />
//                         <ListItemSecondaryAction>
//                           <Switch
//                             checked={settings.autoAssignment}
//                             onChange={(e) => setSettings({ ...settings, autoAssignment: e.target.checked })}
//                           />
//                         </ListItemSecondaryAction>
//                       </ListItem>
                      
//                       <ListItem>
//                         <ListItemText
//                           primary="Load Approval Required"
//                           secondary="Require approval before load assignment"
//                         />
//                         <ListItemSecondaryAction>
//                           <Switch
//                             checked={settings.requireLoadApproval}
//                             onChange={(e) => setSettings({ ...settings, requireLoadApproval: e.target.checked })}
//                           />
//                         </ListItemSecondaryAction>
//                       </ListItem>
                      
//                       <ListItem>
//                         <ListItemText primary="Default Currency" />
//                         <ListItemSecondaryAction>
//                           <TextField
//                             select
//                             size="small"
//                             value={settings.defaultCurrency}
//                             onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
//                             sx={{ minWidth: 100 }}
//                           >
//                             <MenuItem value="USD">USD</MenuItem>
//                             <MenuItem value="EUR">EUR</MenuItem>
//                             <MenuItem value="GBP">GBP</MenuItem>
//                             <MenuItem value="CAD">CAD</MenuItem>
//                           </TextField>
//                         </ListItemSecondaryAction>
//                       </ListItem>
//                     </List>
//                   </Box>
//                 )}

//                 {/* Account Settings */}
//                 {activeSection === 'account' && (
//                   <Box>
//                     <Typography variant="h6" gutterBottom>
//                       Account Settings
//                     </Typography>
//                     <Divider sx={{ my: 2 }} />
                    
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
//                       <Avatar sx={{ width: 80, height: 80, fontSize: '2rem' }}>
//                         {user?.name?.charAt(0)}
//                       </Avatar>
//                       <Box>
//                         <Typography variant="h6">{user?.name}</Typography>
//                         <Typography variant="body2" color="text.secondary">
//                           {user?.email}
//                         </Typography>
//                         <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
//                           Role: {user?.role}
//                         </Typography>
//                       </Box>
//                     </Box>
                    
//                     <Button variant="outlined" startIcon={<Edit />}>
//                       Edit Profile
//                     </Button>
//                   </Box>
//                 )}

//                 {/* Integrations */}
//                 {activeSection === 'integrations' && (
//                   <Box>
//                     <Typography variant="h6" gutterBottom>
//                       Integrations
//                     </Typography>
//                     <Divider sx={{ my: 2 }} />
                    
//                     <Typography variant="body2" color="text.secondary">
//                       Connect your TMS with third-party services and tools.
//                     </Typography>
                    
//                     <Box sx={{ mt: 3 }}>
//                       <Typography variant="body2" color="text.secondary">
//                         Coming soon: ELD integration, GPS tracking, Load boards, and more...
//                       </Typography>
//                     </Box>
//                   </Box>
//                 )}

//                 {/* Save Button */}
//                 <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
//                   <Button
//                     variant="contained"
//                     startIcon={<Save />}
//                     onClick={handleSave}
//                     size="large"
//                   >
//                     Save Changes
//                   </Button>
//                 </Box>
//               </CardContent>
//             </Card>
//           </Grid>
//         </Grid>
//       </Box>
//     </DashboardLayout>
//   );
// };

// export default SettingsPage;
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Button,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Grid,
  Avatar,
  IconButton,
  MenuItem,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Settings,
  Palette,
  Notifications,
  Business,
  Person,
  IntegrationInstructions,
  Save,
  PhotoCamera,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
  Send,
  Lock,
  Public,
} from '@mui/icons-material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi } from '@/api/settings.api';
import type { UserSettings, PasswordChange } from '@/api/settings.api';
import { useTranslation } from 'react-i18next';

const SettingsPage: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  const { user, checkAuth } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('appearance');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Password change dialog
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<any>({});

  // Profile picture upload
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Custom values for session timeout and password expiry
  const [sessionTimeoutCustom, setSessionTimeoutCustom] = useState<number>(30);
  const [passwordExpiryCustom, setPasswordExpiryCustom] = useState<number>(30);
  const [isSessionTimeoutCustom, setIsSessionTimeoutCustom] = useState<boolean>(false);
  const [isPasswordExpiryCustom, setIsPasswordExpiryCustom] = useState<boolean>(false);

  const [settings, setSettings] = useState<UserSettings>({
    userId: user?.id || '',
    companyId: '',
    // Appearance
    theme: mode,
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    loadUpdates: true,
    driverUpdates: true,
    maintenanceReminders: true,
    invoiceReminders: true,
    
    // Company
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    taxId: '',
    dotNumber: '',
    mcNumber: '',
    
    // System
    autoAssignment: false,
    requireLoadApproval: true,
    enableGPSTracking: false,
    defaultCurrency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    measurementUnit: 'imperial',
    
    // Security
    twoFactorEnabled: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
  });

  const [originalSettings, setOriginalSettings] = useState<UserSettings>(settings);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  // Sync i18n language with settings
  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getSettings();
      // Ensure userId and companyId are set
      const settingsWithIds = {
        ...data,
        userId: data.userId || user?.id || '',
        companyId: data.companyId || '',
      };
      setSettings(settingsWithIds);
      setOriginalSettings(settingsWithIds);
      
      // Sync i18n language with loaded settings
      if (settingsWithIds.language) {
        i18n.changeLanguage(settingsWithIds.language);
      }
      
      // Check if session timeout is custom (not 15 or 30)
      const sessionTimeout = settingsWithIds.sessionTimeout || 30;
      if (sessionTimeout !== 15 && sessionTimeout !== 30) {
        setIsSessionTimeoutCustom(true);
        setSessionTimeoutCustom(sessionTimeout);
      } else {
        setIsSessionTimeoutCustom(false);
      }
      
      // Check if password expiry is custom (not 30)
      const passwordExpiry = settingsWithIds.passwordExpiry || 30;
      if (passwordExpiry !== 30) {
        setIsPasswordExpiryCustom(true);
        setPasswordExpiryCustom(passwordExpiry);
      } else {
        setIsPasswordExpiryCustom(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };


  const handleSaveSection = async (section: string) => {
    try {
      setSaving(true);
      setError(null);
      
      let sectionData: any = {};
      
      switch (section) {
        case 'appearance':
          sectionData = {
            theme: settings.theme,
            language: settings.language,
            dateFormat: settings.dateFormat,
            timeFormat: settings.timeFormat,
          };
          break;
        case 'notifications':
          sectionData = {
            emailNotifications: settings.emailNotifications,
            smsNotifications: settings.smsNotifications,
            pushNotifications: settings.pushNotifications,
            loadUpdates: settings.loadUpdates,
            driverUpdates: settings.driverUpdates,
            maintenanceReminders: settings.maintenanceReminders,
            invoiceReminders: settings.invoiceReminders,
          };
          break;
        case 'company':
          sectionData = {
            companyName: settings.companyName,
            companyEmail: settings.companyEmail,
            companyPhone: settings.companyPhone,
            companyAddress: settings.companyAddress,
            taxId: settings.taxId,
            dotNumber: settings.dotNumber,
            mcNumber: settings.mcNumber,
          };
          break;
        case 'system':
          sectionData = {
            autoAssignment: settings.autoAssignment,
            requireLoadApproval: settings.requireLoadApproval,
            enableGPSTracking: settings.enableGPSTracking,
            defaultCurrency: settings.defaultCurrency,
            timezone: settings.timezone,
            measurementUnit: settings.measurementUnit,
          };
          break;
        case 'account':
        case 'security':
          sectionData = {
            twoFactorEnabled: settings.twoFactorEnabled,
            sessionTimeout: settings.sessionTimeout,
            passwordExpiry: settings.passwordExpiry,
          };
          break;
      }
      
      await settingsApi.updateSection(section, sectionData);
      
      // Update original settings
      setOriginalSettings({ ...originalSettings, ...sectionData });
      
      setSuccess(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Update theme if appearance was changed
      if (section === 'appearance' && settings.theme !== mode) {
        toggleTheme();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to save ${section} settings`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async (type: 'email' | 'sms' | 'push') => {
    try {
      await settingsApi.testNotification(type);
      setSuccess(`Test ${type} notification sent!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to send test ${type}`);
    }
  };

  const validatePassword = (): boolean => {
    const errors: any = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePassword()) return;
    
    try {
      setSaving(true);
      await settingsApi.changePassword(passwordData);
      setSuccess('Password changed successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }
    
    try {
      setUploadingPicture(true);
      await settingsApi.updateProfilePicture(file);
      
      // Reload user data to get updated profile picture
      if (checkAuth) {
        await checkAuth();
      }
      
      setSuccess('Profile picture updated!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const sections = [
    { id: 'appearance', label: t('settings.appearance'), icon: <Palette /> },
    { id: 'notifications', label: t('settings.notifications'), icon: <Notifications /> },
    { id: 'company', label: t('settings.companyProfile'), icon: <Business /> },
    { id: 'account', label: t('settings.accountSecurity'), icon: <Person /> },
    { id: 'system', label: t('settings.systemPreferences'), icon: <Settings /> },
    { id: 'integrations', label: t('settings.integrations'), icon: <IntegrationInstructions /> },
  ];

  // Get timezones - use fallback list
  const timezones: string[] = (() => {
    try {
      // @ts-ignore - Intl.supportedValuesOf may not be in TypeScript types yet
      if (typeof Intl.supportedValuesOf === 'function') {
        // @ts-ignore
        return Intl.supportedValuesOf('timeZone');
      }
    } catch (e) {
      // Fallback if not supported
    }
    return [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Phoenix', 'America/Anchorage', 'America/Honolulu', 'UTC',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
      'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland'
    ];
  })();

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Settings sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {t('settings.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.subtitle')}
              </Typography>
            </Box>
          </Box>
          
          {hasChanges && (
            <Chip
              label="Unsaved Changes"
              color="warning"
              size="small"
              icon={<ErrorIcon />}
            />
          )}
        </Box>

        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }} 
            onClose={() => setSuccess(null)}
            icon={<CheckCircle />}
          >
            {success}
          </Alert>
        )}

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Sidebar Navigation */}
          <Grid item xs={12} md={3}>
            <Card>
              <List>
                {sections.map((section) => (
                  <ListItem key={section.id} disablePadding>
                    <ListItemButton
                      selected={activeSection === section.id}
                      onClick={() => setActiveSection(section.id)}
                      sx={{
                        borderLeft: activeSection === section.id ? '3px solid' : 'none',
                        borderColor: 'primary.main',
                        bgcolor: activeSection === section.id ? 'action.selected' : 'transparent',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {section.icon}
                        <ListItemText primary={section.label} />
                      </Box>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>

          {/* Settings Content */}
          <Grid item xs={12} md={9}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                {/* Appearance Settings */}
                {activeSection === 'appearance' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {t('settings.appearance')} {t('settings.title')}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary={t('settings.theme')}
                          secondary={i18n.language === 'es' ? 'Elija entre tema claro y oscuro' : 'Choose between light and dark theme'}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {settings.theme === 'dark' ? 'Dark' : 'Light'}
                            </Typography>
                            <Switch
                              checked={settings.theme === 'dark'}
                              onChange={(e) => setSettings({ ...settings, theme: e.target.checked ? 'dark' : 'light' })}
                              color="primary"
                            />
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText 
                          primary={t('settings.language')} 
                          secondary={t('settings.languageDescription')}
                        />
                        <ListItemSecondaryAction>
                          <TextField
                            select
                            size="small"
                            value={settings.language}
                            onChange={async (e) => {
                              const newLanguage = e.target.value;
                              setSettings({ ...settings, language: newLanguage });
                              // Change i18n language immediately
                              await i18n.changeLanguage(newLanguage);
                              // Save to localStorage
                              localStorage.setItem('i18nextLng', newLanguage);
                            }}
                            sx={{ minWidth: 150 }}
                          >
                            <MenuItem value="en">English</MenuItem>
                            <MenuItem value="es">Español</MenuItem>
                          </TextField>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText 
                          primary={t('settings.dateFormat')} 
                          secondary={t('settings.dateFormatDescription')}
                        />
                        <ListItemSecondaryAction>
                          <TextField
                            select
                            size="small"
                            value={settings.dateFormat}
                            onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                            sx={{ minWidth: 150 }}
                          >
                            <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                            <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                            <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                            <MenuItem value="DD-MMM-YYYY">DD-MMM-YYYY</MenuItem>
                          </TextField>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText 
                          primary={t('settings.timeFormat')} 
                          secondary={t('settings.timeFormatDescription')}
                        />
                        <ListItemSecondaryAction>
                          <TextField
                            select
                            size="small"
                            value={settings.timeFormat}
                            onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value as '12h' | '24h' })}
                            sx={{ minWidth: 150 }}
                          >
                            <MenuItem value="12h">12 Hour (AM/PM)</MenuItem>
                            <MenuItem value="24h">24 Hour</MenuItem>
                          </TextField>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                      <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                        onClick={() => handleSaveSection('appearance')}
                        disabled={saving}
                      >
                        {t('settings.saveAppearanceSettings')}
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Notification Settings */}
                {activeSection === 'notifications' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Notification Preferences
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Notification Channels
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Email Notifications"
                          secondary="Receive notifications via email"
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Tooltip title="Send test email">
                              <IconButton
                                size="small"
                                onClick={() => handleTestNotification('email')}
                                disabled={!settings.emailNotifications}
                              >
                                <Send fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Switch
                              checked={settings.emailNotifications}
                              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                              color="primary"
                            />
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="SMS Notifications"
                          secondary="Receive text message alerts"
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Tooltip title="Send test SMS">
                              <IconButton
                                size="small"
                                onClick={() => handleTestNotification('sms')}
                                disabled={!settings.smsNotifications}
                              >
                                <Send fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Switch
                              checked={settings.smsNotifications}
                              onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                              color="primary"
                            />
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Push Notifications"
                          secondary="Receive browser/app notifications"
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Tooltip title="Send test notification">
                              <IconButton
                                size="small"
                                onClick={() => handleTestNotification('push')}
                                disabled={!settings.pushNotifications}
                              >
                                <Send fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Switch
                              checked={settings.pushNotifications}
                              onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                              color="primary"
                            />
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 2 }}>
                      Event Notifications
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Load Updates"
                          secondary="Get notified about load status changes"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.loadUpdates}
                            onChange={(e) => setSettings({ ...settings, loadUpdates: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Driver Updates"
                          secondary="Notifications about driver availability and status"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.driverUpdates}
                            onChange={(e) => setSettings({ ...settings, driverUpdates: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Maintenance Reminders"
                          secondary="Get reminders for vehicle maintenance schedules"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.maintenanceReminders}
                            onChange={(e) => setSettings({ ...settings, maintenanceReminders: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Invoice Reminders"
                          secondary="Payment and invoicing notifications"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.invoiceReminders}
                            onChange={(e) => setSettings({ ...settings, invoiceReminders: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                      <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                        onClick={() => handleSaveSection('notifications')}
                        disabled={saving}
                      >
                        {t('settings.saveNotificationSettings')}
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Company Settings */}
                {activeSection === 'company' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Company Profile
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField
                        label="Company Name"
                        value={settings.companyName}
                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                        fullWidth
                        required
                        helperText="Legal company name"
                      />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Company Email"
                            type="email"
                            value={settings.companyEmail}
                            onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                            fullWidth
                            required
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Company Phone"
                            value={settings.companyPhone}
                            onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                            fullWidth
                            required
                          />
                        </Grid>
                      </Grid>
                      
                      <TextField
                        label="Company Address"
                        multiline
                        rows={3}
                        value={settings.companyAddress}
                        onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                        fullWidth
                        required
                        helperText="Complete business address"
                      />
                      
                      <Divider />
                      
                      <Typography variant="subtitle2" color="text.secondary">
                        Registration & Tax Information
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Tax ID / EIN"
                            value={settings.taxId}
                            onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                            fullWidth
                            helperText="Federal Tax ID"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="DOT Number"
                            value={settings.dotNumber}
                            onChange={(e) => setSettings({ ...settings, dotNumber: e.target.value })}
                            fullWidth
                            helperText="US DOT Number"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="MC Number"
                            value={settings.mcNumber}
                            onChange={(e) => setSettings({ ...settings, mcNumber: e.target.value })}
                            fullWidth
                            helperText="Motor Carrier Number"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                      <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                        onClick={() => handleSaveSection('company')}
                        disabled={saving}
                      >
                        Save Company Profile
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* System Preferences */}
                {activeSection === 'system' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        System Preferences
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Load Management
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Auto Assignment"
                          secondary="Automatically assign loads to available drivers based on rules"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.autoAssignment}
                            onChange={(e) => setSettings({ ...settings, autoAssignment: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Load Approval Required"
                          secondary="Require manager approval before load assignment"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.requireLoadApproval}
                            onChange={(e) => setSettings({ ...settings, requireLoadApproval: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="GPS Tracking"
                          secondary="Enable real-time GPS tracking for vehicles"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.enableGPSTracking}
                            onChange={(e) => setSettings({ ...settings, enableGPSTracking: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 2 }}>
                      Regional Settings
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          label="Default Currency"
                          value={settings.defaultCurrency}
                          onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                          fullWidth
                        >
                          <MenuItem value="USD">USD - US Dollar</MenuItem>
                          <MenuItem value="EUR">EUR - Euro</MenuItem>
                          <MenuItem value="GBP">GBP - British Pound</MenuItem>
                          <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                          <MenuItem value="AUD">AUD - Australian Dollar</MenuItem>
                        </TextField>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          label="Measurement Unit"
                          value={settings.measurementUnit}
                          onChange={(e) => setSettings({ ...settings, measurementUnit: e.target.value as 'metric' | 'imperial' })}
                          fullWidth
                        >
                          <MenuItem value="imperial">Imperial (Miles, lbs)</MenuItem>
                          <MenuItem value="metric">Metric (Km, kg)</MenuItem>
                        </TextField>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          select
                          label="Timezone"
                          value={settings.timezone}
                          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Public />
                              </InputAdornment>
                            ),
                          }}
                        >
                          {timezones.slice(0, 50).map((tz: string) => (
                            <MenuItem key={tz} value={tz}>
                              {tz}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                      <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                        onClick={() => handleSaveSection('system')}
                        disabled={saving}
                      >
                        Save System Preferences
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Account & Security Settings */}
                {activeSection === 'account' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Account & Security
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Profile Information
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar 
                          src={
                            user?.profilePicture 
                              ? (user.profilePicture.startsWith('http') 
                                  ? user.profilePicture 
                                  : `http://localhost:5000${user.profilePicture}`)
                              : undefined
                          }
                          sx={{ 
                            width: 100, 
                            height: 100, 
                            fontSize: '2.5rem',
                            bgcolor: user?.profilePicture ? 'transparent' : 'grey.300',
                          }}
                        >
                          {!user?.profilePicture && user?.name?.charAt(0)}
                        </Avatar>
                        <IconButton
                          sx={{
                            position: 'absolute',
                            bottom: -5,
                            right: -5,
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                          component="label"
                          disabled={uploadingPicture}
                        >
                          {uploadingPicture ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <PhotoCamera fontSize="small" />
                          )}
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                          />
                        </IconButton>
                      </Box>
                      <Box>
                        <Typography variant="h6">{user?.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user?.email}
                        </Typography>
                        <Typography variant="caption" sx={{ textTransform: 'capitalize', display: 'block', mt: 0.5 }}>
                          Role: {user?.role}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Security Settings
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Password"
                          secondary="Last changed: 30 days ago"
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Lock />}
                            onClick={() => setPasswordDialog(true)}
                          >
                            Change Password
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Two-Factor Authentication"
                          secondary={
                            settings.twoFactorEnabled 
                              ? "Extra security for your account" 
                              : "Add an extra layer of security"
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {settings.twoFactorEnabled && (
                              <Chip label="Enabled" color="success" size="small" />
                            )}
                            <Switch
                              checked={settings.twoFactorEnabled}
                              onChange={(e) => setSettings({ ...settings, twoFactorEnabled: e.target.checked })}
                              color="primary"
                            />
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Session Timeout"
                          secondary="Auto-logout after inactivity"
                        />
                        <ListItemSecondaryAction>
                          {isSessionTimeoutCustom ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                              <TextField
                                type="number"
                                size="small"
                                value={sessionTimeoutCustom}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setSessionTimeoutCustom(value);
                                  if (value > 0) {
                                    setSettings({ ...settings, sessionTimeout: value });
                                  }
                                }}
                                inputProps={{ min: 1, step: 1 }}
                                sx={{ minWidth: 120 }}
                                placeholder="Minutes"
                              />
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => {
                                  setIsSessionTimeoutCustom(false);
                                  setSettings({ ...settings, sessionTimeout: 30 });
                                }}
                                sx={{ fontSize: '0.75rem', minHeight: 'auto', py: 0.5 }}
                              >
                                Use preset
                              </Button>
                            </Box>
                          ) : (
                            <TextField
                              select
                              size="small"
                              value={settings.sessionTimeout}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setIsSessionTimeoutCustom(true);
                                } else {
                                  setSettings({ ...settings, sessionTimeout: Number(e.target.value) });
                                }
                              }}
                              sx={{ minWidth: 120 }}
                            >
                              <MenuItem value={15}>15 minutes</MenuItem>
                              <MenuItem value={30}>30 minutes</MenuItem>
                              <MenuItem value="custom">Custom</MenuItem>
                            </TextField>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Password Expiry"
                          secondary="Force password change after"
                        />
                        <ListItemSecondaryAction>
                          {isPasswordExpiryCustom ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                              <TextField
                                type="number"
                                size="small"
                                value={passwordExpiryCustom}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setPasswordExpiryCustom(value);
                                  if (value > 0) {
                                    setSettings({ ...settings, passwordExpiry: value });
                                  }
                                }}
                                inputProps={{ min: 1, step: 1 }}
                                sx={{ minWidth: 120 }}
                                placeholder="Days"
                              />
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => {
                                  setIsPasswordExpiryCustom(false);
                                  setSettings({ ...settings, passwordExpiry: 30 });
                                }}
                                sx={{ fontSize: '0.75rem', minHeight: 'auto', py: 0.5 }}
                              >
                                Use preset
                              </Button>
                            </Box>
                          ) : (
                            <TextField
                              select
                              size="small"
                              value={settings.passwordExpiry}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setIsPasswordExpiryCustom(true);
                                } else {
                                  setSettings({ ...settings, passwordExpiry: Number(e.target.value) });
                                }
                              }}
                              sx={{ minWidth: 120 }}
                            >
                              <MenuItem value={30}>30 days</MenuItem>
                              <MenuItem value="custom">Custom</MenuItem>
                            </TextField>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                      <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                        onClick={() => handleSaveSection('security')}
                        disabled={saving}
                      >
                        {t('settings.saveSecuritySettings')}
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Integrations */}
                {activeSection === 'integrations' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Integrations
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Connect your TMS with third-party services and tools to streamline your operations.
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {[
                        {
                          name: 'ELD Integration',
                          description: 'Electronic Logging Device integration for compliance',
                          status: 'available',
                        },
                        {
                          name: 'GPS Tracking',
                          description: 'Real-time vehicle tracking and route optimization',
                          status: 'available',
                        },
                        {
                          name: 'Load Boards',
                          description: 'Connect to major load boards (DAT, Truckstop)',
                          status: 'coming_soon',
                        },
                        {
                          name: 'Accounting Software',
                          description: 'QuickBooks and Xero integration',
                          status: 'coming_soon',
                        },
                        {
                          name: 'Fuel Cards',
                          description: 'Integrate fuel card data and expenses',
                          status: 'coming_soon',
                        },
                        {
                          name: 'API Access',
                          description: 'Build custom integrations with our API',
                          status: 'available',
                        },
                      ].map((integration) => (
                        <Grid item xs={12} sm={6} key={integration.name}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {integration.name}
                                </Typography>
                                <Chip
                                  label={integration.status === 'available' ? 'Available' : 'Coming Soon'}
                                  size="small"
                                  color={integration.status === 'available' ? 'success' : 'default'}
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {integration.description}
                              </Typography>
                              <Button
                                variant="outlined"
                                size="small"
                                disabled={integration.status !== 'available'}
                                fullWidth
                              >
                                {integration.status === 'available' ? 'Configure' : 'Notify Me'}
                              </Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Password Change Dialog */}
        <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Current Password"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                error={!!passwordErrors.currentPassword}
                helperText={passwordErrors.currentPassword}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                error={!!passwordErrors.newPassword}
                helperText={passwordErrors.newPassword || "Must be 8+ characters with uppercase, lowercase, and number"}
                fullWidth
              />
              
              <TextField
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                error={!!passwordErrors.confirmPassword}
                helperText={passwordErrors.confirmPassword}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handlePasswordChange}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <Lock />}
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default SettingsPage;