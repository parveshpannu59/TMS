import React from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RouteIcon from '@mui/icons-material/Route';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import InsightsIcon from '@mui/icons-material/Insights';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const features = [
  { icon: <RouteIcon sx={{ fontSize: 20 }} />, label: 'Real-Time Tracking', desc: 'Live GPS fleet monitoring' },
  { icon: <SpeedIcon sx={{ fontSize: 20 }} />, label: 'Smart Dispatch', desc: 'AI-optimized load assignment' },
  { icon: <InsightsIcon sx={{ fontSize: 20 }} />, label: 'Analytics', desc: 'Actionable business insights' },
  { icon: <SecurityIcon sx={{ fontSize: 20 }} />, label: 'Secure & Reliable', desc: 'Enterprise-grade platform' },
];

export const AuthLayout: React.FC<AuthLayoutProps> = React.memo(({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isShort = useMediaQuery('(max-height:700px)');

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: '#f8fafc',
      }}
    >
      {/* ─── Left Panel ─── */}
      {!isMobile && (
        <Box
          sx={{
            width: '48%',
            height: '100vh',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { md: 4, lg: 6 },
            py: isShort ? 3 : 5,
            background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
          }}
        >
          {/* Decorative elements */}
          <Box sx={{
            position: 'absolute', top: -80, right: -80,
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          }} />
          <Box sx={{
            position: 'absolute', bottom: -60, left: -60,
            width: 250, height: 250, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          }} />
          {/* Subtle grid pattern */}
          <Box sx={{
            position: 'absolute', inset: 0, opacity: 0.03,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />

          <Box sx={{ position: 'relative', zIndex: 2 }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: isShort ? 3 : 4 }}>
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
                  flexShrink: 0,
                }}
              >
                <LocalShippingIcon sx={{ fontSize: 24, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: '1.3rem', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  Haulxp
                </Typography>
                <Typography sx={{ color: 'rgba(148,163,184,0.8)', fontSize: '0.6rem', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  TMS Platform
                </Typography>
              </Box>
            </Box>

            {/* Heading */}
            <Typography
              sx={{
                fontWeight: 800,
                color: '#fff',
                fontSize: isShort ? '1.8rem' : { md: '2.2rem', lg: '2.6rem' },
                lineHeight: 1.15,
                letterSpacing: '-1.5px',
                mb: isShort ? 1.5 : 2,
              }}
            >
              Move Freight
              <br />
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #60a5fa, #818cf8, #a78bfa)',
                backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Smarter & Faster
              </Box>
            </Typography>

            <Typography
              sx={{
                color: 'rgba(148,163,184,0.9)',
                fontSize: isShort ? '0.9rem' : '1rem',
                lineHeight: 1.6,
                maxWidth: 420,
                mb: isShort ? 3 : 4,
              }}
            >
              The all-in-one platform for managing your fleet, loads, drivers,
              and finances — from dispatch to delivery.
            </Typography>

            {/* Feature grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {features.map((f) => (
                <Box
                  key={f.label}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.2,
                    p: isShort ? 1.2 : 1.5, borderRadius: '12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
                    color: '#60a5fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    '& svg': { fontSize: 18 },
                  }}>
                    {f.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2, mb: 0.2 }}>
                      {f.label}
                    </Typography>
                    <Typography sx={{
                      color: 'rgba(148,163,184,0.7)', fontSize: '0.7rem', lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {f.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Stats bar */}
            <Box sx={{
              display: 'flex', gap: 4, mt: isShort ? 3 : 4, pt: isShort ? 2.5 : 3,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              {[
                { value: '10K+', label: 'Loads Managed' },
                { value: '99.9%', label: 'Uptime' },
                { value: '500+', label: 'Active Fleets' },
              ].map((s) => (
                <Box key={s.label}>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: isShort ? '1.1rem' : '1.2rem', lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.7rem', mt: 0.5 }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* ─── Right Panel (Form) ─── */}
      <Box
        sx={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 4, md: 5 },
          position: 'relative',
          overflow: 'hidden',
          background: isMobile
            ? 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)'
            : '#f8fafc',
        }}
      >
        {/* Mobile logo */}
        {isMobile && (
          <Box sx={{
            position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 1.2,
          }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            }}>
              <LocalShippingIcon sx={{ fontSize: 20, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: '1.15rem', letterSpacing: '-0.5px' }}>
              Haulxp
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            background: '#fff',
            borderRadius: '20px',
            boxShadow: isMobile
              ? '0 20px 60px rgba(0,0,0,0.3)'
              : '0 1px 3px rgba(0,0,0,0.04), 0 8px 30px rgba(0,0,0,0.06)',
            border: isMobile ? 'none' : '1px solid rgba(0,0,0,0.04)',
            p: { xs: 3, sm: 4 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {children}
        </Box>

        {/* Footer */}
        {!isMobile && (
          <Typography
            sx={{
              position: 'absolute',
              bottom: 20,
              color: 'rgba(100,116,139,0.5)',
              fontSize: '0.7rem',
            }}
          >
            &copy; {new Date().getFullYear()} Haulxp TMS. All rights reserved.
          </Typography>
        )}
      </Box>
    </Box>
  );
});

AuthLayout.displayName = 'AuthLayout';
