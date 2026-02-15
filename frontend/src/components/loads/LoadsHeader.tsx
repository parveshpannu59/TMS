import { memo } from 'react';
import { Box, Button, Typography, Tooltip } from '@mui/material';
import { Add, LocalShipping, FileDownload } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { getApiOrigin } from '@/api/client';

type LoadsHeaderProps = {
  onAddLoad: () => void;
};

export const LoadsHeader = memo<LoadsHeaderProps>(function LoadsHeader({ onAddLoad }) {
  const { t } = useTranslation();

  const handleExportCSV = () => {
    const token = localStorage.getItem('token');
    const url = `${getApiOrigin()}/api/loads/export/csv`;
    const a = document.createElement('a');
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
    <Box sx={{ px: 3, py: 2.5, mb: 0 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2.5,
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
          }}>
            <LocalShipping sx={{ fontSize: 24, color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.375rem' }, lineHeight: 1.2 }}>
              {t('loads.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {t('loads.subtitle', { defaultValue: 'Manage your freight operations and track deliveries' })}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          <Tooltip title="Export as CSV">
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExportCSV}
              size="medium"
            >
              Export
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onAddLoad}
            sx={{ flex: { xs: 1, sm: 'initial' } }}
          >
            {t('loads.addLoad')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
});
