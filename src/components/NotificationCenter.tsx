import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Chip,
  Button,
  Divider,
  Menu,
  Badge,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  ClearAll as ClearAllIcon,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { MCPNotification, NotificationStatus } from '../types';

interface NotificationCenterProps {
  onQuestionClick?: (questionId: string, agentName?: string, conversationId?: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onQuestionClick }) => {
  const {
    notifications,
    unreadCount,
    markAsDisplayed,
    markAsAnswered,
    removeNotification,
    clearAllNotifications,
  } = useNotifications();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Mark all pending notifications as displayed when menu opens
    notifications
      .filter(notification => notification.status === 'pending')
      .forEach(notification => markAsDisplayed(notification.id));
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleQuestionClick = (notification: MCPNotification) => {
    if (onQuestionClick) {
      onQuestionClick(notification.questionId, notification.agentName, notification.conversationId);
    }
    handleMenuClose();
  };

  const handleMarkAsAnswered = (questionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsAnswered(questionId);
  };

  const handleRemoveNotification = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeNotification(notificationId);
  };

  const getStatusIcon = (status: NotificationStatus) => {
    switch (status) {
      case 'pending':
        return <ScheduleIcon color="warning" fontSize="small" />;
      case 'displayed':
        return <VisibilityIcon color="info" fontSize="small" />;
      case 'answered':
        return <CheckCircleIcon color="success" fontSize="small" />;
    }
  };

  const getStatusLabel = (status: NotificationStatus) => {
    switch (status) {
      case 'pending':
        return 'New';
      case 'displayed':
        return 'Seen';
      case 'answered':
        return 'Answered';
    }
  };

  const getStatusColor = (status: NotificationStatus) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'displayed':
        return 'info';
      case 'answered':
        return 'success';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Tooltip title="MCP Notifications">
        <IconButton
          color="inherit"
          onClick={handleMenuOpen}
          sx={{ 
            mr: 2,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'auto',
          },
        }}
        transformOrigin={{
          horizontal: 'right',
          vertical: 'top',
        }}
        anchorOrigin={{
          horizontal: 'right',
          vertical: 'bottom',
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="div">
              MCP Questions
            </Typography>
            {notifications.length > 0 && (
              <Tooltip title="Clear all notifications">
                <IconButton size="small" onClick={clearAllNotifications}>
                  <ClearAllIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="info" sx={{ border: 'none', background: 'transparent' }}>
              <Typography variant="body2">
                No MCP questions yet. Agents will send questions here when they need your input.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 350, overflow: 'auto' }}>
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleQuestionClick(notification)}
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      py: 2,
                      px: 2,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(notification.status)}
                        <Chip
                          size="small"
                          label={getStatusLabel(notification.status)}
                          color={getStatusColor(notification.status) as any}
                          variant="outlined"
                        />
                        {notification.agentName && (
                          <Chip
                            size="small"
                            label={notification.agentName}
                            variant="outlined"
                            color="primary"
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {notification.status !== 'answered' && (
                          <Tooltip title="Mark as answered">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMarkAsAnswered(notification.questionId, e)}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Remove notification">
                          <IconButton
                            size="small"
                            onClick={(e) => handleRemoveNotification(notification.id, e)}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.status === 'pending' ? 600 : 400,
                            color: notification.status === 'answered' ? 'text.secondary' : 'text.primary',
                          }}
                        >
                          {notification.question}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </div>
            ))}
          </List>
        )}

        {notifications.length > 0 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                // Could navigate to a full notifications page
                handleMenuClose();
              }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationCenter;