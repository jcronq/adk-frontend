import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  onQuestionClick?: (questionId: string, agentName?: string, conversationId?: string) => void;
  showMenuButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title = 'ADK Agent Manager',
  onMenuClick,
  onSettingsClick,
  onQuestionClick,
  showMenuButton = false,
}) => {
  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {showMenuButton && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 500,
          }}
        >
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* MCP Notification Center */}
          <NotificationCenter onQuestionClick={onQuestionClick} />

          {/* Settings Button */}
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              onClick={onSettingsClick}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;