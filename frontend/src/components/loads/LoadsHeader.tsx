import { memo } from 'react';
import { Box, Button, Typography, Tooltip } from '@mui/material';
import { Add, LocalShipping, FileDownload } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { getApiOrigin } from '@/api/client';

type LoadsHeaderProps = {
  onAddLoad: () => void;
};

export const LoadsHeader = memo<LoadsHeaderProps>(function LoadsHeader({ onAddLoad }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleExportCSV = () => {
    const token = localStorage.getItem('token');
    const url = `${getApiOrigin()}/api/loads/export/csv`;
    const a = document.createElement('a');
    // Use fetch to include auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        a.href = URL.createObjectURL(blob);
        a.download = `loads-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert('Export failed'));
  };

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 3,
        py: 2,
        mb: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
            <LocalShipping sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {t('loads.title')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ ml: { xs: 0, sm: '44px' } }}>
            {t('loads.subtitle', { defaultValue: 'Manage your freight operations and track deliveries' })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          <Tooltip title="Export as CSV">
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExportCSV}
              sx={{
                height: 44,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Export
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onAddLoad}
            sx={{
              flex: { xs: 1, sm: 'initial' },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              minWidth: { sm: 160 },
              height: 44,
              boxShadow: theme.shadows[3],
              '&:hover': {
                boxShadow: theme.shadows[6],
                background: 'linear-gradient(135deg, #5568d3 0%, #6a4196 100%)',
              },
            }}
          >
            {t('loads.addLoad')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
});
