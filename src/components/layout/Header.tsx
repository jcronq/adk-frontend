import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import UserIdSettings from '../UserIdSettings';

interface HeaderProps {
  /** Number of unread notifications */
  notificationCount?: number;
  /** Callback for notification badge click */
  onNotificationClick?: () => void;
  /** Callback for sidebar toggle (mobile) */
  onSidebarToggle?: () => void;
  /** Whether sidebar is collapsed */
  sidebarCollapsed?: boolean;
  /** Callback when a notification question is clicked */
  onQuestionClick?: (questionId: string, agentName?: string, conversationId?: string) => void;
}

/**
 * Header component for ChatGPT-style interface
 * Features:
 * - App title with responsive layout
 * - Notification badge with count
 * - User settings integration
 * - Mobile-responsive sidebar toggle
 */
const Header: React.FC<HeaderProps> = ({
  notificationCount = 0,
  onNotificationClick,
  onSidebarToggle,
  sidebarCollapsed = false,
  onQuestionClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.primary.main,
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important' }}>
        {/* Mobile sidebar toggle */}
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="toggle sidebar"
            onClick={onSidebarToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* App Title */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 600,
            letterSpacing: '-0.025em'
          }}
        >
          ADK Agent Manager
        </Typography>

        {/* Header Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notification Badge */}
          <IconButton
            color="inherit"
            aria-label="notifications"
            onClick={onNotificationClick}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <Badge 
              badgeContent={notificationCount > 0 ? notificationCount : undefined}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9px',
                }
              }}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Settings - Hidden on mobile to save space */}
          {!isMobile && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: 'rgba(255, 255, 255, 0.9)',
              '& .MuiTypography-root': {
                color: 'inherit',
                fontSize: '0.875rem',
              },
              '& .MuiIconButton-root': {
                color: 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }
            }}>
              <UserIdSettings />
            </Box>
          )}

          {/* Settings Icon for mobile */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="settings"
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <SettingsIcon />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;