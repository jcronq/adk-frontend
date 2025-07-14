import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Badge,
  Chip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  QuestionAnswer as QuestionAnswerIcon,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  currentView?: string;
  onViewChange?: (view: string) => void;
  width?: number;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: boolean;
  description?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  currentView = 'chat',
  onViewChange,
  width = 280,
}) => {
  const { unreadCount } = useNotifications();

  const sidebarItems: SidebarItem[] = [
    {
      id: 'chat',
      label: 'Agent Chat',
      icon: <ChatIcon />,
      description: 'Interact with AI agents',
    },
    {
      id: 'notifications',
      label: 'MCP Questions',
      icon: <QuestionAnswerIcon />,
      badge: true,
      description: 'View and manage MCP questions',
    },
    {
      id: 'agents',
      label: 'Agent Management',
      icon: <PersonIcon />,
      description: 'Configure and manage agents',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon />,
      description: 'View conversation analytics',
    },
  ];

  const handleItemClick = (itemId: string) => {
    if (onViewChange) {
      onViewChange(itemId);
    }
    onClose();
  };

  const drawerContent = (
    <Box sx={{ width, overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div" gutterBottom>
          ADK Frontend
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Agent Development Kit
        </Typography>
      </Box>

      {/* Navigation Items */}
      <List>
        {sidebarItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={currentView === item.id}
              onClick={() => handleItemClick(item.id)}
              sx={{
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.badge && item.id === 'notifications' ? (
                  <Badge 
                    badgeContent={unreadCount} 
                    color="error" 
                    max={99}
                    sx={{
                      '& .MuiBadge-badge': {
                        right: -8,
                        top: -8,
                      },
                    }}
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={
                  currentView !== item.id ? (
                    <Typography variant="caption" color="text.secondary">
                      {item.description}
                    </Typography>
                  ) : null
                }
              />
              {item.badge && item.id === 'notifications' && unreadCount > 0 && (
                <Chip
                  size="small"
                  label={unreadCount}
                  color="error"
                  sx={{ 
                    height: 20, 
                    fontSize: '0.75rem',
                    visibility: currentView === item.id ? 'hidden' : 'visible',
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Settings Section */}
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick('settings')}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              secondary={
                <Typography variant="caption" color="text.secondary">
                  App configuration
                </Typography>
              }
            />
          </ListItemButton>
        </ListItem>
      </List>

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" display="block">
          MCP Integration Active
        </Typography>
        {unreadCount > 0 && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon fontSize="small" color="warning" />
            <Typography variant="caption" color="warning.main">
              {unreadCount} pending question{unreadCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="temporary"
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        display: { xs: 'block' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;