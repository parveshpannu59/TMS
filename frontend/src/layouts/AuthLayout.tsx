import React from 'react';
import { Box, Container, Paper, Grid } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = React.memo(({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
          }}
        >
          <Grid container direction="column" alignItems="center" spacing={3}>
            <Grid item>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              >
                <LocalShippingIcon sx={{ fontSize: 48 }} />
              </Box>
            </Grid>
            <Grid item sx={{ width: '100%' }}>
              {children}
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
});

AuthLayout.displayName = 'AuthLayout';