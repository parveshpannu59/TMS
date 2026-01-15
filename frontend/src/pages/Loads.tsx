import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { DashboardLayout } from '@layouts/DashboardLayout';

const Loads: React.FC = React.memo(() => {
  return (
    <DashboardLayout>
      <Box sx={{ p: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Loads
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Loads module is coming soon.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
});

Loads.displayName = 'Loads';

export default Loads;
