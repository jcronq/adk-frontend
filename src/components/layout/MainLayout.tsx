import React, { useState, ReactNode } from 'react';
import {
  Box,
  useTheme,
  useMediaQuery,
  Drawer,
  Backdrop
} from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  /** Content to render in the main area */
  children: ReactNode;
  /** Number of unread notifications for header badge */
  notificationCount?: number;
  /** Callback for notification badge click */
  onNotificationClick?: () => void;
  /** Callback when a notification question is clicked */
  onQuestionClick?: (questionId: string, agentName?: string, conversationId?: string) => void;
}

/**
 * Main layout component for ChatGPT-style interface
 * 
 * Features:
 * - Responsive sidebar that adapts to screen size
 * - Desktop: Persistent drawer that can collapse
 * - Mobile/Tablet: Temporary drawer that overlays content
 * - Header with notification integration
 * - Flexible content area
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  notificationCount = 0,
  onNotificationClick,
  onQuestionClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  
  // State for sidebar management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Responsive sidebar width
  const getSidebarWidth = () => {
    if (sidebarCollapsed) return 60;
    if (isMobile) return 280;
    if (isTablet) return 280;
    return 320;
  };

  const sidebarWidth = getSidebarWidth();

  // Handlers
  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleMobileDrawerClose = () => {
    setMobileDrawerOpen(false);
  };

  // Common sidebar content
  const sidebarContent = (
    <Sidebar 
      collapsed={sidebarCollapsed && !isMobile}
      width={sidebarWidth}
      onToggleCollapse={handleSidebarToggle}
      isMobile={isMobile}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <Header
        notificationCount={notificationCount}
        onNotificationClick={onNotificationClick}
        onSidebarToggle={handleSidebarToggle}
        sidebarCollapsed={sidebarCollapsed}
        onQuestionClick={onQuestionClick}
      />

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar - Permanent Drawer */}
        {!isMobile && (
          <Drawer
            variant="permanent"
            open={!sidebarCollapsed}
            sx={{
              width: sidebarWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: sidebarWidth,
                boxSizing: 'border-box',
                position: 'relative',
                height: '100%',
                borderRight: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        )}

        {/* Mobile Sidebar - Temporary Drawer */}
        {isMobile && (
          <>
            <Drawer
              variant="temporary"
              open={mobileDrawerOpen}
              onClose={handleMobileDrawerClose}
              ModalProps={{
                keepMounted: true, // Better mobile performance
              }}
              sx={{
                '& .MuiDrawer-paper': {
                  width: sidebarWidth,
                  boxSizing: 'border-box',
                  backgroundColor: theme.palette.background.default,
                },
              }}
            >
              {sidebarContent}
            </Drawer>
            
            {/* Backdrop for mobile drawer */}
            <Backdrop
              open={mobileDrawerOpen}
              onClick={handleMobileDrawerClose}
              sx={{
                zIndex: theme.zIndex.drawer - 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              }}
            />
          </>
        )}

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: theme.palette.background.paper,
            position: 'relative',
            minWidth: 0, // Prevent flex item from overflowing
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;