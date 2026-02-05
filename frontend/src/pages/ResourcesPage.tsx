import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Divider,
  MenuItem,
} from '@mui/material';
import {
  Assessment,
  Add,
  Description,
  VideoLibrary,
  Policy,
  Help,
  Download,
  Delete,
  Edit,
  Folder,
  Article,
  PictureAsPdf,
  InsertDriveFile,
  School,
  Gavel,
  Assignment,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useTranslation } from 'react-i18next';

interface Resource {
  id: string;
  title: string;
  description: string;
  category: 'document' | 'policy' | 'training' | 'form' | 'guide';
  fileType: 'pdf' | 'doc' | 'video' | 'link';
  size?: string;
  uploadedBy: string;
  uploadedDate: Date;
  downloads: number;
}

const ResourcesPage: React.FC = () => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([
    {
      id: '1',
      title: 'Driver Safety Manual',
      description: 'Comprehensive guide for safe driving practices',
      category: 'document',
      fileType: 'pdf',
      size: '2.4 MB',
      uploadedBy: 'Admin',
      uploadedDate: new Date('2026-01-15'),
      downloads: 45,
    },
    {
      id: '2',
      title: 'Company Safety Policy',
      description: 'Official safety policy and procedures',
      category: 'policy',
      fileType: 'pdf',
      size: '1.1 MB',
      uploadedBy: 'HR Department',
      uploadedDate: new Date('2026-01-10'),
      downloads: 78,
    },
    {
      id: '3',
      title: 'New Driver Onboarding Video',
      description: 'Training video for new drivers',
      category: 'training',
      fileType: 'video',
      size: '125 MB',
      uploadedBy: 'Training Dept',
      uploadedDate: new Date('2026-01-20'),
      downloads: 23,
    },
    {
      id: '4',
      title: 'Trip Expense Report Form',
      description: 'Template for reporting trip expenses',
      category: 'form',
      fileType: 'doc',
      size: '45 KB',
      uploadedBy: 'Accounting',
      uploadedDate: new Date('2026-01-25'),
      downloads: 156,
    },
    {
      id: '5',
      title: 'Vehicle Inspection Checklist',
      description: 'Pre-trip inspection checklist',
      category: 'form',
      fileType: 'pdf',
      size: '350 KB',
      uploadedBy: 'Safety Team',
      uploadedDate: new Date('2026-01-18'),
      downloads: 89,
    },
    {
      id: '6',
      title: 'DOT Regulations Quick Guide',
      description: 'Quick reference for DOT hours of service',
      category: 'guide',
      fileType: 'pdf',
      size: '890 KB',
      uploadedBy: 'Compliance',
      uploadedDate: new Date('2026-01-12'),
      downloads: 67,
    },
    {
      id: '7',
      title: 'Anti-Harassment Policy',
      description: 'Workplace harassment prevention policy',
      category: 'policy',
      fileType: 'pdf',
      size: '600 KB',
      uploadedBy: 'HR Department',
      uploadedDate: new Date('2026-01-08'),
      downloads: 92,
    },
    {
      id: '8',
      title: 'Load Securement Training',
      description: 'How to properly secure different types of cargo',
      category: 'training',
      fileType: 'video',
      size: '98 MB',
      uploadedBy: 'Training Dept',
      uploadedDate: new Date('2026-01-22'),
      downloads: 34,
    },
  ]);

  const categoryIcons = {
    document: <Article />,
    policy: <Gavel />,
    training: <School />,
    form: <Assignment />,
    guide: <Help />,
  };

  const fileTypeIcons = {
    pdf: <PictureAsPdf />,
    doc: <Description />,
    video: <VideoLibrary />,
    link: <InsertDriveFile />,
  };

  const categories = [
    { value: 'all', label: 'All Resources', icon: <Folder /> },
    { value: 'document', label: 'Documents', icon: <Article /> },
    { value: 'policy', label: 'Policies', icon: <Gavel /> },
    { value: 'training', label: 'Training', icon: <School /> },
    { value: 'form', label: 'Forms', icon: <Assignment /> },
    { value: 'guide', label: 'Guides', icon: <Help /> },
  ];

  const filteredResources = resources.filter(resource => {
    if (tabValue === 0) return true;
    return resource.category === categories[tabValue].value;
  });

  const stats = {
    total: resources.length,
    documents: resources.filter(r => r.category === 'document').length,
    policies: resources.filter(r => r.category === 'policy').length,
    training: resources.filter(r => r.category === 'training').length,
    forms: resources.filter(r => r.category === 'form').length,
  };

  const handleDownload = (resource: Resource) => {
    setSuccess(`Downloading: ${resource.title}`);
    setTimeout(() => setSuccess(null), 3000);
    // In real implementation, trigger actual download
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      setResources(prev => prev.filter(r => r.id !== id));
      setSuccess('Resource deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Resources & Documents
            </Typography>
            <Typography color="text.secondary">
              Access company documents, policies, training materials, and forms
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
            Upload Resource
          </Button>
        </Box>

        {/* Success Alert */}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Folder sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Resources
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Article sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Documents
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.documents}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Gavel sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Policies
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.policies}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <School sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Training
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.training}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Assignment sx={{ mr: 1, color: 'secondary.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Forms
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.forms}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card>
          <Tabs
            value={tabValue}
            onChange={(_, val) => setTabValue(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {categories.map((cat, idx) => (
              <Tab
                key={idx}
                icon={cat.icon}
                iconPosition="start"
                label={cat.label}
              />
            ))}
          </Tabs>

          {/* Resources List */}
          <List sx={{ p: 2 }}>
            {filteredResources.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <MenuIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No resources in this category
                </Typography>
              </Box>
            ) : (
              filteredResources.map((resource) => (
                <React.Fragment key={resource.id}>
                  <ListItem
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    secondaryAction={
                      <Box>
                        <IconButton onClick={() => handleDownload(resource)}>
                          <Download />
                        </IconButton>
                        <IconButton>
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(resource.id)}>
                          <Delete />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      {fileTypeIcons[resource.fileType]}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {resource.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={resource.category}
                            icon={categoryIcons[resource.category]}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {resource.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {resource.size} • {resource.downloads} downloads
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Uploaded by {resource.uploadedBy} on{' '}
                              {resource.uploadedDate.toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </List>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Upload New Resource</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField label="Title" fullWidth required />
              <TextField label="Description" fullWidth multiline rows={2} />
              <TextField
                label="Category"
                select
                fullWidth
                required
                defaultValue=""
              >
                <MenuItem value="document">Document</MenuItem>
                <MenuItem value="policy">Policy</MenuItem>
                <MenuItem value="training">Training Material</MenuItem>
                <MenuItem value="form">Form/Template</MenuItem>
                <MenuItem value="guide">Guide</MenuItem>
              </TextField>
              <Button variant="outlined" component="label" fullWidth>
                Choose File
                <input type="file" hidden />
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                setSuccess('Resource uploaded successfully!');
                setOpenDialog(false);
                setTimeout(() => setSuccess(null), 3000);
              }}
            >
              Upload
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default ResourcesPage;
