import React, { useMemo } from 'react';
import { Box, Container, Grid, Typography, useTheme, useMediaQuery } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Optimized: Static gradient without animation to reduce GPU usage
const staticGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';

export const AuthLayout: React.FC<AuthLayoutProps> = React.memo(({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Memoize branding content to prevent re-renders
  const brandingContent = useMemo(
    () => (
      <>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 4,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            }}
          >
            <LocalShippingIcon sx={{ fontSize: 36, color: 'white' }} />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.5px',
            }}
          >
            TMS
          </Typography>
        </Box>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            color: 'white',
            mb: 2,
            fontSize: { md: '2.5rem', lg: '3rem' },
            lineHeight: 1.2,
            letterSpacing: '-1px',
          }}
        >
          Transportation
          <br />
          Management System
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            lineHeight: 1.6,
            maxWidth: '90%',
            mb: 4,
          }}
        >
          Streamline your logistics operations with our enterprise-grade
          transportation management platform.
        </Typography>
      </>
    ),
    []
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: staticGradient,
        // Respect user's motion preferences
        '@media (prefers-reduced-motion: reduce)': {
          background: staticGradient,
        },
      }}
    >
      {/* Optimized: Removed heavy blur filters and animations to reduce GPU usage */}

      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          py: { xs: 4, md: 6 },
          px: { xs: 2, sm: 3, md: 4 },
          position: 'relative',
          zIndex: 1,
      }}
    >
        <Grid container spacing={0} sx={{ height: '100%' }}>
          {/* Left side - Branding (hidden on mobile) */}
          {!isMobile && (
            <Grid
              item
              xs={0}
              md={5}
          sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                px: { md: 4, lg: 6 },
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '24px 0 0 24px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRight: 'none',
                }}
              />
              <Box sx={{ position: 'relative', zIndex: 2, width: '100%' }}>
                {brandingContent}
              </Box>
            </Grid>
          )}

          {/* Right side - Form */}
          <Grid
            item
            xs={12}
            md={7}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 0, sm: 2, md: 4 },
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: '500px', md: '100%' },
                background: 'rgba(255, 255, 255, 0.98)',
                borderRadius: { xs: '24px', md: isMobile ? '24px' : '0 24px 24px 0' },
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                p: { xs: 4, sm: 5, md: 6 },
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                },
              }}
            >
              {/* Mobile logo */}
              {isMobile && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 4,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 72,
                      height: 72,
                      borderRadius: '18px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                    }}
                  >
                    <LocalShippingIcon sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                </Box>
              )}
              {children}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
});

AuthLayout.displayName = 'AuthLayout';