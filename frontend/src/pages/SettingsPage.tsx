import React, { useState } from 'react';
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
  ListItemText,
  ListItemSecondaryAction,
  Grid,
  Avatar,
  IconButton,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Settings,
  Palette,
  Notifications,
  Security,
  Business,
  Person,
  Language,
  IntegrationInstructions,
  Save,
  Edit,
} from '@mui/icons-material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

const SettingsPage: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  const { user } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('appearance');

  const [settings, setSettings] = useState({
    // Appearance
    theme: mode,
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    loadUpdates: true,
    driverUpdates: true,
    maintenanceReminders: true,
    
    // Company
    companyName: 'Test Company',
    companyEmail: user?.email || '',
    companyPhone: '',
    companyAddress: '',
    
    // System
    autoAssignment: false,
    requireLoadApproval: true,
    enableGPSTracking: false,
    defaultCurrency: 'USD',
  });

  const handleSave = () => {
    // Save settings logic here
    setSuccess('Settings saved successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: <Palette /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications /> },
    { id: 'company', label: 'Company Profile', icon: <Business /> },
    { id: 'account', label: 'Account', icon: <Person /> },
    { id: 'system', label: 'System Preferences', icon: <Settings /> },
    { id: 'integrations', label: 'Integrations', icon: <IntegrationInstructions /> },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Settings sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your TMS preferences and configurations
            </Typography>
          </Box>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Sidebar Navigation */}
          <Grid item xs={12} md={3}>
            <Card>
              <List>
                {sections.map((section) => (
                  <ListItem
                    key={section.id}
                    button
                    selected={activeSection === section.id}
                    onClick={() => setActiveSection(section.id)}
                    sx={{
                      borderLeft: activeSection === section.id ? '3px solid' : 'none',
                      borderColor: 'primary.main',
                      bgcolor: activeSection === section.id ? 'action.selected' : 'transparent',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {section.icon}
                      <ListItemText primary={section.label} />
                    </Box>
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
                    <Typography variant="h6" gutterBottom>
                      Appearance Settings
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Theme"
                          secondary="Choose between light and dark theme"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={mode === 'dark'}
                            onChange={toggleTheme}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText primary="Language" />
                        <ListItemSecondaryAction>
                          <TextField
                            select
                            size="small"
                            value={settings.language}
                            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                            sx={{ minWidth: 150 }}
                          >
                            <MenuItem value="en">English</MenuItem>
                            <MenuItem value="es">Spanish</MenuItem>
                            <MenuItem value="fr">French</MenuItem>
                          </TextField>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText primary="Date Format" />
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
                          </TextField>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </Box>
                )}

                {/* Notification Settings */}
                {activeSection === 'notifications' && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Notification Preferences
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Email Notifications"
                          secondary="Receive notifications via email"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.emailNotifications}
                            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Load Updates"
                          secondary="Get notified about load status changes"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.loadUpdates}
                            onChange={(e) => setSettings({ ...settings, loadUpdates: e.target.checked })}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Driver Updates"
                          secondary="Notifications about driver availability"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.driverUpdates}
                            onChange={(e) => setSettings({ ...settings, driverUpdates: e.target.checked })}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Maintenance Reminders"
                          secondary="Get reminders for vehicle maintenance"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.maintenanceReminders}
                            onChange={(e) => setSettings({ ...settings, maintenanceReminders: e.target.checked })}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </Box>
                )}

                {/* Company Settings */}
                {activeSection === 'company' && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Company Profile
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField
                        label="Company Name"
                        value={settings.companyName}
                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                        fullWidth
                      />
                      <TextField
                        label="Company Email"
                        type="email"
                        value={settings.companyEmail}
                        onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                        fullWidth
                      />
                      <TextField
                        label="Company Phone"
                        value={settings.companyPhone}
                        onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                        fullWidth
                      />
                      <TextField
                        label="Company Address"
                        multiline
                        rows={3}
                        value={settings.companyAddress}
                        onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                        fullWidth
                      />
                    </Box>
                  </Box>
                )}

                {/* System Preferences */}
                {activeSection === 'system' && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      System Preferences
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Auto Assignment"
                          secondary="Automatically assign loads to available drivers"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.autoAssignment}
                            onChange={(e) => setSettings({ ...settings, autoAssignment: e.target.checked })}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Load Approval Required"
                          secondary="Require approval before load assignment"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={settings.requireLoadApproval}
                            onChange={(e) => setSettings({ ...settings, requireLoadApproval: e.target.checked })}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText primary="Default Currency" />
                        <ListItemSecondaryAction>
                          <TextField
                            select
                            size="small"
                            value={settings.defaultCurrency}
                            onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                            sx={{ minWidth: 100 }}
                          >
                            <MenuItem value="USD">USD</MenuItem>
                            <MenuItem value="EUR">EUR</MenuItem>
                            <MenuItem value="GBP">GBP</MenuItem>
                            <MenuItem value="CAD">CAD</MenuItem>
                          </TextField>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </Box>
                )}

                {/* Account Settings */}
                {activeSection === 'account' && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Account Settings
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                      <Avatar sx={{ width: 80, height: 80, fontSize: '2rem' }}>
                        {user?.name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{user?.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user?.email}
                        </Typography>
                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                          Role: {user?.role}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Button variant="outlined" startIcon={<Edit />}>
                      Edit Profile
                    </Button>
                  </Box>
                )}

                {/* Integrations */}
                {activeSection === 'integrations' && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Integrations
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" color="text.secondary">
                      Connect your TMS with third-party services and tools.
                    </Typography>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Coming soon: ELD integration, GPS tracking, Load boards, and more...
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Save Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    size="large"
                  >
                    Save Changes
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default SettingsPage;
