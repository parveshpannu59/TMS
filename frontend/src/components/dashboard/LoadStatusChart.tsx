import { memo } from 'react';
import { Box, Typography, Card, CardContent, LinearProgress } from '@mui/material';
import { LoadStatus } from '../../types/dashboard.types';

interface LoadStatusChartProps {
  data: LoadStatus;
}

export const LoadStatusChart = memo(({ data }: LoadStatusChartProps) => {
  const total = data.pending + data.inTransit + data.delayed;
  
  const getPercentage = (value: number) => 
    total > 0 ? (value / total) * 100 : 0;

  const statusItems = [
    { 
      label: 'Pending Loads', 
      value: data.pending, 
      color: 'warning.main',
      bgcolor: 'warning.light' 
    },
    { 
      label: 'In Transit', 
      value: data.inTransit, 
      color: 'info.main',
      bgcolor: 'info.light' 
    },
    { 
      label: 'Delayed', 
      value: data.delayed, 
      color: 'error.main',
      bgcolor: 'error.light' 
    },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Load Status
        </Typography>
        
        <Box mt={3} display="flex" flexDirection="column" gap={3}>
          {statusItems.map((item) => (
            <Box key={item.label}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" fontWeight={500}>
                  {item.label}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {item.value}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getPercentage(item.value)} 
                sx={{ 
                  height: 8, 
                  borderRadius: 1,
                  bgcolor: item.bgcolor,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: item.color,
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
});

LoadStatusChart.displayName = 'LoadStatusChart';